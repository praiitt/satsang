#!/bin/bash

# Script to get Spotify refresh token using OAuth flow
# This script will guide you through the process

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Spotify Refresh Token Generator${NC}"
echo "=================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local file not found${NC}"
    exit 1
fi

# Read credentials from .env.local
SPOTIFY_CLIENT_ID=$(grep "^SPOTIFY_CLIENT_ID=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
SPOTIFY_CLIENT_SECRET=$(grep "^SPOTIFY_CLIENT_SECRET=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
SPOTIFY_REDIRECT_URI=$(grep "^SPOTIFY_REDIRECT_URI=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
NEXT_PUBLIC_APP_URL=$(grep "^NEXT_PUBLIC_APP_URL=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)

# Use defaults if not set
if [ -z "$SPOTIFY_REDIRECT_URI" ]; then
    if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
        SPOTIFY_REDIRECT_URI="http://localhost:3000/api/spotify/callback"
    else
        SPOTIFY_REDIRECT_URI="${NEXT_PUBLIC_APP_URL}/api/spotify/callback"
    fi
fi

if [ -z "$SPOTIFY_CLIENT_ID" ] || [ -z "$SPOTIFY_CLIENT_SECRET" ]; then
    echo -e "${RED}Error: SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not found in .env.local${NC}"
    exit 1
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  Client ID: ${SPOTIFY_CLIENT_ID:0:20}..."
echo "  Redirect URI: $SPOTIFY_REDIRECT_URI"
echo ""

# Spotify scopes required
SCOPES="user-read-playback-state user-modify-playback-state user-read-currently-playing streaming user-read-email user-read-private"

# Generate state for CSRF protection
STATE=$(openssl rand -hex 16)

# Build authorization URL
AUTH_URL="https://accounts.spotify.com/authorize?response_type=code&client_id=${SPOTIFY_CLIENT_ID}&scope=$(echo -n "$SCOPES" | jq -sRr @uri)&redirect_uri=$(echo -n "$SPOTIFY_REDIRECT_URI" | jq -rR @uri)&state=${STATE}&show_dialog=true"

echo -e "${GREEN}Step 1: Authorize the application${NC}"
echo "=================================="
echo ""
echo "Open this URL in your browser:"
echo ""
echo -e "${YELLOW}${AUTH_URL}${NC}"
echo ""
echo "After authorization, you'll be redirected to:"
echo "  ${SPOTIFY_REDIRECT_URI}?code=AUTH_CODE&state=${STATE}"
echo ""
echo -e "${YELLOW}Copy the 'code' parameter from the redirect URL${NC}"
echo ""
read -p "Paste the authorization code here: " AUTH_CODE

if [ -z "$AUTH_CODE" ]; then
    echo -e "${RED}Error: Authorization code is required${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 2: Exchange code for tokens${NC}"
echo "=================================="
echo ""

# Create base64 encoded credentials
AUTH_STRING=$(echo -n "${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}" | base64)

# Exchange code for tokens
RESPONSE=$(curl -s -X POST "https://accounts.spotify.com/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic ${AUTH_STRING}" \
  -d "grant_type=authorization_code" \
  -d "code=${AUTH_CODE}" \
  -d "redirect_uri=${SPOTIFY_REDIRECT_URI}")

# Check for errors
ERROR=$(echo "$RESPONSE" | jq -r '.error // empty' 2>/dev/null)
if [ ! -z "$ERROR" ]; then
    ERROR_DESC=$(echo "$RESPONSE" | jq -r '.error_description // empty' 2>/dev/null)
    echo -e "${RED}Error: ${ERROR}${NC}"
    if [ ! -z "$ERROR_DESC" ]; then
        echo -e "${RED}Description: ${ERROR_DESC}${NC}"
    fi
    echo ""
    echo "Full response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

# Extract tokens
ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token' 2>/dev/null)
REFRESH_TOKEN=$(echo "$RESPONSE" | jq -r '.refresh_token' 2>/dev/null)
EXPIRES_IN=$(echo "$RESPONSE" | jq -r '.expires_in' 2>/dev/null)

if [ -z "$REFRESH_TOKEN" ]; then
    echo -e "${RED}Error: No refresh token received${NC}"
    echo "This might happen if:"
    echo "  1. You've already authorized the app before (Spotify doesn't return refresh_token on subsequent authorizations)"
    echo "  2. The redirect URI doesn't match exactly what's configured in Spotify Dashboard"
    echo ""
    echo "Full response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Success! Tokens received${NC}"
echo ""
echo -e "${YELLOW}Access Token:${NC} ${ACCESS_TOKEN:0:20}... (expires in ${EXPIRES_IN} seconds)"
echo -e "${YELLOW}Refresh Token:${NC} ${REFRESH_TOKEN}"
echo ""
echo -e "${GREEN}Step 3: Add to .env.local${NC}"
echo "=================================="
echo ""
echo "Add this line to your .env.local file:"
echo ""
echo -e "${YELLOW}SPOTIFY_REFRESH_TOKEN=${REFRESH_TOKEN}${NC}"
echo ""
read -p "Would you like to add it automatically? (y/n): " ADD_TO_ENV

if [ "$ADD_TO_ENV" = "y" ] || [ "$ADD_TO_ENV" = "Y" ]; then
    # Check if SPOTIFY_REFRESH_TOKEN already exists
    if grep -q "^SPOTIFY_REFRESH_TOKEN=" .env.local; then
        # Replace existing
        sed -i.bak "s|^SPOTIFY_REFRESH_TOKEN=.*|SPOTIFY_REFRESH_TOKEN=${REFRESH_TOKEN}|" .env.local
        echo -e "${GREEN}✅ Updated SPOTIFY_REFRESH_TOKEN in .env.local${NC}"
    else
        # Add new
        echo "" >> .env.local
        echo "SPOTIFY_REFRESH_TOKEN=${REFRESH_TOKEN}" >> .env.local
        echo -e "${GREEN}✅ Added SPOTIFY_REFRESH_TOKEN to .env.local${NC}"
    fi
    echo ""
    echo -e "${GREEN}Done! Restart your Next.js server for the changes to take effect.${NC}"
else
    echo ""
    echo -e "${YELLOW}Remember to add SPOTIFY_REFRESH_TOKEN to .env.local manually!${NC}"
fi

