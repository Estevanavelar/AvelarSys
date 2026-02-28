#!/usr/bin/env bash
# Envia o conteúdo de cada pasta de subsistema para o repositório privado correspondente no GitHub.
# Usa git -C para garantir que cada pasta seja tratada como repo independente.
#
# Uso: GH_TOKEN=ghp_xxx ./push-subsistemas-para-repos.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AVELARSYS="$(cd "$SCRIPT_DIR/.." && pwd)"
GITHUB_USER="${GITHUB_USER:-Estevanavelar}"
TOKEN="${GH_TOKEN:-$GITHUB_TOKEN}"

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

if [[ -z "$TOKEN" ]]; then
  echo "Erro: defina GH_TOKEN ou GITHUB_TOKEN."
  exit 1
fi

REMOTE_URL="https://${TOKEN}@github.com/${GITHUB_USER}/"

echo "=== Enviando conteúdo de cada subsistema para o GitHub ==="
for repo in "${REPOS[@]}"; do
  dir="$AVELARSYS/$repo"
  if [[ ! -d "$dir" ]]; then
    echo "[SKIP] $repo — pasta não encontrada"
    continue
  fi
  echo "--- $repo ---"
  if [[ ! -d "$dir/.git" ]]; then
    git -C "$dir" init -q
  fi
  git -C "$dir" remote remove origin 2>/dev/null || true
  git -C "$dir" remote add origin "${REMOTE_URL}${repo}.git"
  git -C "$dir" add -A
  git -C "$dir" -c user.email="dev@avelarcompany.com" -c user.name="Avelar Dev" commit -m "Initial commit: conteúdo do subsistema $repo" --allow-empty || true
  git -C "$dir" branch -M main 2>/dev/null || true
  if git -C "$dir" rev-parse HEAD &>/dev/null; then
    git -C "$dir" push -u origin main --force 2>&1 || echo "[ERRO] push $repo"
  else
    echo "[SKIP] $repo — sem commits"
  fi
done
echo "=== Concluído ==="
