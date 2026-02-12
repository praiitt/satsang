import os
import subprocess

# ------------------------------------------------------------------
# MAINTENANCE NOTE: AUTHENTICATION & LOGIN FIX (Feb 2026)
# ------------------------------------------------------------------
# Issue:
#   Login was failing because the Frontend (rraasi.com) and Backend
#   (cloudfunctions.net) were on different domains. Browsers block
#   "Third-Party Cookies" in this scenario, preventing the session
#   cookie from being set.
#
# Fix:
#   We use "First-Party" cookies by routing backend requests through
#   the same domain as the frontend.
#
# Configuration:
#   1. Firebase Hosting Rewrite:
#      In `firebase.json`, we rewrite `/satsang-auth-server/**` to
#     the `satsang-auth-server` Cloud Run service.
#
#   2. Backend Router:
#      The backend `index.ts` mounts the main router at `/satsang-auth-server`
#      to handle the path prefix that is preserved by the rewrite.
#
#   3. Frontend Environment Variable:
#      `NEXT_PUBLIC_AUTH_SERVER_URL` MUST be set to:
#      `https://rraasi.com/satsang-auth-server` (or current domain).
#
#   4. Deployment Script (THIS SCRIPT):
#      We MUST pass `AUTH_SERVER_URL` and `NEXT_PUBLIC_AUTH_SERVER_URL`
#      as build arguments (`--build-arg`) to the Docker build.
#      The `Dockerfile` consumes these ARGs to bake the URL into the
#      client-side bundle.
# ------------------------------------------------------------------

def main():
    print("Preparing to deploy Frontend to Cloud Run...")
    
    # ------------------------------------------------------------------
    # IMPORTANT SAFETY NOTICE: Dependency Management
    # ------------------------------------------------------------------
    # This script deploys the CURRENT, LOCAL codebase to Cloud Build.
    # The Dockerfile uses `pnpm install --frozen-lockfile` to ensure
    # that the deployed dependencies MATCH EXACTLY what is in your
    # local `pnpm-lock.yaml` file.
    #
    # CRITICAL:
    # 1. Do not run `pnpm update` or `pnpm install` blindly before deploying
    #    unless you have tested the new versions locally.
    # 2. If `pnpm-lock.yaml` is changed, the deployment WILL use the new versions.
    # 3. We have pinned pnpm to version 9.15.9 in the Dockerfile to match package.json.
    # ------------------------------------------------------------------

    if not os.path.exists('pnpm-lock.yaml'):
        print("❌ CRITICAL ERROR: pnpm-lock.yaml not found!")
        print("   The build requires a lockfile to ensure stable dependencies.")
        print("   Please run `pnpm install` locally to generate it, test your app, and then retry.")
        return

    print("✅ pnpm-lock.yaml found. Deploying with FIXED dependencies from lockfile.")


    env_local_path = '.env'  # Use .env for production deployment
    env_prod_path = '.env.production'

    public_vars = {}
    
    # 1. Read .env (production environment variables)
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
                        elif key in ['AUTH_SERVER_URL', 'AUTH_SERVICE_URL', 'MARKETING_SERVER_URL', 'LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_EGRESS_ENABLED', 'LIVEKIT_EGRESS_GCP_BUCKET', 'LIVEKIT_EGRESS_GCP_CREDENTIALS']:
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
        if key.startswith('NEXT_PUBLIC_') or key in ['AUTH_SERVER_URL', 'AUTH_SERVICE_URL']:
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
    # Hardcoding the known URL for stability in this fix
    cloud_run_url = "https://satsang-frontend-469389287554.asia-south1.run.app"
    public_vars['NEXT_PUBLIC_ASSET_PREFIX'] = cloud_run_url

    # ------------------------------------------------------------------
    # Inject Service Account for Egress/Admin SDK
    # ------------------------------------------------------------------
    # The frontend needs this to initialize Firebase Admin in API routes (e.g. /api/egress/start)
    import base64
    service_account_file = 'rraasiServiceAccount.json'
    if os.path.exists(service_account_file):
        print(f"🔑 Injecting {service_account_file} into env vars...")
        with open(service_account_file, 'rb') as f:
            sa_content = f.read()
            # We use base64 to avoid issues with newlines in env vars
            sa_b64 = base64.b64encode(sa_content).decode('utf-8')
            public_vars['FIREBASE_SERVICE_ACCOUNT_JSON'] = sa_b64
    else:
        print(f"⚠️  WARNING: {service_account_file} not found. Admin SDK functionalities might fail.")
    
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
