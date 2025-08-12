#!/usr/bin/env python3
"""
Test script to verify static file serving
"""
import os
import requests
from flask import Flask

def test_static_files():
    """Test if static files are accessible."""
    app = Flask(__name__)
    
    with app.test_client() as client:
        # Test CSS files
        css_files = [
            '/static/style/style.css',
            '/static/style/vehicle_details_style.css'
        ]
        
        # Test JS files
        js_files = [
            '/static/script/script.js',
            '/static/script/vehicle_details_script.js'
        ]
        
        print("Testing static file accessibility...")
        print("=" * 50)
        
        for css_file in css_files:
            response = client.get(css_file)
            status = "✅ OK" if response.status_code == 200 else "❌ FAILED"
            print(f"{css_file}: {status} ({response.status_code})")
            
        for js_file in js_files:
            response = client.get(js_file)
            status = "✅ OK" if response.status_code == 200 else "❌ FAILED"
            print(f"{js_file}: {status} ({response.status_code})")

if __name__ == '__main__':
    test_static_files()
