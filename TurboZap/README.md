# TurboZap

**Disparador de Mensagens WhatsApp em Massa**

Sistema completo para envio de mensagens WhatsApp via WPPConnect, com controle de taxa, delays aleatórios e gestão de campanhas.

## 🚀 Funcionalidades

- 📤 **Upload CSV/VCF**: Importe contatos via arquivo CSV ou vCard (.vcf)
- 💬 **Templates**: Mensagens com variáveis personalizáveis
- ⏱️ **Delay Configurável**: Entre mensagens (aleatório entre min-max)
- 🚦 **Rate Limiting**: Controle de mensagens por hora/segundo
- 🔄 **Retry Automático**: Tentativas em caso de falha
- 📊 **Painel Web**: Interface completa para gestão
- 🗄️ **SQLite Temporário**: Banco limpo após conclusão
- ⚡ **Multi-instância**: Fallback entre 3 instâncias WPPConnect

## 📁 Estrutura

```
TurboZap/
├── app/
│   ├── main.py          # FastAPI + WebSocket
│   ├── models.py        # Modelos Pydantic
│   ├── config.py        # Configurações
│   ├── database.py      # SQLite async
│   ├── csv_reader.py    # Parser CSV
│   ├── api.py           # Cliente WPPConnect
│   └── sender.py        # Lógica de envio
├── templates/           # HTML Jinja2
├── static/             # CSS/JS
├── docker-compose.yml
└── requirements.txt
```

## 🐳 Instalação

```bash
# Clonar e entrar no diretório
cd /home/avelarsys/AvelarSys/TurboZap

# Subir containers
docker-compose up -d

# Verificar logs
docker-compose logs -f turbozap
```

## ⚙️ Configuração

Edite `config.yaml`:

```yaml
rate_limits:
  max_per_hour: 50
  max_per_second: 1

delay:
  min: 5        # segundos
  max: 15       # segundos

retry:
  max_attempts: 3
```

## 📝 Formatos Suportados

### CSV
Arquivo CSV com **apenas a coluna de telefone**:

```csv
telefone
5511999999999
5511888888888
5511777777777
```

Ou com variáveis extras:

```csv
telefone,nome,cidade
5511999999999,João,São Paulo
5511888888888,Maria,Rio de Janeiro
```

### VCF (vCard)
Arquivo de contatos exportado do celular ou Google Contacts:

```vcf
BEGIN:VCARD
VERSION:3.0
FN:João Silva
TEL:+55 11 99999-9999
EMAIL:joao@email.com
ORG:Empresa XYZ
END:VCARD

BEGIN:VCARD
VERSION:3.0
FN:Maria Souza
TEL:+55 11 88888-8888
END:VCARD
```

## 🔌 API Endpoints

### Criar Campanha
```bash
POST /api/campaigns
{
  "name": "Campanha Teste",
  "message_template": "Olá {nome}!",
  "delay_min": 5,
  "delay_max": 15,
  "max_per_hour": 50
}
```

### Upload Contatos
```bash
POST /api/campaigns/{id}/upload
Content-Type: multipart/form-data
file: contatos.csv
```

### Iniciar Campanha
```bash
POST /api/campaigns/{id}/start
```

## 🌐 Acesso

- **Painel**: http://turbozap.avelarcompany.com.br
- **Health**: http://turbozap.avelarcompany.com.br/health
- **API Docs**: http://turbozap.avelarcompany.com.br/docs

## 🔄 Integração WPPConnect

O TurboZap se conecta automaticamente às 3 instâncias:
- `http://avelarsys-wpp:8003`
- `http://avelarsys-wppconnect-2:8004`
- `http://avelarsys-wppconnect-3:8005`

## ⚠️ Limites WhatsApp

- Máximo recomendado: **50 mensagens/hora**
- Delay mínimo: **5 segundos** entre mensagens
- Evite bloqueios: Use delays aleatórios

## 🧹 Limpeza Automática

O banco SQLite é limpo automaticamente 24h após conclusão da campanha (configurável).

## 📄 Licença

Avelar Systems - Uso interno