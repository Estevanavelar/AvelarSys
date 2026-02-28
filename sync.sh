#!/bin/bash
# =====================================================
# AvelarSys - Sincronizar Modulos
# =====================================================
# Roda a qualquer momento. Nao faz commit, nao faz
# push no principal. So sincroniza os repos dos modulos
# com o que ja esta commitado.
#
# Uso:
#   ./sync.sh                (sync todos)
#   ./sync.sh AppPortal      (sync so o AppPortal)
#   ./sync.sh --force        (force sync todos)
# =====================================================

BRANCH="main"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MODULES="AppPortal:remote-appportal
AvAdmin:remote-avadmin
AvelarAssets:remote-avelarassets
AvelarDocs:remote-avelardocs
AvelarMonitor:remote-avelarmonitor
AxCellOS:remote-axcellos
MpasES:remote-mpases
NaldoGas:remote-naldogas
PocaPrevisoes:remote-pocaprevisoes
StockTech:remote-stocktech
TurboZap:remote-turbozap
WPPConnect:remote-wppconnect
backups:remote-backups
scripts:remote-scripts
.agents:remote-agents"

FORCE=false
FILTER=""

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    *) FILTER="$arg" ;;
  esac
done

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  AvelarSys - Sync Modulos            ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

echo "$MODULES" | while IFS=: read -r MODULE REMOTE; do
  if [ -n "$FILTER" ] && [ "$FILTER" != "$MODULE" ]; then
    continue
  fi

  if [ ! -d "$MODULE" ]; then
    echo -e "  ${YELLOW}[SKIP]${NC} $MODULE"
    continue
  fi

  BNAME="split-$(echo "$MODULE" | tr './' '--')"
  echo -ne "  ${BLUE}$MODULE${NC} -> $REMOTE ... "

  if [ "$FORCE" = true ]; then
    git subtree split --prefix="$MODULE" -b "$BNAME" > /dev/null 2>&1
    if git push "$REMOTE" "$BNAME:$BRANCH" --force > /dev/null 2>&1; then
      echo -e "${GREEN}[OK]${NC}"
    else
      echo -e "${RED}[ERRO]${NC}"
    fi
    git branch -D "$BNAME" > /dev/null 2>&1
  else
    if git subtree push --prefix="$MODULE" "$REMOTE" "$BRANCH" > /dev/null 2>&1; then
      echo -e "${GREEN}[OK]${NC}"
    else
      echo -e "${RED}[ERRO]${NC}"
    fi
  fi
done

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}  Sincronizacao finalizada!${NC}"
echo -e "${BLUE}======================================${NC}"
