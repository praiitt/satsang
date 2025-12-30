import os
import subprocess

def main():
    print("Preparing to deploy Frontend to Cloud Run...")

    env_local_path = '.env.local'
    env_prod_path = '.env.production'

    public_vars = {}
    
    # 1. Read .env.local
    if os.path.exists(env_local_path):
        with open(env_local_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    # Handle multi-line values if any (simple split for now)
                    if '=' in line:
                        key, val = line.split('=', 1)
                        key = key.strip()
                        val = val.strip().strip("'").strip('"')
                        
                        if key.startswith('NEXT_PUBLIC_'):
                            public_vars[key] = val
                        elif key in ['AUTH_SERVER_URL', 'AUTH_SERVICE_URL', 'MARKETING_SERVER_URL', 'LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET']:
                             public_vars[key] = val

    # Hardcode/Fallback for Backend if missing
    if 'BACKEND_SERVICE_URL' not in public_vars:
        public_vars['BACKEND_SERVICE_URL'] = 'https://rraasi.com'

    # 2. Write .env.production
    print(f"Creating {env_prod_path} with {len(public_vars)} public/url variables...")
    with open(env_prod_path, 'w') as f:
        for k, v in public_vars.items():
            f.write(f'{k}="{v}"\n')

    # 3. Build Container via Cloud Build using generated cloudbuild.yaml
    
    project_id = public_vars.get('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'rraasi-8a619')
    image_tag = f"gcr.io/{project_id}/satsang-frontend"
    cloudbuild_yaml = "cloudbuild.frontend.yaml"

    print(f"Generating {cloudbuild_yaml}...")
    
    # Construct build args list for yaml
    docker_build_args = []
    substitutions = [f"_IMAGE_TAG={image_tag}"]
    
    # We will pass the values via substitutions to avoid hardcoding secrets in the file
    # although these are mostly public keys.
    
    cloud_run_url = "https://satsang-frontend-469389287554.asia-south1.run.app"
    public_vars['NEXT_PUBLIC_ASSET_PREFIX'] = cloud_run_url

    yaml_content = f"""
steps:
- name: 'gcr.io/cloud-builders/docker'
  args:
  - 'build'
  - '-t'
  - '$_IMAGE_TAG'
"""
    
    for key, val in public_vars.items():
        if key.startswith('NEXT_PUBLIC_'):
            # Append to yaml args
            # We use substitutions for values: --build-arg KEY=$_KEY
            sub_key = f"_{key}"
            yaml_content += f"  - '--build-arg'\n  - '{key}=${sub_key}'\n"
            substitutions.append(f"{sub_key}={val}")

    yaml_content += """  - '.'
images:
- '$_IMAGE_TAG'
"""

    with open(cloudbuild_yaml, 'w') as f:
        f.write(yaml_content)

    build_cmd = [
        "gcloud", "builds", "submit",
        "--project", project_id,
        "--config", cloudbuild_yaml,
        "--substitutions", ",".join(substitutions),
        "."
    ]
            
    print("🚀 Submitting Build to Cloud Build...")
    # Print cmd (masking substitutions might be good but these are public generally)
    # print(" ".join(build_cmd))
    
    try:
        subprocess.run(build_cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed: {e}")
        # Cleanup
        if os.path.exists(cloudbuild_yaml):
            os.remove(cloudbuild_yaml)
        return

    if os.path.exists(cloudbuild_yaml):
        os.remove(cloudbuild_yaml)

    # 4. Deploy to Cloud Run
    deploy_cmd = [
        "gcloud", "run", "deploy", "satsang-frontend",
        "--project", project_id,
        "--image", image_tag,
        "--region", "asia-south1",
        "--platform", "managed",
        "--allow-unauthenticated",
        "--memory", "1Gi",
        "--min-instances", "1",
    ]
    
    # Force ASSET_PREFIX to be the Service URL (since we know it after previous deployment or can predict/construct it)
    # Actually, we can just use the predictable Cloud Run URL format
    project_hash = "rraasi-8a619" 
    # Hardcoding the known URL for stability in this fix
    cloud_run_url = "https://satsang-frontend-469389287554.asia-south1.run.app"
    public_vars['NEXT_PUBLIC_ASSET_PREFIX'] = cloud_run_url
    
    # Add runtime environment variables
    for key, val in public_vars.items():
        deploy_cmd.extend(["--set-env-vars", f"{key}={val}"])
    
    print("🚀 Deploying to Cloud Run...")
    print(" ".join(deploy_cmd))
    
    try:
        subprocess.run(deploy_cmd, check=True)
        print("✅ Frontend Deployment Successful!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Deployment failed: {e}")
    finally:
        # Cleanup
        if os.path.exists(env_prod_path):
            os.remove(env_prod_path)
            print(f"Cleaned up {env_prod_path}")

if __name__ == "__main__":
    main()
