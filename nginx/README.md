# Nginx Configuration for Satsang

This directory contains nginx configuration files for hosting satsang.rraasi.com.

## SSL Certificate Setup

1. **Extract SSL certificates** from the zip file:
   ```bash
   cd /etc/nginx/ssl/
   sudo mkdir -p satsang.rraasi.com
   cd satsang.rraasi.com
   sudo unzip /path/to/satsang/satsangapp/ssl_2nov/satsang.rraasi.com.zip
   ```

2. **Verify certificate files**:
   ```bash
   ls -la /etc/nginx/ssl/satsang.rraasi.com/
   # You should see:
   # - fullchain.pem (or cert.pem)
   # - privkey.pem (or key.pem)
   # - chain.pem (optional)
   ```

3. **Set proper permissions**:
   ```bash
   sudo chmod 644 /etc/nginx/ssl/satsang.rraasi.com/*.pem
   sudo chmod 600 /etc/nginx/ssl/satsang.rraasi.com/privkey.pem
   sudo chown root:root /etc/nginx/ssl/satsang.rraasi.com/*
   ```

## Installation

1. **Copy configuration file** to nginx sites-available:
   ```bash
   sudo cp nginx/satsang.rraasi.com.conf /etc/nginx/sites-available/satsang.rraasi.com.conf
   ```

2. **Create symbolic link** to enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/satsang.rraasi.com.conf /etc/nginx/sites-enabled/satsang.rraasi.com.conf
   ```

3. **Test nginx configuration**:
   ```bash
   sudo nginx -t
   ```

4. **Reload nginx**:
   ```bash
   sudo systemctl reload nginx
   ```

## Configuration Details

- **Domain**: satsang.rraasi.com
- **SSL/HTTPS**: Enabled with SSL certificates
- **HTTP to HTTPS Redirect**: Automatically redirects HTTP traffic to HTTPS
- **Proxy Target**: http://localhost:3000 (Next.js frontend)
- **WebSocket Support**: Configured for LiveKit WebSocket connections
- **Security Headers**: HSTS, X-Frame-Options, X-Content-Type-Options, etc.

## Troubleshooting

### Check nginx status
```bash
sudo systemctl status nginx
```

### View nginx error logs
```bash
sudo tail -f /var/log/nginx/satsang.rraasi.com.error.log
```

### View nginx access logs
```bash
sudo tail -f /var/log/nginx/satsang.rraasi.com.access.log
```

### Test SSL certificate
```bash
openssl s_client -connect satsang.rraasi.com:443 -servername satsang.rraasi.com
```

### Verify frontend is running
```bash
curl http://localhost:3000
```

## Certificate Renewal

If you need to renew SSL certificates:

1. Replace the certificate files in `/etc/nginx/ssl/satsang.rraasi.com/`
2. Test the configuration: `sudo nginx -t`
3. Reload nginx: `sudo systemctl reload nginx`

## Notes

- Make sure the Next.js frontend is running on port 3000 before accessing the site
- The configuration includes extended timeouts for WebSocket connections (LiveKit)
- All HTTP traffic is automatically redirected to HTTPS
- Security headers are included for better protection

