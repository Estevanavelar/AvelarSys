# ========================================
# NGINX - Proxy Reverso para AvelarSys
# ========================================

FROM nginx:alpine

# Install additional packages
RUN apk add --no-cache \
    curl \
    openssl \
    && rm -rf /var/cache/apk/*

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create SSL directory (for Cloudflare certificates)
RUN mkdir -p /etc/ssl/certs /etc/ssl/private

# Generate self-signed certificates (will be replaced with Cloudflare's)
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/cloudflare.key \
    -out /etc/ssl/certs/cloudflare.pem \
    -subj "/C=BR/ST=SP/L=SaoPaulo/O=AvelarSys/CN=*.avelarcompany.com.br"

# Set permissions
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/ssl/private /etc/ssl/certs
RUN chmod 600 /etc/ssl/private/cloudflare.key
RUN chmod 644 /etc/ssl/certs/cloudflare.pem

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose ports
EXPOSE 80 443

# Run nginx
CMD ["nginx", "-g", "daemon off;"]