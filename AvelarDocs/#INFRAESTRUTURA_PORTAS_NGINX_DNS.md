# 📊 Infraestrutura Completa: Portas, Nginx, DNS e Conexões - AvelarSys

**Versão:** 3.0  
**Última Atualização:** Janeiro 2026  
**Servidor:** vmi2934315.contaboserver.net  
**IP Principal:** 217.216.48.148  

---

## 📋 Sumário Executivo

1. [Regras Fundamentais](#regras-fundamentais)
2. [Informações do Servidor](#informações-do-servidor)
3. [Arquitetura Geral](#arquitetura-geral)
4. [Portas Fixas por Módulo](#portas-fixas-por-módulo)
5. [Nginx em Docker](#nginx-em-docker)
6. [Domínios e DNS](#domínios-e-dns)
7. [Configurações de Sites](#configurações-de-sites)
8. [PHP-FPM e Processos](#phpfpm-e-processos)
9. [Segurança](#segurança)
10. [Troubleshooting](#troubleshooting)

---

## ⚠️ Regras Fundamentais

### 🐳 ARQUITETURA: NGINX EM DOCKER + MÓDULOS SEPARADOS POR PORTA

**IMPORTANTE:** Este projeto utiliza:
- ✅ Nginx **exclusivamente em Docker** para proxy reverso
- ✅ **CADA MÓDULO em uma porta separada** (organização clara)
- ✅ Comunicação entre containers via rede Docker

#### Regras Obrigatórias:

1. ✅ **TODAS as configurações de Nginx devem ser no Docker**
2. ❌ **NÃO usar Nginx instalado na máquina host** (`/etc/nginx/`)
3. ✅ **CADA módulo roda numa porta DIFERENTE e SEPARADA**
4. ✅ **Container Docker:** `avelarsys-nginx`
5. ✅ **Rede Docker:** `avelarsys-network`
6. ✅ **Configurações:** `/home/avelarsys/AvelarSys/nginx/` (montadas no container)
7. ✅ **Toda comunicação entre os containers DEVE ser feita via API ou HTTPS**  
   _(Motivo: No futuro, cada sistema/container poderá ser executado em servidores separados, então a comunicação padronizada por API e HTTPS facilita a migração e garante segurança e interoperabilidade)_

#### Por que Docker + Portas Separadas?

- ✅ Isolamento de configurações
- ✅ Cada módulo independente e facilmente identificável
- ✅ Facilidade de debug e monitoramento
- ✅ Escalabilidade futura sem conflitos
- ✅ Comunicação direta entre containers na rede Docker (usando API/HTTPS para compatibilidade futura)

---

## 📍 Informações do Servidor

### 1.1. Identificação

- **Hostname:** vmi2934315.contaboserver.net
- **IP Público:** 217.216.48.148
- **IPs Internos (Docker):**
  - 172.17.0.1
  - 172.18.0.1
  - 172.19.0.1
  - 172.20.0.1
- **IPv6:** 2605:a142:2293:4315::1

### 1.2. Sistema Operacional

- **OS:** Ubuntu 24.04 (Noble)
- **Kernel:** Linux 6.8.0-90-generic

### 1.3. Serviços Principais

**Docker Containers:**
- **Nginx:** `avelarsys-nginx` (Docker) - Versão 1.29.4
- **AppPortal:** `avelarsys-app-portal` (Next.js - porta 3000)
- **AvAdmin Frontend:** `avelarsys-avadmin-frontend` (Next.js - porta 3001)
- **StockTech Frontend:** `avelarsys-stocktech-frontend` (Vite/React - porta 3002)
- **AxCellOS Frontend:** `avelarsys-axcellos-frontend` (Vite/React - porta 3003)
<!-- AQUI ADICIONE NOVOS FRONTENDS NAS PRÓXIMAS PORTAS (3004, 3005...) EM ORDEM CRESCENTE -->

- **AvAdmin Backend:** `avelarsys-avadmin-backend` (FastAPI - porta 8000)
- **StockTech Backend:** `avelarsys-stocktech-backend` (Express/tRPC - porta 8001)
- **WPPConnect:** `avelarsys-wppconnect` (Node.js - porta 8002)
- **AxCellOS Backend:** `avelarsys-axcellos-backend` (Express/tRPC - porta 8003)
<!-- AQUI ADICIONE NOVOS BACKENDS NAS PRÓXIMAS PORTAS (8004, 8005...) EM ORDEM CRESCENTE -->

**Serviços no Host:**
- **PostgreSQL:** Múltiplas instâncias (Supabase Local - porta 5433)
- **Node.js:** Múltiplas versões (para desenvolvimento local)

---

## 🏗️ Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET (Usuário)                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              NGINX REVERSE PROXY (Docker)                       │
│        Portas: 80 (HTTP) / 443 (HTTPS)                          │
│        Container: avelarsys-nginx                               │
└─────────────────────────────────────────────────────────────────┘
           ↓                  ↓                  ↓
   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
   │   FRONTENDS     │ │    BACKENDS     │ │   LEGADO (PHP)  │
   │ (3000-3999)     │ │  (8000-8999)    │ │   (9000 TCP)    │
   ├─────────────────┤ ├─────────────────┤ ├─────────────────┤
   │ AppPortal: 3000 │ │AvAdmin: 8000    │ │ AxCell-OS       │
   │ AvAdmin: 3001   │ │StockTech: 8001  │ │ (AT/IV/PP)      │
   │ StockTech: 3002 │ │WPPConnect: 8002 │ │ PHPMyAdmin      │
   └─────────────────┘ └─────────────────┘ └─────────────────┘
           ↓                  ↓                    ↓
   ┌─────────────────────────────────────────────────────┐
   │         BANCO DE DADOS (SEPARADO)                   │
   ├─────────────────────────────────────────────────────┤
   │ Supabase Local (PostgreSQL): 5433                   │
   │ NEON Cloud (PostgreSQL): Nuvem                      │
   └─────────────────────────────────────────────────────┘
```

---

## 🔌 Portas Fixas por Módulo

### PADRONIZAÇÃO:  
**Frontends:** Sempre nas portas de 3000 até 3999, em ordem crescente (ex: 3000, 3001, 3002, ...).  
**Backends:** Sempre nas portas de 8000 até 8999, em ordem crescente (ex: 8000, 8001, 8002, ...).  
Ao criar um novo módulo, utilize a próxima porta livre dentro do intervalo correspondente, mantendo a sequência numérica.

> **Como adicionar novos módulos:**  
> - Para frontends, utilize a próxima porta disponível a partir de 3000 (ex: se 3002 já está ocupado, utilize 3003 para o próximo módulo frontend).
> - Para backends, utilize a próxima porta disponível a partir de 8000 (ex: se 8002 já está ocupado, utilize 8003 para o próximo módulo backend).
> - Mantenha a lista sempre em ordem numérica para facilitar documentação, troubleshooting e automação!

#### Frontends (Portas 3000-3999)

| Módulo                | Porta Externa | Porta Interna | Framework   | Domínio                         | Status   |
|-----------------------|---------------|---------------|-------------|----------------------------------|----------|
| **AppPortal**         | 3000          | 3000          | Next.js     | app.avelarcompany.com.br        | ✅ Ativo |
| **AvAdmin Frontend**  | 3001          | 3000          | Next.js     | avadmin.avelarcompany.com.br    | ✅ Ativo |
| **StockTech Frontend**| 3002          | 3000          | Vite/React  | stocktech.avelarcompany.com.br  | ✅ Ativo |
| **AxCellOS Frontend** | 3004          | 3000          | Vite/React  | axcellos.avelarcompany.com.br   | ✅ Ativo |
| _Novo Frontend..._    | 3005+         | ...           | ...         | ...                             | 🔲 Livre |

#### Backends (Portas 8000-8999)

| Módulo                | Porta Externa | Porta Interna | Framework     | Endpoint | Status   |
|-----------------------|---------------|---------------|-------------- |----------|----------|
| **AvAdmin Backend**   | 8000          | 8000          | FastAPI/Django| /api     | ✅ Ativo |
| **StockTech Backend** | 8001          | 3000          | Express/tRPC  | /api     | ✅ Ativo |
| **WPPConnect**        | 8002          | 8003          | Node.js       | /api     | ✅ Ativo |
| **AxCellOS Backend**  | 8004          | 8004          | Express/tRPC  | /trpc    | ✅ Ativo |
| _Novo Backend..._     | 8005+         | ...           | ...           | ...      | 🔲 Livre |

#### Infraestrutura (Portas Fixas)

| Serviço       | Porta | Protocolo | Descrição               | Status   |
|---------------|-------|-----------|-------------------------|----------|
| **Nginx HTTP**| 80    | TCP       | Redireciona para HTTPS  | ✅ Ativo |
| **Nginx HTTPS**| 443  | TCP       | SSL/TLS Proxy           | ✅ Ativo |

#### Bancos de Dados (Portas de Acesso)

| Serviço                | Porta | Protocolo | Ambiente  | Acesso   | Status   |
|------------------------|-------|-----------|-----------|----------|----------|
| **PostgreSQL (Supabase)** | 5433 | TCP      | Host      | Público  | ✅ Ativo |
| **PostgreSQL (NEON)**     | 443  | HTTPS    | Nuvem     | Internet | ✅ Ativo |


---

## 🐳 Nginx em Docker

### 2.1. Container Docker

#### Informações do Container

- **Container:** `avelarsys-nginx`
- **Imagem:** `avelarsys-nginx` (customizada)
- **Rede:** `avelarsys-network`
- **Portas Expostas:**
  - `80:80` (HTTP)
  - `443:443` (HTTPS)
- **Status:** ✅ Rodando e saudável

#### Arquivos de Configuração (Host → Container)

**Localização no Host:** `/home/avelarsys/AvelarSys/nginx/`  
**Montado em:** `/etc/nginx/conf.d/` (dentro do container)


#### Configuração Principal

- **Arquivo no Container:** `/etc/nginx/nginx.conf`
- **User:** nginx
- **Worker Processes:** auto
- **Worker Connections:** 768
- **Include:** `/etc/nginx/conf.d/*.conf` (todos os arquivos acima são carregados automaticamente)

#### Comunicação com Containers

**IMPORTANTE:** O Nginx Docker se comunica com outros containers usando os **nomes dos containers** na rede Docker, **NÃO** `127.0.0.1`.

**Exemplo:**
```nginx
upstream app_portal {
    server avelarsys-app-portal:3000;  # ✅ Correto (nome do container)
    # server 127.0.0.1:3000;            # ❌ ERRADO (não funciona)
}
```

**Containers na Rede:**
- `avelarsys-app-portal:3000` - AppPortal
- `avelarsys-avadmin-frontend:3000` - AvAdmin Frontend
- `avelarsys-avadmin-backend:8000` - AvAdmin Backend
- `avelarsys-stocktech-frontend:3000` - StockTech Frontend
- `avelarsys-stocktech-backend:3000` - StockTech Backend 
- `avelarsys-wppconnect:8003` - WPPConnect
- `avelarsys-axcellos-frontend:3000` - AxCellOS Frontend
- `avelarsys-axcellos-backend:8003` - AxCellOS Backend

#### Comandos Essenciais do Nginx Docker

```bash
# Testar configuração
docker exec avelarsys-nginx nginx -t

# Recarregar configuração (sem downtime)
docker exec avelarsys-nginx nginx -s reload

# Reiniciar container Nginx
docker restart avelarsys-nginx

# Ver logs de erro
docker logs avelarsys-nginx --tail 50
docker exec avelarsys-nginx tail -f /var/log/nginx/error.log

# Ver logs de acesso
docker exec avelarsys-nginx tail -f /var/log/nginx/access.log

# Ver configuração dentro do container
docker exec avelarsys-nginx cat /etc/nginx/nginx.conf
docker exec avelarsys-nginx ls -la /etc/nginx/conf.d/
```

---

## 🌐 Domínios e DNS

### 3.1. Domínios Configurados

#### AxCell-OS Legado (ax.avelarcompany.com.br)
- **Domínio Principal:** `ax.avelarcompany.com.br`
- **WWW:** `www.ax.avelarcompany.com.br`
- **DNS Resolvido:** Cloudflare (Proxied)
- **IP Real:** 217.216.48.148
- **Backend:** PHP-FPM 8.2 (porta 9000 TCP)
- **Status:** ⚠️ Legado

#### AxCellOS Novo (axcellos.avelarcompany.com.br)
- **Domínio:** `axcellos.avelarcompany.com.br`
- **SSL:** ✅ Let's Encrypt
- **Frontend:** Porta 3003 (Docker)
- **Backend:** Porta 8003 (Docker)
- **Status:** ✅ Ativo 


#### Supabase (banco.avelarcompany.dev.br)
- **Domínio:** `banco.avelarcompany.dev.br`
- **IP Real:** 217.216.48.148
- **Backend:** Supabase Kong Gateway (porta 8001)

#### StockTech (stocktech.avelarcompany.com.br)
- **Domínio:** `stocktech.avelarcompany.com.br`
- **SSL:** ✅ Let's Encrypt
- **Frontend:** Porta 3002 (Docker)
- **Backend:** Porta 8002 (Docker)

#### AppPortal (app.avelarcompany.com.br)
- **Domínio:** `app.avelarcompany.com.br`
- **SSL:** ✅ Let's Encrypt
- **Frontend:** Porta 3000 (Docker)

#### AvAdmin (avadmin.avelarcompany.com.br)
- **Domínio:** `avadmin.avelarcompany.com.br`
- **SSL:** ✅ Let's Encrypt
- **Frontend:** Porta 3001 (Docker)
- **Backend:** Porta 8000 (Docker)

#### WPPConnect (wppc.avelarcompany.dev.br)
- **Domínio:** `wppc.avelarcompany.dev.br`
- **Backend:** Porta 8003 (Docker)

### 3.2. Configuração DNS no Cloudflare

**Para configurar DNS no Cloudflare:**

1. Acesse: https://dash.cloudflare.com
2. Selecione o domínio `avelarcompany.com.br` ou `avelarcompany.dev.br`
3. Vá em **DNS** → **Records**
4. Adicione/Edite os registros:

```
Tipo    Nome                    Conteúdo           Proxy
A       ax                     217.216.48.148     ✅ (Proxied)
A       www.ax                 217.216.48.148     ✅ (Proxied)
A       axcellos               217.216.48.148     ✅ (Proxied)
A       stocktech              217.216.48.148     ✅ (Proxied)
A       app                    217.216.48.148     ✅ (Proxied)
A       avadmin                217.216.48.148     ✅ (Proxied)
A       axbanco                217.216.48.148     ❌ (DNS only)
A       banco                  217.216.48.148     ❌ (DNS only)
A       wppc                   217.216.48.148     ❌ (DNS only)
```

---

## ⚙️ Configurações de Sites

### 4.1. AxCell-OS (ax.avelarcompany.com.br)

- **Porta:** 80 HTTP / 443 HTTPS
- **Root:** `/home/avelarsys/AxcellOs`
- **Index:** `index.php index.html`
- **Backend:** PHP-FPM 8.2 (porta 9000 TCP)
- **Timeout:** 600 segundos
- **Client Max Body Size:** 64M

**Sistemas Servidos:**
- `/AT/` → `/home/avelarsys/AxcellOs/AT/`
- `/IV/` → `/home/avelarsys/AxcellOs/IV/`
- `/PP/` → `/home/avelarsys/AxcellOs/PP/`

### 4.2. StockTech (stocktech.avelarcompany.com.br)

- **Porta:** 80 HTTP / 443 HTTPS (SSL)
- **Frontend:** Docker `avelarsys-stocktech-frontend:3000` → porta 3002
- **Backend:** Docker `avelarsys-stocktech-backend:3000` → porta 8002
- **Rede:** `avelarsys-network`

**Rotas:**
- `/` → Frontend (3002)
- `/api/` → Backend (8002)

### 4.3. AppPortal (app.avelarcompany.com.br)

- **Porta:** 80 HTTP / 443 HTTPS (SSL)
- **Container:** `avelarsys-app-portal:3000` → porta 3000
- **Framework:** Next.js
- **Rede:** `avelarsys-network`

### 4.4. AvAdmin (avadmin.avelarcompany.com.br)

- **Porta:** 80 HTTP / 443 HTTPS (SSL)
- **Frontend:** `avelarsys-avadmin-frontend:3000` → porta 3001
- **Backend:** `avelarsys-avadmin-backend:8000` → porta 8000
- **Rede:** `avelarsys-network`

**Rotas:**
- `/` → Frontend (3001)
- `/api/` → Backend (8000)

### 4.5. WPPConnect (wppc.avelarcompany.dev.br)

- **Porta:** 8003 (Docker)
- **Container:** `avelarsys-wppconnect:8003`
- **API:** `/api/`

---

## 💾 PHP-FPM e Processos

### 5.1. PHP-FPM 8.2

- **Configuração:** `/etc/php/8.2/fpm/pool.d/www.conf`
- **Listen:** `0.0.0.0:9000` (TCP para Docker)
- **Owner:** www-data:www-data
- **Status:** ✅ Ativo e rodando

**Comandos Úteis:**
```bash
# Ver status
sudo systemctl status php8.2-fpm

# Reiniciar
sudo systemctl restart php8.2-fpm

# Ver logs
sudo tail -f /var/log/php8.2-fpm.log
```

---

## 🔒 Segurança

### 6.1. Portas Expostas Publicamente

- ✅ **80, 443:** HTTP/HTTPS (necessário)
- ✅ **22:** SSH (necessário)
- ⚠️ **3000, 3001, 3002:** Node.js (expostas, mas protegidas por Nginx)
- ⚠️ **8000, 8002, 8003:** Backend (expostas, mas protegidas por Nginx)
- ⚠️ **5433:** PostgreSQL (exposta - verificar firewall)

### 6.2. Portas Protegidas (localhost apenas)

- ✅ **3306:** MySQL (apenas 127.0.0.1)
- ✅ **5432:** PostgreSQL (apenas 127.0.0.1)
- ✅ **9000:** PHP-FPM (TCP local)

### 6.3. Recomendações de Segurança

1. Fechar portas 5433 com firewall ou restringir a IPs
2. Configurar UFW para bloquear portas desnecessárias
3. Todos os domínios devem usar HTTPS
4. Configurar backups automáticos do MySQL

---

## 🔧 Troubleshooting

### 7.1. Verificar Status

```bash
# Status de todos os containers
docker ps | grep avelar

# Status do Nginx Docker
docker exec avelarsys-nginx nginx -t

# Verificar portas em uso
netstat -tuln | grep LISTEN

# Verificar conectividade Nginx → Containers
docker exec avelarsys-nginx ping -c 2 avelarsys-app-portal
docker exec avelarsys-nginx ping -c 2 avelarsys-stocktech-backend
```

### 7.2. Problemas Comuns

#### 502 Bad Gateway
```bash
# Verificar se container está rodando
docker ps | grep app-portal

# Verificar logs Nginx
docker logs avelarsys-nginx --tail 50

# Testar conexão
docker exec avelarsys-nginx ping -c 2 avelarsys-app-portal
```

#### Porta em Uso
```bash
# Ver qual processo usa a porta
lsof -i :3000
lsof -i :8002

# Liberar porta
kill -9 <PID>
```

#### DNS não resolve
```bash
# Testar com IP direto
curl -I http://217.216.48.148 -H "Host: dominio.com.br"

# Verificar Cloudflare
dig ax.avelarcompany.com.br
```

### 7.3. Processo de Atualização Nginx

1. Editar arquivo em `/home/avelarsys/AvelarSys/nginx/<arquivo>.conf`
2. Testar: `docker exec avelarsys-nginx nginx -t`
3. Recarregar: `docker exec avelarsys-nginx nginx -s reload`
4. Verificar: `curl -I https://<dominio>`

---

## 📝 Checklist de Manutenção

- [ ] Testar configuração Nginx: `docker exec avelarsys-nginx nginx -t`
- [ ] Recarregar Nginx: `docker exec avelarsys-nginx nginx -s reload`
- [ ] Verificar logs: `docker logs avelarsys-nginx --tail 50`
- [ ] Verificar containers: `docker ps | grep avelar`
- [ ] Testar conectividade: `docker exec avelarsys-nginx ping -c 2 <container>`
- [ ] Verificar portas: `netstat -tuln | grep LISTEN`

---

## 🚀 URLs de Acesso

### Desenvolvimento (Local)
```bash
# Frontends
http://localhost:3000  # AppPortal
http://localhost:3001  # AvAdmin Frontend
http://localhost:3002  # StockTech Frontend
http://localhost:3004  # AxCellOS Frontend

# Backends
http://localhost:8000  # AvAdmin Backend
http://localhost:8001  # StockTech Backend
http://localhost:8002  # WPPConnect
http://localhost:8004  # AxCellOS Backend
```

### Produção (Domínios com SSL)
```bash
https://app.avelarcompany.com.br          # AppPortal
https://avadmin.avelarcompany.com.br      # AvAdmin
https://stocktech.avelarcompany.com.br    # StockTech
https://axcellos.avelarcompany.com.br     # AxCellOS (Novo)
https://ax.avelarcompany.com.br/          # AxCell-OS (Legado PHP)
https://axbanco.avelarcompany.dev.br/     # PHPMyAdmin
https://banco.avelarcompany.dev.br/       # Supabase
https://wppc.avelarcompany.dev.br/        # WPPConnect
```

---

## 📝 NOTAS FINAIS

### ⚠️ REGRAS OBRIGATÓRIAS

1. **CADA MÓDULO TEM PORTA SEPARADA** - Frontends 3000-3009, Backends 8000-8009
2. **SEMPRE use Nginx em Docker** - Nunca instale Nginx no host
3. **SEMPRE use nomes de containers** - Configure upstreams com nomes, não IPs
4. **SEMPRE edite no host** - Edite em `/home/avelarsys/AvelarSys/nginx/` e recarregue
5. **SEMPRE teste antes** - Use `docker exec avelarsys-nginx nginx -t`
6. **SEMPRE documente mudanças** - Atualize este documento

---

**Desenvolvido para:** AvelarSys  
**Última Atualização:** Janeiro 2026  
**Versão do Documento:** 3.0  
**Arquitetura:** Nginx em Docker + Módulos Separados por Porta
