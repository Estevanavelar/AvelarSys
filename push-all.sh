#!/bin/bash
# =====================================================
# AvelarSys - Push Monorepo + Subtree Sync
# =====================================================
# Uso:
#   ./push-all.sh              (push principal + todos os modulos)
#   ./push-all.sh --only-main  (push so no repo principal)
#   ./push-all.sh AppPortal    (push principal + so AppPortal)
#   ./push-all.sh --force      (force push em todos os modulos)
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
    --only-main) ;;
    --force) FORCE=true ;;
    *) FILTER="$arg" ;;
  esac
done

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  AvelarSys - Sincronizacao Completa  ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

echo -e "${YELLOW}[1/2] Enviando para o repositorio principal (AvelarSys)...${NC}"
if git push origin "$BRANCH" 2>&1; then
  echo -e "${GREEN}  OK - AvelarSys atualizado${NC}"
else
  echo -e "${RED}  ERRO ao enviar para AvelarSys${NC}"
  exit 1
fi
echo ""

if [ "$1" = "--only-main" ]; then
  echo -e "${GREEN}Finalizado (somente repo principal).${NC}"
  exit 0
fi

echo -e "${YELLOW}[2/2] Sincronizando modulos via subtree...${NC}"
echo ""

SUCCESS=0
FAILED=0

echo "$MODULES" | while IFS=: read -r MODULE REMOTE; do
  if [ -n "$FILTER" ] && [ "$FILTER" != "$MODULE" ]; then
    continue
  fi

  if [ ! -d "$MODULE" ]; then
    echo -e "  ${YELLOW}[SKIP]${NC} $MODULE (pasta nao encontrada)"
    continue
  fi

  BNAME="split-$(echo "$MODULE" | tr './' '--')"
  echo -ne "  ${BLUE}$MODULE${NC} -> $REMOTE ... "

  if [ "$FORCE" = true ]; then
    git subtree split --prefix="$MODULE" -b "$BNAME" > /dev/null 2>&1
    if git push "$REMOTE" "$BNAME:$BRANCH" --force > /dev/null 2>&1; then
      echo -e "${GREEN}[OK] (force)${NC}"
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
echo -e "  Sincronizacao finalizada!"
echo -e "${BLUE}======================================${NC}"
