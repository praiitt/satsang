#!/usr/bin/env python3
"""
Diagnostic script to check if all required dependencies are installed
and can be imported correctly.
"""

import sys
import importlib

def check_import(module_name, description):
    """Check if a module can be imported."""
    try:
        mod = importlib.import_module(module_name)
        version = getattr(mod, '__version__', 'unknown')
        print(f"✓ {description}: {module_name} {version}")
        return True
    except ImportError as e:
        print(f"✗ {description}: {module_name} - FAILED")
        print(f"  Error: {e}")
        return False
    except Exception as e:
        print(f"✗ {description}: {module_name} - ERROR")
        print(f"  Error: {e}")
        return False

def main():
    print("Checking dependencies for LiveKit Agent...")
    print("=" * 60)
    
    checks = [
        ("torch", "PyTorch"),
        ("livekit.agents", "LiveKit Agents"),
        ("livekit.plugins.silero", "Silero Plugin"),
        ("livekit.plugins.turn_detector", "Turn Detector Plugin"),
        ("livekit.plugins.noise_cancellation", "Noise Cancellation Plugin"),
    ]
    
    results = []
    for module, desc in checks:
        results.append(check_import(module, desc))
    
    print("=" * 60)
    
    # Test PyTorch specifically
    if results[0]:  # torch was imported successfully
        try:
            import torch
            print(f"\nPyTorch Details:")
            print(f"  Version: {torch.__version__}")
            print(f"  CUDA Available: {torch.cuda.is_available() if torch.cuda else False}")
            if torch.cuda:
                print(f"  CUDA Version: {torch.version.cuda}")
        except Exception as e:
            print(f"  Error getting PyTorch details: {e}")
    
    # Test model loading
    print("\n" + "=" * 60)
    print("Testing Silero VAD model loading...")
    try:
        from livekit.plugins import silero
        vad = silero.VAD.load()
        print("✓ Silero VAD model loaded successfully")
    except Exception as e:
        print(f"✗ Failed to load Silero VAD model: {e}")
        print("  This is likely the cause of the inference executor timeout!")
        sys.exit(1)
    
    # Test turn detector (this requires job context, so we just check import)
    print("\n" + "=" * 60)
    print("Testing Turn Detector import...")
    try:
        from livekit.plugins.turn_detector.multilingual import MultilingualModel
        print("✓ Turn Detector can be imported")
        print("  Note: Full initialization requires job context (happens in entrypoint)")
    except Exception as e:
        print(f"✗ Failed to import Turn Detector: {e}")
        print("  This could cause the inference executor timeout!")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ All dependencies are installed correctly!")
        return 0
    else:
        print("✗ Some dependencies are missing!")
        print("\nTo fix, run: uv sync --locked")
        return 1

if __name__ == "__main__":
    sys.exit(main())

