#!/usr/bin/env python3
"""
Quick test to check CSS file accessibility
"""
import requests
import os

def test_css_access():
    """Test if CSS files are accessible via HTTP."""
    
    # Your server URL - replace with your actual domain/IP
    base_url = "http://your-domain.com"  # Replace with your actual domain
    
    css_files = [
        "/static/style/style.css",
        "/static/style/vehicle_details_style.css"
    ]
    
    print("Testing CSS file accessibility...")
    print("=" * 50)
    
    for css_file in css_files:
        try:
            url = base_url + css_file
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                print(f"✅ {css_file}: OK (200)")
                print(f"   Content-Type: {response.headers.get('Content-Type', 'Not set')}")
                print(f"   Content-Length: {len(response.content)} bytes")
            else:
                print(f"❌ {css_file}: FAILED ({response.status_code})")
                print(f"   Response: {response.text[:100]}...")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ {css_file}: ERROR - {e}")
        
        print()

if __name__ == '__main__':
    print("⚠️  IMPORTANT: Update the base_url variable with your actual domain/IP")
    print("Example: base_url = 'http://your-vps-ip.com' or 'http://yourdomain.com'")
    print()
    test_css_access()
