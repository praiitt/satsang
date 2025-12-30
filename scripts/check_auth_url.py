import os

def check_auth_url():
    if os.path.exists('.env.local'):
        with open('.env.local', 'r') as f:
            for line in f:
                if 'AUTH_SERVER_URL' in line:
                    print(line.strip())

if __name__ == "__main__":
    check_auth_url()
