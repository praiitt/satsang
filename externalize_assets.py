import os
import json
import subprocess

BUCKET_NAME = "rraasi-public-assets"
BASE_URL = f"https://storage.googleapis.com/{BUCKET_NAME}"
PROJECT_ROOT = "/Users/prakash/Documents/satsang/satsangapp"
PUBLIC_DIR = os.path.join(PROJECT_ROOT, "public")

IMAGE_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico')

def get_asset_metadata(file_path, relative_path):
    # Infer type and usage
    asset_type = "image"
    usage = "General asset"
    
    if "branding" in relative_path:
        asset_type = "logo"
        usage = f"Branding asset: {os.path.basename(file_path)}"
    elif "gurus" in relative_path:
        asset_type = "guru"
        usage = f"Spiritual master portrait: {os.path.basename(file_path)}"
    elif "services" in relative_path:
        asset_type = "icon"
        usage = f"Service category icon: {os.path.basename(file_path)}"
    elif file_path.endswith('.ico'):
        asset_type = "favicon"
        usage = "Browser tab icon"

    return {
        "id": os.path.splitext(os.path.basename(file_path))[0].replace('-', '_'),
        "originalPath": f"public/{relative_path}",
        "publicUrl": f"{BASE_URL}/{relative_path}",
        "type": asset_type,
        "usage": usage
    }

def main():
    assets = []
    
    for root, dirs, files in os.walk(PUBLIC_DIR):
        for file in files:
            if file.lower().endswith(IMAGE_EXTENSIONS):
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, PUBLIC_DIR)
                
                print(f"🔼 Uploading {relative_path}...")
                
                # Upload and set public read
                # Use gsutil cp -a public-read
                dest_uri = f"gs://{BUCKET_NAME}/{relative_path}"
                try:
                    subprocess.run(["gsutil", "cp", "-a", "public-read", file_path, dest_uri], check=True)
                    assets.append(get_asset_metadata(file_path, relative_path))
                except subprocess.CalledProcessError as e:
                    print(f"❌ Failed to upload {file}: {e}")

    # Write manifest
    manifest_path = os.path.join(PROJECT_ROOT, "assets_manifest.json")
    with open(manifest_path, 'w') as f:
        json.dump({"assets": assets, "bucket": BUCKET_NAME, "baseUrl": BASE_URL}, f, indent=2)
    
    print(f"\n✅ Asset migration complete!")
    print(f"📄 Manifest created at {manifest_path}")

if __name__ == "__main__":
    main()
