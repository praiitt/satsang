import scripts.deploy_frontend_cloudrun as deploy
import os

env_local_path = '.env'
public_vars = {}
if os.path.exists(env_local_path):
    with open(env_local_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                if '=' in line:
                    key, val = line.split('=', 1)
                    key = key.strip()
                    val = val.strip().strip("'").strip('"')
                    if key.startswith('NEXT_PUBLIC_'):
                        public_vars[key] = val
                    elif key in ['AUTH_SERVER_URL', 'AUTH_SERVICE_URL', 'MARKETING_SERVER_URL', 'BACKEND_SERVICE_URL']:
                         public_vars[key] = val

yaml_content = "STEPS:\n"
substitutions = []
for key, val in public_vars.items():
    if key.startswith('NEXT_PUBLIC_') or key in ['AUTH_SERVER_URL', 'AUTH_SERVICE_URL', 'MARKETING_SERVER_URL', 'BACKEND_SERVICE_URL']:
        sub_key = f"_{key}"
        yaml_content += f"  - '--build-arg'\n  - '{key}=${sub_key}'\n"
        substitutions.append(f"{sub_key}={val}")

print(yaml_content)
print("Substitutions:", substitutions)
