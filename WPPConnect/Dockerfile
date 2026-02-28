# ========================================
# AVELARSYS - WPPConnect Dockerfile
# ========================================
# Servidor WPPConnect para integração WhatsApp
# Porta: 8003 (conforme PORTS.md)

FROM node:20-slim

# Instalar dependências mínimas do sistema e Chromium
RUN apt-get update && apt-get install -y \
    curl \
    chromium \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Configurar Puppeteer para usar Chromium em modo headless
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Para desenvolvimento, usar puppeteer instalado via npm
# Em produção, instalar Chromium se necessário

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências Node.js
RUN npm install --omit=dev && npm cache clean --force

# Copiar código da aplicação
COPY . .

# Criar diretório para tokens
RUN mkdir -p tokens && chmod 755 tokens

# Criar usuário não-root (opcional)
RUN useradd --create-home --shell /bin/bash wppuser

# Expor porta 8003 (conforme PORTS.md)
EXPOSE 8003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8003/api/health || exit 1

# Comando de inicialização
CMD ["sh", "/app/start.sh"]