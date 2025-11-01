# Nginx Configuration for Satsang

This directory contains nginx configuration files for hosting satsang.rraasi.com.

## SSL Certificate Setup

Certificates are located at: `/home/underlitigationcom/satsang/ssl_2nov/`

1. **Extract SSL certificates** (if not already extracted):
   ```bash
   cd /home/underlitigationcom/satsang/ssl_2nov
   unzip satsang.rraasi.com.zip
   ```

2. **Combine certificate and CA bundle** into fullchain.pem:
   ```bash
   cd /home/underlitigationcom/satsang/ssl_2nov
   cat certificate.crt ca_bundle.crt > fullchain.pem
   ```

3. **Verify certificate files**:
   ```bash
   ls -la /home/underlitigationcom/satsang/ssl_2nov/
   # You should see:
   # - fullchain.pem (combined certificate + CA bundle)
   # - certificate.crt
   # - ca_bundle.crt
   # - private.key
   ```

4. **Set proper permissions**:
   ```bash
   chmod 644 /home/underlitigationcom/satsang/ssl_2nov/fullchain.pem
   chmod 600 /home/underlitigationcom/satsang/ssl_2nov/private.key
   # Ensure nginx user can read the files (nginx typically runs as www-data or nginx)
   ```
   
   Or use the automated setup script:
   ```bash
   cd /home/underlitigationcom/satsang
   ./nginx/setup-ssl.sh
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

