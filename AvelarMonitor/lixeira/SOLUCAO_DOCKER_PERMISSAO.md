# 🔧 Solução Definitiva - Erro de Permissão Docker

## ❌ Problema
```
Erro: permission denied while trying to connect to the docker API at unix:///var/run/docker.sock
```

## 🔍 Causa Raiz

Quando você adiciona um usuário ao grupo `docker` com `sudo usermod -aG docker $USER`, a mudança **NÃO é aplicada imediatamente** na sessão atual. É necessário:

1. **Fazer logout e login novamente**, OU
2. **Usar `newgrp docker`** para ativar o grupo na sessão atual, OU  
3. **Usar `sg docker -c "comando"`** para executar comandos com o grupo ativo

## ✅ Solução Aplicada

### 1. Usuário Adicionado ao Grupo Docker
```bash
sudo usermod -aG docker avelarsys
```
✅ **Status:** Concluído - usuário está no grupo docker

### 2. Script Wrapper Criado
Foi criado o arquivo `run-with-docker.sh` que garante que o Django sempre execute com acesso ao Docker:

```bash
#!/bin/bash
# Este script usa 'sg docker' para garantir acesso ao Docker
exec sg docker -c "python manage.py runserver 0.0.0.0:8000 $@"
```

### 3. Scripts Atualizados
- ✅ `monitor-service.sh` - Usa o wrapper automaticamente
- ✅ `start-production.sh` - Preparado para usar o wrapper

## 🚀 Como Usar Agora

### Opção 1: Usar o Monitoramento Automático (Recomendado)
```bash
cd /home/avelarsys/AvelarMonitor
./monitor-service.sh
```

O script já usa o wrapper que garante acesso ao Docker.

### Opção 2: Iniciar Manualmente
```bash
cd /home/avelarsys/AvelarMonitor
./run-with-docker.sh
```

### Opção 3: Usar newgrp (Para sessão interativa)
```bash
newgrp docker
cd /home/avelarsys/AvelarMonitor
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

## 🔄 Reiniciar o Servidor

Se o servidor já está rodando e você quer reiniciar com acesso ao Docker:

```bash
cd /home/avelarsys/AvelarMonitor

# Parar servidor atual
./stop-production.sh
# ou
pkill -f "manage.py runserver"

# Aguardar 2 segundos
sleep 2

# Iniciar com o wrapper
./monitor-service.sh
```

## ✅ Verificação

### 1. Verificar se está no grupo docker
```bash
groups
# Deve mostrar: avelarsys sudo users docker
```

### 2. Testar acesso ao Docker
```bash
# Sem sg (pode falhar na sessão atual)
docker ps

# Com sg (sempre funciona)
sg docker -c "docker ps"
```

### 3. Verificar se o servidor está rodando
```bash
ps aux | grep "manage.py runserver" | grep -v grep
```

### 4. Testar a página
Acesse: http://217.216.48.148:8000/docker/

Deve mostrar os containers sem erro de permissão.

## 📝 Notas Importantes

1. **O wrapper é necessário** porque o processo do Django precisa ter o grupo docker ativo desde o início
2. **Não é necessário logout/login** se usar o wrapper `run-with-docker.sh`
3. **O monitoramento automático** já está configurado para usar o wrapper
4. **Se ainda aparecer erro**, verifique os logs:
   ```bash
   tail -f /home/avelarsys/AvelarMonitor/logs/painel.log
   ```

## 🐛 Troubleshooting

### Erro persiste mesmo após aplicar a solução?

1. **Verificar se o wrapper existe:**
   ```bash
   ls -la /home/avelarsys/AvelarMonitor/run-with-docker.sh
   ```

2. **Verificar permissões do wrapper:**
   ```bash
   chmod +x /home/avelarsys/AvelarMonitor/run-with-docker.sh
   ```

3. **Verificar se o Docker está rodando:**
   ```bash
   sudo systemctl status docker
   ```

4. **Verificar permissões do socket:**
   ```bash
   ls -la /var/run/docker.sock
   # Deve mostrar: srw-rw---- 1 root docker
   ```

5. **Reiniciar o Docker (se necessário):**
   ```bash
   sudo systemctl restart docker
   ```

## 📊 Status Atual

- ✅ Usuário `avelarsys` no grupo `docker`
- ✅ Script wrapper `run-with-docker.sh` criado
- ✅ Scripts de inicialização atualizados
- ✅ Servidor configurado para usar o wrapper
- ⚠️ **Ação necessária:** Reiniciar o servidor usando o wrapper

---

**Última atualização:** 18/12/2025  
**Status:** Solução implementada - Aguardando reinício do servidor
