#!/bin/bash

# Script to setup SSL certificates for nginx
# Usage: sudo ./setup-ssl.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SSL_ZIP="$PROJECT_ROOT/ssl_2nov/satsang.rraasi.com.zip"
SSL_DIR="/etc/nginx/ssl/satsang.rraasi.com"

if [ ! -f "$SSL_ZIP" ]; then
  echo "Error: SSL certificate zip file not found: $SSL_ZIP"
  exit 1
fi

echo "Setting up SSL certificates for satsang.rraasi.com..."

# Create SSL directory
sudo mkdir -p "$SSL_DIR"

# Extract certificates
echo "Extracting SSL certificates..."
cd "$SSL_DIR"
sudo unzip -o "$SSL_ZIP"

# Find certificate files (they might have different names)
if [ -f "fullchain.pem" ]; then
  CERT_FILE="fullchain.pem"
elif [ -f "cert.pem" ]; then
  CERT_FILE="cert.pem"
else
  echo "Warning: Could not find fullchain.pem or cert.pem"
  echo "Files in SSL directory:"
  ls -la "$SSL_DIR"
  echo "Please check the certificate file names and update nginx config accordingly"
fi

if [ -f "privkey.pem" ]; then
  KEY_FILE="privkey.pem"
elif [ -f "key.pem" ]; then
  KEY_FILE="key.pem"
else
  echo "Warning: Could not find privkey.pem or key.pem"
fi

# Set proper permissions
echo "Setting file permissions..."
sudo chmod 644 "$SSL_DIR"/*.pem 2>/dev/null || true
sudo chmod 600 "$SSL_DIR"/privkey.pem 2>/dev/null || sudo chmod 600 "$SSL_DIR"/key.pem 2>/dev/null || true
sudo chown root:root "$SSL_DIR"/*.pem 2>/dev/null || true

echo ""
echo "SSL certificates extracted to: $SSL_DIR"
echo ""
echo "Next steps:"
echo "1. Update nginx config if certificate file names differ"
echo "2. Copy nginx config: sudo cp nginx/satsang.rraasi.com.conf /etc/nginx/sites-available/"
echo "3. Enable site: sudo ln -s /etc/nginx/sites-available/satsang.rraasi.com.conf /etc/nginx/sites-enabled/"
echo "4. Test config: sudo nginx -t"
echo "5. Reload nginx: sudo systemctl reload nginx"

