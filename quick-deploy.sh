#!/bin/bash
set -e  # Exit on any error

echo "=================================================="
echo "🚀 Satsang App - Quick Deploy (No Internet Check)"
echo "=================================================="

# Skip internet check and proceed directly
cd /home/prakash

# Clone repository
if [ -d "satsang" ]; then
    echo "Removing old satsang directory..."
    rm -rf satsang
fi

echo "Cloning repository..."
git clone https://github.com/praiitt/satsang.git
cd satsang

# Run the full deployment script from the repo
chmod +x deploy_fresh_vm.sh

# Patch it to skip internet check
sed -i '71,76d' deploy_fresh_vm.sh  # Remove ping check lines

# Run it
./deploy_fresh_vm.sh
