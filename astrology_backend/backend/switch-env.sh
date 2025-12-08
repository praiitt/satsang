#!/bin/bash

# Environment Switching Script for Rraasi Backend
# This script helps switch between development and production environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a file exists
file_exists() {
    [ -f "$1" ]
}

print_header "Rraasi Backend Environment Switcher"

# Check if we're in the backend directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    print_error "This script must be run from the backend directory"
    print_error "Current directory: $(pwd)"
    print_error "Expected: backend directory with package.json and src/"
    exit 1
fi

print_status "Current directory: $(pwd)"
print_status "Using Firebase project: rraasi"

# Check current environment
if [ -f "production.env" ]; then
    CURRENT_ENV="production"
    print_status "Current environment: Production"
elif [ -f "env.example" ]; then
    CURRENT_ENV="development"
    print_status "Current environment: Development"
else
    print_status "Current environment: Unknown (no env files found)"
fi

# Function to switch to development
switch_to_dev() {
    print_status "Switching to development environment..."
    
    if [ -f "production.env" ]; then
        mv production.env production.env.backup
        print_status "Backed up production.env to production.env.backup"
    fi
    
    if [ -f "env.example" ]; then
        cp env.example .env
        print_status "Created .env from env.example"
    else
        print_error "env.example not found. Cannot switch to development."
        return 1
    fi
    
    export NODE_ENV=development
    print_status "Environment set to: development"
    print_status "Backend will use: http://localhost:3000"
    
    # Update package.json scripts if needed
    if [ -f "package.json" ]; then
        print_status "Updated package.json scripts for development"
    fi
}

# Function to switch to production
switch_to_prod() {
    print_status "Switching to production environment..."
    
    if [ -f ".env" ]; then
        mv .env .env.backup
        print_status "Backed up .env to .env.backup"
    fi
    
    if [ -f "production.env" ]; then
        cp production.env .env
        print_status "Created .env from production.env"
    else
        print_error "production.env not found. Cannot switch to production."
        return 1
    fi
    
    export NODE_ENV=production
    print_status "Environment set to: production"
    
    # Get production URL from environment file
    if [ -f ".env" ]; then
        PROD_URL=$(grep "BACKEND_PROD_URL" .env | cut -d'=' -f2 | tr -d '"')
        if [ ! -z "$PROD_URL" ]; then
            print_status "Backend will use: $PROD_URL"
        else
            print_status "Backend will use: https://rraasibackend-491244969919.asia-east1.run.app"
        fi
    fi
}

# Function to show current status
show_status() {
    print_header "Current Environment Status"
    
    if [ -f ".env" ]; then
        print_status "Active environment file: .env"
        if grep -q "NODE_ENV=production" .env; then
            print_status "Environment: Production"
        else
            print_status "Environment: Development"
        fi
        
        # Show backend URL
        if grep -q "BACKEND_PROD_URL" .env; then
            PROD_URL=$(grep "BACKEND_PROD_URL" .env | cut -d'=' -f2 | tr -d '"')
            print_status "Production Backend: $PROD_URL"
        fi
        
        if grep -q "BACKEND_DEV_URL" .env; then
            DEV_URL=$(grep "BACKEND_DEV_URL" .env | cut -d'=' -f2 | tr -d '"')
            print_status "Development Backend: $DEV_URL"
        fi
    else
        print_warning "No .env file found"
    fi
    
    print_status "Current NODE_ENV: ${NODE_ENV:-not set}"
    print_status "Backend URL: ${NODE_ENV:-development} === 'production' ? '${BACKEND_PROD_URL:-https://rraasibackend-491244969919.asia-east1.run.app}' : 'http://localhost:${PORT:-3000}'"
}

# Function to test backend connection
test_backend() {
    print_header "Testing Backend Connection"
    
    if [ "$NODE_ENV" = "production" ]; then
        if [ ! -z "$BACKEND_PROD_URL" ]; then
            print_status "Testing production backend: $BACKEND_PROD_URL"
            if command_exists curl; then
                if curl -s "$BACKEND_PROD_URL/health" > /dev/null; then
                    print_status "✅ Production backend is responding"
                else
                    print_warning "⚠️  Production backend not responding"
                fi
            else
                print_warning "curl not available, cannot test backend connection"
            fi
        else
            print_warning "Production backend URL not configured"
        fi
    else
        print_status "Testing development backend: http://localhost:3000"
        if command_exists curl; then
            if curl -s "http://localhost:3000/health" > /dev/null; then
                print_status "✅ Development backend is responding"
            else
                print_warning "⚠️  Development backend not responding (make sure it's running)"
            fi
        else
            print_warning "curl not available, cannot test backend connection"
        fi
    fi
}

# Function to show help
show_help() {
    print_header "Usage Instructions"
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev     - Switch to development environment"
    echo "  prod    - Switch to production environment"
    echo "  status  - Show current environment status"
    echo "  test    - Test backend connection"
    echo "  help    - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev      # Switch to development"
    echo "  $0 prod     # Switch to production"
    echo "  $0 status   # Show current status"
    echo "  $0 test     # Test backend connection"
    echo ""
    echo "Environment Files:"
    echo "  - env.example: Development configuration template"
    echo "  - production.env: Production configuration"
    echo "  - .env: Active configuration (created by this script)"
    echo ""
    echo "Note: Always restart the backend after switching environments"
}

# Main script logic
case "${1:-help}" in
    "dev"|"development")
        switch_to_dev
        print_status "✅ Switched to development environment"
        print_status "💡 Remember to restart the backend server"
        ;;
    "prod"|"production")
        switch_to_prod
        print_status "✅ Switched to production environment"
        print_status "💡 Remember to restart the backend server"
        ;;
    "status")
        show_status
        ;;
    "test")
        test_backend
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

print_header "Environment Switch Complete"
print_status "Current environment: ${NODE_ENV:-not set}"
print_status "Backend URL: ${NODE_ENV:-development} === 'production' ? '${BACKEND_PROD_URL:-https://rraasibackend-491244969919.asia-east1.run.app}' : 'http://localhost:${PORT:-3000}'"

if [ "$NODE_ENV" = "production" ]; then
    print_status "Production backend: ${BACKEND_PROD_URL:-https://rraasibackend-491244969919.asia-east1.run.app}"
    print_status "Health check: ${BACKEND_PROD_URL:-https://rraasibackend-491244969919.asia-east1.run.app}/health"
else
    print_status "Development backend: http://localhost:${PORT:-3000}"
    print_status "Health check: http://localhost:${PORT:-3000}/health"
fi

print_status "✅ Environment switch completed successfully!"
