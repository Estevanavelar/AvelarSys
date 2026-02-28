# =======================================
# NALDOGAS BACKEND - Dockerfile
# Express + tRPC + PostgreSQL
# =======================================

FROM node:22-alpine

# Instalar pnpm
RUN npm install -g pnpm

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["pnpm", "run", "dev"]
