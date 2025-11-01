#!/bin/bash

# Script to setup SSL certificates for nginx
# Usage: sudo ./setup-ssl.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SSL_ZIP="$PROJECT_ROOT/ssl_2nov/satsang.rraasi.com.zip"
SSL_DIR="/home/underlitigationcom/satsang/ssl_2nov"

echo "Setting up SSL certificates for satsang.rraasi.com..."

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Extract certificates if zip file exists and not already extracted
if [ -f "$SSL_ZIP" ] && [ ! -f "$SSL_DIR/certificate.crt" ]; then
  echo "Extracting SSL certificates from zip file..."
  cd "$SSL_DIR"
  unzip -o "$SSL_ZIP"
elif [ -f "$SSL_ZIP" ]; then
  echo "Certificates already extracted. Skipping extraction."
else
  echo "Zip file not found at $SSL_ZIP"
  echo "Assuming certificates are already in $SSL_DIR"
fi

cd "$SSL_DIR"

# Combine certificate and CA bundle into fullchain.pem (nginx preferred format)
if [ -f "certificate.crt" ] && [ -f "ca_bundle.crt" ]; then
  echo "Combining certificate.crt and ca_bundle.crt into fullchain.pem..."
  cat certificate.crt ca_bundle.crt > fullchain.pem
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
chmod 644 "$SSL_DIR"/*.pem 2>/dev/null || true
chmod 644 "$SSL_DIR"/*.crt 2>/dev/null || true
chmod 600 "$SSL_DIR"/private.key 2>/dev/null || chmod 600 "$SSL_DIR"/privkey.pem 2>/dev/null || chmod 600 "$SSL_DIR"/key.pem 2>/dev/null || true
# Note: nginx needs read access to these files, ensure nginx user can read them
# If needed, add nginx to appropriate group or adjust permissions

echo ""
echo "SSL certificates extracted to: $SSL_DIR"
echo ""
echo "Next steps:"
echo "1. Update nginx config if certificate file names differ"
echo "2. Copy nginx config: sudo cp nginx/satsang.rraasi.com.conf /etc/nginx/sites-available/"
echo "3. Enable site: sudo ln -s /etc/nginx/sites-available/satsang.rraasi.com.conf /etc/nginx/sites-enabled/"
echo "4. Test config: sudo nginx -t"
echo "5. Reload nginx: sudo systemctl reload nginx"

