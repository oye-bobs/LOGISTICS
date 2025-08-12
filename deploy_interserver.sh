#!/bin/bash

echo "=== Interserver VPS Deployment Script ==="
echo ""

# Get current directory
CURRENT_DIR=$(pwd)
echo "Current directory: $CURRENT_DIR"

# Check if we're in the right directory
if [ ! -f "app.py" ]; then
    echo "❌ Error: app.py not found. Please run this script from your LOGISTICS directory."
    exit 1
fi

echo "✅ Found app.py - we're in the right directory"
echo ""

# Check web server
echo "=== Checking Web Server ==="
if command -v nginx &> /dev/null; then
    echo "✅ Nginx is installed"
    NGINX_INSTALLED=true
else
    echo "❌ Nginx not found"
    NGINX_INSTALLED=false
fi

if command -v apache2 &> /dev/null; then
    echo "✅ Apache2 is installed"
    APACHE_INSTALLED=true
else
    echo "❌ Apache2 not found"
    APACHE_INSTALLED=false
fi

echo ""

# Check if Flask app is running
echo "=== Checking Flask App ==="
if pgrep -f "python.*app.py" > /dev/null; then
    echo "✅ Flask app is running"
    FLASK_RUNNING=true
else
    echo "❌ Flask app is not running"
    FLASK_RUNNING=false
fi

echo ""

# Check static files
echo "=== Checking Static Files ==="
if [ -d "static" ]; then
    echo "✅ Static directory exists"
    ls -la static/
    echo ""
    if [ -f "static/style/style.css" ]; then
        echo "✅ style.css exists"
    else
        echo "❌ style.css not found"
    fi
else
    echo "❌ Static directory not found"
fi

echo ""

# Create Nginx configuration
echo "=== Creating Nginx Configuration ==="
if [ "$NGINX_INSTALLED" = true ]; then
    cat > /tmp/logistics_nginx.conf << EOF
server {
    listen 80;
    server_name _;  # Catch all domains

    # Serve static files directly
    location /static/ {
        alias $CURRENT_DIR/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
        
        # Handle CSS files
        location ~* \.css$ {
            add_header Content-Type text/css;
        }
        
        # Handle JS files
        location ~* \.js$ {
            add_header Content-Type application/javascript;
        }
    }

    # Proxy Flask application
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
    }
}
EOF

    echo "✅ Nginx configuration created at /tmp/logistics_nginx.conf"
    echo "To install it:"
    echo "sudo cp /tmp/logistics_nginx.conf /etc/nginx/sites-available/logistics"
    echo "sudo ln -s /etc/nginx/sites-available/logistics /etc/nginx/sites-enabled/"
    echo "sudo nginx -t"
    echo "sudo systemctl reload nginx"
fi

echo ""

# Create systemd service for Flask app
echo "=== Creating Systemd Service ==="
cat > /tmp/logistics.service << EOF
[Unit]
Description=Logistics Flask App
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$CURRENT_DIR
Environment=PATH=$CURRENT_DIR/venv/bin
ExecStart=$CURRENT_DIR/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Systemd service created at /tmp/logistics.service"
echo "To install it:"
echo "sudo cp /tmp/logistics.service /etc/systemd/system/"
echo "sudo systemctl daemon-reload"
echo "sudo systemctl enable logistics"
echo "sudo systemctl start logistics"

echo ""
echo "=== Next Steps ==="
echo "1. Install the Nginx configuration"
echo "2. Install the systemd service"
echo "3. Test the application"
echo "4. Check browser developer tools for any remaining CSS issues"
