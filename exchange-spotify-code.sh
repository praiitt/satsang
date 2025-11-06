#!/bin/bash

# Quick script to exchange Spotify authorization code for refresh token

CLIENT_ID="65136cefd17d48ffb4c7d6ca07dd533f"
CLIENT_SECRET="ea9d1474251b460ea358ce146afe2a44"
REDIRECT_URI="https://satsang.rraasi.com/api/spotify/callback"

if [ -z "$1" ]; then
    echo "Usage: ./exchange-spotify-code.sh <AUTHORIZATION_CODE>"
    echo ""
    echo "Get the authorization code from the redirect URL after visiting:"
    echo "https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=user-read-playback-state%20user-modify-playback-state%20user-read-currently-playing%20streaming%20user-read-email%20user-read-private&redirect_uri=${REDIRECT_URI}&state=xyz&show_dialog=true"
    exit 1
fi

AUTH_CODE="$1"

# Create base64 encoded credentials
AUTH_STRING=$(echo -n "${CLIENT_ID}:${CLIENT_SECRET}" | base64)

echo "Exchanging authorization code for tokens..."
echo ""

# Exchange code for tokens
RESPONSE=$(curl -s -X POST "https://accounts.spotify.com/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic ${AUTH_STRING}" \
  -d "grant_type=authorization_code" \
  -d "code=${AUTH_CODE}" \
  -d "redirect_uri=${REDIRECT_URI}")

# Check for errors
ERROR=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
if [ ! -z "$ERROR" ]; then
    ERROR_DESC=$(echo "$RESPONSE" | grep -o '"error_description":"[^"]*"' | cut -d'"' -f4)
    echo "❌ Error: $ERROR"
    if [ ! -z "$ERROR_DESC" ]; then
        echo "Description: $ERROR_DESC"
    fi
    echo ""
    echo "Full response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

# Extract tokens
REFRESH_TOKEN=$(echo "$RESPONSE" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)
ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
EXPIRES_IN=$(echo "$RESPONSE" | grep -o '"expires_in":[0-9]*' | cut -d':' -f2)

if [ -z "$REFRESH_TOKEN" ]; then
    echo "❌ Error: No refresh token received"
    echo ""
    echo "This might happen if:"
    echo "  1. You've already authorized the app before (Spotify doesn't return refresh_token on subsequent authorizations)"
    echo "  2. The redirect URI doesn't match exactly what's configured in Spotify Dashboard"
    echo ""
    echo "Full response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

echo "✅ Success! Tokens received"
echo ""
echo "Access Token: ${ACCESS_TOKEN:0:20}... (expires in ${EXPIRES_IN} seconds)"
echo "Refresh Token: ${REFRESH_TOKEN}"
echo ""
echo "Add this to your .env.local file:"
echo "SPOTIFY_REFRESH_TOKEN=${REFRESH_TOKEN}"
echo ""

# Try to add to .env.local automatically
if [ -f .env.local ]; then
    read -p "Would you like to add it to .env.local automatically? (y/n): " ADD_TO_ENV
    if [ "$ADD_TO_ENV" = "y" ] || [ "$ADD_TO_ENV" = "Y" ]; then
        if grep -q "^SPOTIFY_REFRESH_TOKEN=" .env.local; then
            # Replace existing (macOS compatible)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|^SPOTIFY_REFRESH_TOKEN=.*|SPOTIFY_REFRESH_TOKEN=${REFRESH_TOKEN}|" .env.local
            else
                sed -i "s|^SPOTIFY_REFRESH_TOKEN=.*|SPOTIFY_REFRESH_TOKEN=${REFRESH_TOKEN}|" .env.local
            fi
            echo "✅ Updated SPOTIFY_REFRESH_TOKEN in .env.local"
        else
            echo "" >> .env.local
            echo "SPOTIFY_REFRESH_TOKEN=${REFRESH_TOKEN}" >> .env.local
            echo "✅ Added SPOTIFY_REFRESH_TOKEN to .env.local"
        fi
        echo ""
        echo "✅ Done! Restart your Next.js server for the changes to take effect."
    fi
fi

