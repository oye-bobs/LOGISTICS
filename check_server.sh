#!/bin/bash

echo "=== Checking Web Server Configuration ==="
echo ""

# Check if Nginx is running
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
    echo "Nginx config location: /etc/nginx/sites-available/"
    echo "Nginx config location: /etc/nginx/nginx.conf"
else
    echo "❌ Nginx is not running"
fi

echo ""

# Check if Apache is running
if systemctl is-active --quiet apache2; then
    echo "✅ Apache2 is running"
    echo "Apache config location: /etc/apache2/sites-available/"
else
    echo "❌ Apache2 is not running"
fi

echo ""

# Check if Flask app is running
if pgrep -f "python.*app.py" > /dev/null; then
    echo "✅ Flask app is running"
else
    echo "❌ Flask app is not running"
fi

echo ""

# Check current directory structure
echo "=== Current Directory Structure ==="
pwd
ls -la
echo ""
echo "Static folder contents:"
ls -la static/
