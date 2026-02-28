# =======================================
# NALDOGAS FRONTEND - Dockerfile
# React 19 + Vite + Tailwind CSS 4
# =======================================

FROM node:22-alpine

# Instalar pnpm
RUN npm install -g pnpm

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml* ./

# Instalar dependências (se existirem)
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; fi

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["pnpm", "run", "dev"]
