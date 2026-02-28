# 🔧 Correção de Permissões Docker

## Problema
Erro ao acessar Docker: `PermissionError(13, 'Permission denied')`

## Causa
O usuário que executa o Django não está no grupo `docker`, necessário para acessar o socket `/var/run/docker.sock`.

## Solução Aplicada

### 1. Usuário adicionado ao grupo docker
```bash
sudo usermod -aG docker avelarsys
```

### 2. Aplicar as mudanças

**Opção A: Usar newgrp (recomendado - não precisa logout)**
```bash
newgrp docker
```

**Opção B: Logout e Login**
- Faça logout da sessão SSH/terminal
- Faça login novamente

### 3. Reiniciar o servidor Django

Após aplicar a mudança, reinicie o painel:

```bash
cd /home/avelarsys/AvelarMonitor
./stop-production.sh
./start-production.sh
```

Ou se estiver usando o monitoramento automático:
```bash
# O monitoramento reiniciará automaticamente em até 1 minuto
# Ou force a verificação:
./monitor-service.sh
```

## Verificação

Para verificar se está funcionando:

```bash
# Verificar se está no grupo docker
groups

# Testar acesso ao Docker
docker ps

# Se funcionar, o painel também funcionará
```

## Script de Correção

Foi criado o script `fix-docker-permissions.sh` que:
- Verifica se o usuário está no grupo docker
- Adiciona automaticamente se necessário
- Mostra instruções de como aplicar

Execute:
```bash
cd /home/avelarsys/AvelarMonitor
./fix-docker-permissions.sh
```

## Melhorias Implementadas

1. ✅ **Mensagens de erro melhoradas** - Agora mostra instruções claras quando há erro de permissão
2. ✅ **Tratamento de erros** - Detecta especificamente erros de permissão
3. ✅ **Script de correção** - Facilita a resolução do problema

## Status

- ✅ Usuário `avelarsys` adicionado ao grupo `docker`
- ⏳ **Ação necessária**: Aplicar mudança com `newgrp docker` ou logout/login
- ⏳ **Ação necessária**: Reiniciar servidor Django

---

**Data:** 18/12/2025  
**Status:** Aguardando aplicação da mudança e reinício do servidor
