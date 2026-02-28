---
name: avelarsys-auto-sync
description: "Automatically commits and syncs the AvelarSys monorepo when the user approves or praises a completed change. Detects approval phrases in Portuguese and English (e.g. 'perfeito', 'otimo', 'gostei', 'isso ai', 'manda ver', 'pode commitar', 'great', 'looks good', 'ship it') and runs git add, commit, push on the main repo plus subtree sync to all module repos. Use when the user confirms, approves, or praises a code change, feature implementation, or bug fix in the AvelarSys project."
---

# AvelarSys Auto Sync

Sincroniza automaticamente o monorepo AvelarSys e todos os repos individuais dos modulos quando o usuario aprova uma alteracao.

## Gatilhos de Ativacao

Ativar quando o usuario usar frases de aprovacao/elogio apos uma alteracao de codigo:

**Portugues:** "perfeito", "otimo", "excelente", "muito bom", "gostei", "ficou bom", "ficou otimo", "isso ai", "isso mesmo", "manda ver", "pode commitar", "pode subir", "sobe isso", "manda pro git", "salva isso", "ta otimo", "aprovado", "show", "beleza", "massa", "top", "bom trabalho", "concordo", "pode fazer", "ta bom", "manda bala"

**Ingles:** "great", "perfect", "looks good", "ship it", "lgtm", "nice", "awesome", "commit this", "push it", "good job", "approved", "well done"

## Pre-Requisitos

- Estar no diretorio `/home/avelarsys/AvelarSys`
- O script `push-all.sh` deve existir na raiz do projeto
- Os remotes dos modulos devem estar configurados (remote-appportal, remote-avadmin, etc.)

## Workflow

### 1. Verificar alteracoes pendentes

```bash
cd /home/avelarsys/AvelarSys && git status --short
```

Se nao houver alteracoes, informar ao usuario e nao fazer nada.

### 2. Gerar mensagem de commit

Analisar o `git diff` para entender o que mudou e gerar uma mensagem de commit no formato convencional:

- `feat:` para novas funcionalidades
- `fix:` para correcoes de bugs
- `chore:` para manutencao, configs, dependencias
- `refactor:` para refatoracoes
- `docs:` para documentacao
- `style:` para formatacao

Sempre em portugues, descritiva e concisa.

### 3. Executar commit e push

```bash
cd /home/avelarsys/AvelarSys
git add .
git commit -m "<mensagem gerada>"
```

### 4. Sincronizar com repos dos modulos

Executar o script de sincronizacao:

```bash
cd /home/avelarsys/AvelarSys && bash push-all.sh
```

### 5. Confirmar ao usuario

Informar:
- Quantos arquivos foram commitados
- A mensagem de commit usada
- Se a sincronizacao dos modulos foi bem-sucedida

## Mapa de Modulos e Remotes

| Modulo | Remote | Repo GitHub |
|--------|--------|-------------|
| AppPortal | remote-appportal | Estevanavelar/AppPortal |
| AvAdmin | remote-avadmin | Estevanavelar/AvAdmin |
| AvelarAssets | remote-avelarassets | Estevanavelar/AvelarAssets |
| AvelarDocs | remote-avelardocs | Estevanavelar/AvelarDocs |
| AvelarMonitor | remote-avelarmonitor | Estevanavelar/AvelarMonitor |
| AxCellOS | remote-axcellos | Estevanavelar/AxCellOS |
| MpasES | remote-mpases | Estevanavelar/MpasES |
| NaldoGas | remote-naldogas | Estevanavelar/NaldoGas |
| PocaPrevisoes | remote-pocaprevisoes | Estevanavelar/PocaPrevisoes |
| StockTech | remote-stocktech | Estevanavelar/StockTech |
| TurboZap | remote-turbozap | Estevanavelar/TurboZap |
| WPPConnect | remote-wppconnect | Estevanavelar/WPPConnect |
| backups | remote-backups | Estevanavelar/backups |
| scripts | remote-scripts | Estevanavelar/scripts |
| .agents | remote-agents | Estevanavelar/.agents |

## Regras Importantes

1. **Nunca commitar arquivos sensíveis**: `.env`, `.env.production`, `ApiKeys.txt`, `env.production`
2. **Sempre verificar o .gitignore** antes de adicionar arquivos
3. **Nao commitar node_modules, venv, __pycache__** ou similares
4. **Se o push falhar**, informar o erro ao usuario e sugerir `--force` se necessario
5. **Sempre usar o diretorio** `/home/avelarsys/AvelarSys` como raiz
