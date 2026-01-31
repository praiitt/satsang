
import os
import subprocess
import shlex

def parse_env_local(filepath):
    env_vars = {}
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, value = line.split('=', 1)
                # Handle potential quoting
                value = value.strip()
                if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]
                env_vars[key.strip()] = value
    return env_vars

def main():
    env_path = '.env.local'
    if not os.path.exists(env_path):
        print(f"Error: {env_path} not found")
        return

    env_vars = parse_env_local(env_path)
    
    # keys to update
    keys_to_update = [
        "LIVEKIT_EGRESS_ENABLED",
        "LIVEKIT_EGRESS_GCP_BUCKET",
        "LIVEKIT_EGRESS_GCP_PREFIX",
        "LIVEKIT_EGRESS_GCP_CREDENTIALS_BASE64",
        "LIVEKIT_EGRESS_GCP_CREDENTIALS",
        "FIREBASE_SERVICE_ACCOUNT_JSON"
    ]

    update_args = []
    for key in keys_to_update:
        if key in env_vars:
            update_args.append(f"{key}={env_vars[key]}")
        else:
            print(f"Warning: {key} not found in .env.local")

    if not update_args:
        print("No variables to update.")
        return

    cmd = [
        "gcloud", "run", "services", "update", "satsang-frontend",
        "--region", "asia-south1",
        "--project", "rraasi-8a619",
        "--update-env-vars", ",".join(update_args)
    ]

    print("Updating Cloud Run environment variables...")
    # Hide the full command in logs to protect credentials, but run it
    subprocess.run(cmd, check=True)
    print("✅ Cloud Run environment variables updated successfully.")

if __name__ == "__main__":
    main()
