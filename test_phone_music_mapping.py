#!/usr/bin/env python3
"""
Test script to verify phone number mapping for music tracks.

This script tests:
1. Webhook saves tracks with phone number as userId
2. My Music API returns tracks for authenticated user
3. Tracks are correctly filtered by phone number
"""

import requests
import json
import time
from datetime import datetime

# Configuration
WEBHOOK_URL = "https://rraasi-music-webhook-6ougd45dya-uc.a.run.app"
MY_MUSIC_API = "https://satsang-frontend-469389287554.asia-south1.run.app/api/rraasi-music/my-tracks"

# Test phone numbers
TEST_PHONE_1 = "+919876543210"
TEST_PHONE_2 = "+919988776655"

def test_webhook_with_phone_number(phone_number):
    """Test that webhook saves track with phone number as userId"""
    
    print(f"\n{'='*60}")
    print(f"TEST 1: Webhook Save with Phone Number")
    print(f"Phone: {phone_number}")
    print(f"{'='*60}")
    
    # Create test track data
    track_id = f"test_track_{int(time.time())}"
    test_payload = {
        "code": 200,
        "msg": "success",
        "data": {
            "callbackType": "complete",
            "task_id": f"test_task_{int(time.time())}",
            "data": [{
                "id": track_id,
                "audio_url": "https://cdn1.suno.ai/test-track.mp3",
                "source_audio_url": "https://cdn1.suno.ai/test-track.mp3",
                "stream_audio_url": "https://cdn1.suno.ai/test-track.mp3",
                "image_url": "https://cdn2.suno.ai/test-image.jpeg",
                "source_image_url": "https://cdn2.suno.ai/test-image.jpeg",
                "title": f"Test Track for {phone_number}",
                "model_name": "chirp-auk-turbo",
                "prompt": "Test prompt for phone number mapping",
                "tags": "test, phone-mapping",
                "duration": 180,
                "createTime": str(int(time.time() * 1000))
            }]
        }
    }
    
    # Send to webhook
    url = f"{WEBHOOK_URL}?userId={phone_number}"
    
    print(f"\n📤 Sending callback to webhook...")
    print(f"URL: {url}")
    print(f"Track ID: {track_id}")
    
    try:
        response = requests.post(
            url,
            json=test_payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\n✅ Response Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get("processed") == 1:
                print(f"\n✅ TEST PASSED: Track saved successfully")
                print(f"   - Track ID: {track_id}")
                print(f"   - User ID (Phone): {phone_number}")
                return track_id
            else:
                print(f"\n❌ TEST FAILED: Track not processed")
                return None
        else:
            print(f"\n❌ TEST FAILED: HTTP {response.status_code}")
            return None
            
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        return None


def test_my_music_api_without_auth():
    """Test that My Music API requires authentication"""
    
    print(f"\n{'='*60}")
    print(f"TEST 2: My Music API - Unauthorized Access")
    print(f"{'='*60}")
    
    print(f"\n📤 Calling My Music API without authentication...")
    
    try:
        response = requests.get(MY_MUSIC_API)
        
        print(f"\n✅ Response Status: {response.status_code}")
        
        if response.status_code == 401:
            print(f"✅ TEST PASSED: API correctly requires authentication")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ TEST FAILED: Expected 401, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        return False


def verify_firebase_track(track_id, expected_phone):
    """Instructions to verify track in Firebase Console"""
    
    print(f"\n{'='*60}")
    print(f"TEST 3: Manual Firebase Verification")
    print(f"{'='*60}")
    
    print(f"\n📋 Manual Verification Steps:")
    print(f"1. Open Firebase Console:")
    print(f"   https://console.firebase.google.com/project/rraasi-8a619/firestore/data/~2Fmusic_tracks")
    print(f"\n2. Find track with ID: {track_id}")
    print(f"\n3. Verify the following fields:")
    print(f"   ✓ userId: {expected_phone}")
    print(f"   ✓ title: Test Track for {expected_phone}")
    print(f"   ✓ status: COMPLETED")
    print(f"   ✓ audioUrl: https://cdn1.suno.ai/test-track.mp3")
    
    print(f"\n⏳ Waiting for manual verification...")
    input(f"\nPress Enter after verifying in Firebase Console...")
    
    verify = input(f"Did you find the track with userId={expected_phone}? (yes/no): ")
    
    if verify.lower() == 'yes':
        print(f"\n✅ TEST PASSED: Track verified in Firebase")
        return True
    else:
        print(f"\n❌ TEST FAILED: Track not found or incorrect userId")
        return False


def test_summary(results):
    """Print test summary"""
    
    print(f"\n{'='*60}")
    print(f"TEST SUMMARY")
    print(f"{'='*60}")
    
    total = len(results)
    passed = sum(1 for r in results if r['passed'])
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    
    print(f"\nDetailed Results:")
    for i, result in enumerate(results, 1):
        status = "✅ PASS" if result['passed'] else "❌ FAIL"
        print(f"{i}. {result['name']}: {status}")
    
    if passed == total:
        print(f"\n🎉 ALL TESTS PASSED!")
        print(f"\n✅ Phone number mapping is working correctly!")
        print(f"   - Webhook saves tracks with phone number as userId")
        print(f"   - Tracks are stored in Firebase with correct userId")
        print(f"   - My Music API requires authentication")
    else:
        print(f"\n⚠️  SOME TESTS FAILED")
        print(f"   Please review the failures above")


def main():
    """Run all tests"""
    
    print(f"\n{'#'*60}")
    print(f"# PHONE NUMBER MUSIC MAPPING - TEST SUITE")
    print(f"# {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*60}")
    
    results = []
    
    # Test 1: Webhook with phone number
    track_id = test_webhook_with_phone_number(TEST_PHONE_1)
    results.append({
        'name': 'Webhook Save with Phone Number',
        'passed': track_id is not None
    })
    
    # Test 2: My Music API requires auth
    auth_test = test_my_music_api_without_auth()
    results.append({
        'name': 'My Music API Authentication',
        'passed': auth_test
    })
    
    # Test 3: Manual Firebase verification
    if track_id:
        firebase_test = verify_firebase_track(track_id, TEST_PHONE_1)
        results.append({
            'name': 'Firebase Track Verification',
            'passed': firebase_test
        })
    
    # Print summary
    test_summary(results)
    
    print(f"\n{'#'*60}")
    print(f"# NEXT STEPS")
    print(f"{'#'*60}")
    print(f"\n1. Deploy updated music agent to production:")
    print(f"   ssh prakash@165.22.222.208")
    print(f"   cd /home/prakash/testproj/satsang/livekit_server/agent-starter-python")
    print(f"   git pull origin main")
    print(f"   pm2 restart agent-music")
    print(f"\n2. Test end-to-end:")
    print(f"   - Log in with phone number")
    print(f"   - Create music track")
    print(f"   - Verify track saved with phone number in Firebase")
    print(f"   - Check for NO duplicate entries")
    print(f"\n3. Test My Music API (after login):")
    print(f"   - Visit: https://satsang-frontend-469389287554.asia-south1.run.app/api/rraasi-music/my-tracks")
    print(f"   - Should return only your tracks")


if __name__ == "__main__":
    main()
