#!/bin/bash
set -e

echo "=================================================="
echo "🔧 Adding 4GB Swap Memory"
echo "=================================================="

# Check if swap already exists
if swapon --show | grep -q "/swapfile"; then
    echo "✅ Swap file already exists. Skipping."
    free -h
    exit 0
fi

# Create 4GB swap file
echo "Creating 4GB swap file..."
sudo fallocate -l 4G /swapfile

# Set permissions
echo "Setting permissions..."
sudo chmod 600 /swapfile

# Setup swap area
echo "Setting up swap area..."
sudo mkswap /swapfile

# Enable swap
echo "Enabling swap..."
sudo swapon /swapfile

# Make permanent
echo "Making swap permanent in /etc/fstab..."
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Use swap only when RAM is almost full
echo "Tuning swappiness..."
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

echo "=================================================="
echo "✅ Swap Enabled Successfully"
echo "=================================================="
free -h
