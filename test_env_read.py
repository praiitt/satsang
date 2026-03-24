import os
public_vars = {}
with open('.env', 'r') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#'):
            if '=' in line:
                key, val = line.split('=', 1)
                key = key.strip()
                val = val.strip().strip("'").strip('"')
                if key.startswith('NEXT_PUBLIC_'):
                    public_vars[key] = val
                elif key in ['AUTH_SERVER_URL', 'AUTH_SERVICE_URL', 'MARKETING_SERVER_URL', 'LIVEKIT_URL']:
                     public_vars[key] = val
print("MARKETING_SERVER_URL =", public_vars.get('MARKETING_SERVER_URL', 'MISSING'))
