import os

def check_env():
    if os.path.exists('.env.local'):
        with open('.env.local', 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key = line.split('=')[0]
                    print(key)

if __name__ == "__main__":
    check_env()
