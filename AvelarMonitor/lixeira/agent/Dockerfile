# Imagem base Python (leve)
FROM python:3.11-alpine

# Instalar dependências do sistema
RUN apk add --no-cache gcc musl-dev

WORKDIR /agent

# Copiar requirements do agent
COPY agent/requirements.txt .

# Instalar dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código do agent
COPY agent/agent.py .

# Criar usuário não-root
RUN addgroup -S agent && adduser -S agent -G agent
RUN chown -R agent:agent /agent
USER agent

# Expor porta se necessário
EXPOSE 0

# Comando de inicialização
CMD ["python", "agent.py", "--server", "${SERVER_URL}", "--token", "${AGENT_TOKEN}"]
