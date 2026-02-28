# Imagem base Python
FROM python:3.11-slim

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código do projeto
COPY . .

# Criar diretórios necessários
RUN mkdir -p /app/logs /app/media /app/staticfiles

# Coletar arquivos estáticos
RUN python manage.py collectstatic --noinput

# Expor portas
EXPOSE 8000

# Comando de inicialização (usando daphne para ASGI/WebSocket)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "painel_control.asgi:application"]
