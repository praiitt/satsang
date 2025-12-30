
import os
import json
import subprocess
import sys

def main():
    print("🚀 Preparing to deploy Auth Server with corrected credentials...")

    # Configuration
    ENV_FILE = '.env.local'
    PROJECT_ID = 'rraasi-8a619'
    REGION = 'asia-south1'
    FUNCTION_NAME = 'satsang-auth-server'

    # 1. Read Credentials from JSON file
    SERVICE_ACCOUNT_FILE = 'rraasiServiceAccount.json'
    
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"❌ Error: {SERVICE_ACCOUNT_FILE} not found.")
        sys.exit(1)

    print(f"Reading {SERVICE_ACCOUNT_FILE}...")
    try:
        with open(SERVICE_ACCOUNT_FILE, 'r') as f:
            creds = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON file: {e}")
        sys.exit(1)

    print("✅ Found valid Service Account JSON")

    firebase_project_id = creds.get('project_id')
    firebase_client_email = creds.get('client_email')
    firebase_private_key = creds.get('private_key')

    if not firebase_private_key:
        print("❌ Error: private_key not found in credentials.")
        sys.exit(1)


    # ... (preamble same as before) ...
    print(f"Loaded credentials for project: {firebase_project_id}")

    # 3. Build Auth Server
    AUTH_SERVER_DIR = 'auth-server'
    DIST_DIR = os.path.join(AUTH_SERVER_DIR, 'dist')
    
    print(f"\n🔨 Building {AUTH_SERVER_DIR}...")
    try:
        # Try installing with legacy-peer-deps to avoid conflicts
        subprocess.run(["npm", "install", "--legacy-peer-deps"], cwd=AUTH_SERVER_DIR, check=True)
        subprocess.run(["npm", "run", "build"], cwd=AUTH_SERVER_DIR, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed: {e}")
        sys.exit(1)

    # 4. Prepare Dist for Deployment
    # Cloud Functions needs package.json to install dependencies.
    # We copy package.json to dist/ and adjust 'main'.
    print(f"📦 Preparing deployment package in {DIST_DIR}...")
    import shutil
    
    pkg_path = os.path.join(AUTH_SERVER_DIR, 'package.json')
    dist_pkg_path = os.path.join(DIST_DIR, 'package.json')
    
    with open(pkg_path, 'r') as f:
        pkg = json.load(f)
    
    # Update main to point to index.js (since we are inside dist)
    pkg['main'] = 'index.js'
    
    # Remove scripts to prevent Cloud Build from trying to run 'build' again
    # and fail due to missing devDependencies (like tsc)
    if 'scripts' in pkg:
        del pkg['scripts']
        
    # Remove devDependencies as they are not needed in production
    if 'devDependencies' in pkg:
        del pkg['devDependencies']
    
    with open(dist_pkg_path, 'w') as f:
        json.dump(pkg, f, indent=2)
        
    # Copy package-lock.json if exists (CRITICAL for consistent builds)
    lock_path = os.path.join(AUTH_SERVER_DIR, 'package-lock.json')
    if os.path.exists(lock_path):
        print("✅ Copying package-lock.json to dist...")
        shutil.copy2(lock_path, os.path.join(DIST_DIR, 'package-lock.json'))
    else:
        print("⚠️ Warning: package-lock.json not found. Build might be inconsistent.")

    # Create .npmrc in dist to enforce legacy-peer-deps
    npmrc_path = os.path.join(DIST_DIR, '.npmrc')
    with open(npmrc_path, 'w') as f:
        f.write("legacy-peer-deps=true\n")
    print("✅ Created .npmrc with legacy-peer-deps=true")

    # 5. Deploy Cloud Function
    env_yaml_file = 'env.deploy.yaml'
    # Write yaml file in the root (where we run gcloud) or dist?
    # gcloud expects path. relative to CWD.
    
    with open(env_yaml_file, 'w') as yf:
        yf.write(f"FIREBASE_PROJECT_ID: '{firebase_project_id}'\n")
        yf.write(f"FIREBASE_CLIENT_EMAIL: '{firebase_client_email}'\n")
        yf.write(f"FIREBASE_PRIVATE_KEY: |\n")
        for line in firebase_private_key.splitlines():
             yf.write(f"  {line}\n")
        yf.write(f"NODE_ENV: 'production'\n")
        yf.write(f"CORS_ORIGIN: 'https://rraasi.com'\n") # Should probably trigger for all or allow dynamic
    
    print(f"Generated {env_yaml_file}...")

    cmd = [
        "gcloud", "functions", "deploy", FUNCTION_NAME,
        "--gen2",
        "--runtime=nodejs20",
        "--region", REGION,
        "--source", DIST_DIR, # Deploy the prepared dist folder
        "--entry-point=authServer", # ensure export name matches
        "--trigger-http",
        "--allow-unauthenticated",
        "--memory=512MB",
        "--timeout=60s",
        "--env-vars-file", env_yaml_file,
        "--project", PROJECT_ID 
    ]

    print(f"Deploying to project {PROJECT_ID} from {DIST_DIR}...")
    print(" ".join(cmd))
    
    try:
        subprocess.run(cmd, check=True)
        print("✅ Deployment Successful!")
    except subprocess.CalledProcessError:
        print("❌ Deployment Failed.")
        print("\n💡 Tip: Check if you are logged in to the correct account:")
        print(f"   gcloud auth login")
        print(f"   gcloud config set project {PROJECT_ID}")
    finally:
        if os.path.exists(env_yaml_file):
            os.remove(env_yaml_file)
            print(f"Cleaned up {env_yaml_file}")

if __name__ == "__main__":
    main()

