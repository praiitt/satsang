
import os
import json
import subprocess
import sys

def main():
    print("🚀 Preparing to deploy Marketing Server to Cloud Functions...")

    # Configuration
    ENV_FILE = '.env'
    PROJECT_ID = 'rraasi-8a619'
    REGION = 'asia-south1'
    FUNCTION_NAME = 'satsang-marketing-server'

    # 1. Read Credentials from JSON file
    SERVICE_ACCOUNT_FILE = 'rraasiServiceAccount.json'
    
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"❌ Error: {SERVICE_ACCOUNT_FILE} not found.")
        sys.exit(1)

    try:
        with open(SERVICE_ACCOUNT_FILE, 'r') as f:
            creds = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON file: {e}")
        sys.exit(1)

    firebase_project_id = creds.get('project_id')
    firebase_client_email = creds.get('client_email')
    firebase_private_key = creds.get('private_key')

    # 2. Build Marketing Server
    MARKETING_SERVER_DIR = 'marketing-server'
    DIST_DIR = os.path.join(MARKETING_SERVER_DIR, 'dist')
    
    print(f"\n🔨 Building {MARKETING_SERVER_DIR}...")
    try:
        subprocess.run(["npm", "install"], cwd=MARKETING_SERVER_DIR, check=True)
        subprocess.run(["npm", "run", "build"], cwd=MARKETING_SERVER_DIR, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed: {e}")
        sys.exit(1)

    # 3. Prepare Dist for Deployment
    print(f"📦 Preparing deployment package in {DIST_DIR}...")
    import shutil
    
    pkg_path = os.path.join(MARKETING_SERVER_DIR, 'package.json')
    dist_pkg_path = os.path.join(DIST_DIR, 'package.json')
    
    with open(pkg_path, 'r') as f:
        pkg = json.load(f)
    
    pkg['main'] = 'index.js'
    if 'scripts' in pkg: del pkg['scripts']
    if 'devDependencies' in pkg: del pkg['devDependencies']
    
    with open(dist_pkg_path, 'w') as f:
        json.dump(pkg, f, indent=2)
        
    lock_path = os.path.join(MARKETING_SERVER_DIR, 'package-lock.json')
    if os.path.exists(lock_path):
        shutil.copy2(lock_path, os.path.join(DIST_DIR, 'package-lock.json'))

    # 4. Gather Environment Variables
    env_yaml_file = 'env.marketing.yaml'
    
    env_vars = {
        'FIREBASE_PROJECT_ID': firebase_project_id,
        'FIREBASE_CLIENT_EMAIL': firebase_client_email,
        'FIREBASE_PRIVATE_KEY': firebase_private_key,
        'NODE_ENV': 'production',
        'CORS_ORIGIN': '*'
    }

    # Read from root .env
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, val = line.strip().split('=', 1)
                    key = key.strip()
                    val = val.strip().strip("'").strip('"')
                    # List of keys needed by marketing server
                    if key in ['HEYGEN_API_KEY', 'SUNO_API_KEY', 'SARVAM_API_KEY', 'OPENAI_API_KEY', 
                              'GEMINI_API_KEY', 'SENDGRID_API_KEY', 'TWILIO_ACCOUNT_SID', 
                              'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_NUMBER', 'LIVEKIT_EGRESS_GCP_BUCKET',
                              'YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'NEXT_PUBLIC_APP_URL']:
                        env_vars[key] = val

    with open(env_yaml_file, 'w') as yf:
        for k, v in env_vars.items():
            if k == 'FIREBASE_PRIVATE_KEY':
                safe_v = v.replace('\n', '\\n')
                yf.write(f'{k}: "{safe_v}"\n')
            else:
                yf.write(f'{k}: "{v}"\n')
    
    print(f"Generated {env_yaml_file}...")

    # 5. Deploy Cloud Function
    cmd = [
        "gcloud", "functions", "deploy", FUNCTION_NAME,
        "--gen2",
        "--runtime=nodejs20",
        "--region", REGION,
        "--source", DIST_DIR,
        "--entry-point=marketingServer",
        "--trigger-http",
        "--allow-unauthenticated",
        "--memory=1Gi", # Marketing needs more memory for sharp/ffmpeg
        "--timeout=120s",
        "--env-vars-file", env_yaml_file,
        "--project", PROJECT_ID 
    ]

    print(f"🚀 Deploying to project {PROJECT_ID}...")
    try:
        subprocess.run(cmd, check=True)
        print("✅ Marketing Server Deployment Successful!")
    except subprocess.CalledProcessError:
        print("❌ Deployment Failed.")
    finally:
        if os.path.exists(env_yaml_file):
            os.remove(env_yaml_file)

if __name__ == "__main__":
    main()
