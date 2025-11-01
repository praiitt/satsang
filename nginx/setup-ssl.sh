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

# Combine certificate and CA bundle into fullchain.pem (nginx preferred format)
if [ -f "certificate.crt" ] && [ -f "ca_bundle.crt" ]; then
  echo "Combining certificate.crt and ca_bundle.crt into fullchain.pem..."
  sudo cat certificate.crt ca_bundle.crt > fullchain.pem
  echo "Created fullchain.pem"
elif [ -f "fullchain.pem" ]; then
  echo "fullchain.pem already exists"
elif [ -f "cert.pem" ]; then
  echo "Using cert.pem as fullchain.pem"
  sudo cp cert.pem fullchain.pem
else
  echo "Warning: Could not find certificate files"
  echo "Files in SSL directory:"
  ls -la "$SSL_DIR"
fi

# Rename private key if needed
if [ -f "private.key" ]; then
  KEY_FILE="private.key"
  echo "Found private.key"
elif [ -f "privkey.pem" ]; then
  KEY_FILE="privkey.pem"
elif [ -f "key.pem" ]; then
  KEY_FILE="key.pem"
else
  echo "Warning: Could not find private key file"
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

