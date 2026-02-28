#!/usr/bin/env bash
# Cria repositórios privados no GitHub para cada subsistema da AvelarSys.
#
# Uso:
#   1) Com GitHub CLI (após gh auth login):
#      ./criar-repos-github.sh
#   2) Com token (sem login interativo):
#      export GH_TOKEN=ghp_xxxx   # ou GITHUB_TOKEN
#      ./criar-repos-github.sh
#
# Token: GitHub → Settings → Developer settings → Personal access tokens
#        (scope: repo)

set -e
REPOS=(
  AppPortal
  AvAdmin
  AvelarAssets
  AvelarMonitor
  AxCellOS
  MpasES
  NaldoGas
  PocaPrevisoes
  StockTech
  TurboZap
  WPPConnect
  nginx
  backups
  scripts
)

TOKEN="${GH_TOKEN:-$GITHUB_TOKEN}"
if [[ -z "$TOKEN" ]]; then
  if ! gh auth status &>/dev/null; then
    echo "Erro: faça login no GitHub primeiro:"
    echo "  gh auth login"
    echo "ou defina um token:"
    echo "  export GH_TOKEN=ghp_seu_token"
    echo "  ./criar-repos-github.sh"
    exit 1
  fi
fi

# Com token, obter login do usuário
if [[ -n "$TOKEN" ]]; then
  GITHUB_USER=$(curl -sS -H "Authorization: Bearer $TOKEN" https://api.github.com/user | grep -o '"login": *"[^"]*"' | head -1 | cut -d'"' -f4)
  [[ -z "$GITHUB_USER" ]] && { echo "Erro: token inválido ou sem permissão."; exit 1; }
fi

echo "=== Criando ${#REPOS[@]} repositórios privados no GitHub ==="
for repo in "${REPOS[@]}"; do
  if [[ -n "$TOKEN" ]]; then
    # Via API (curl)
    if curl -sS -H "Authorization: Bearer $TOKEN" "https://api.github.com/repos/$GITHUB_USER/$repo" | grep -q '"full_name"'; then
      echo "[SKIP] $repo — já existe"
    else
      if curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
        https://api.github.com/user/repos -d "{\"name\":\"$repo\",\"private\":true,\"description\":\"Subsistema AvelarSys: $repo\"}" >/dev/null 2>&1; then
        echo "[OK] $repo criado"
      else
        echo "[ERRO] $repo — falha ao criar (verifique o token)"
      fi
    fi
  else
    # Via gh
    if gh repo view "$repo" --json name &>/dev/null; then
      echo "[SKIP] $repo — já existe"
    else
      gh repo create "$repo" --private --description "Subsistema AvelarSys: $repo" && echo "[OK] $repo criado"
    fi
  fi
done
echo "=== Concluído ==="
