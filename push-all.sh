#!/bin/bash
# =====================================================
# AvelarSys - Push Monorepo + Subtree Sync
# =====================================================
# Uso:
#   ./push-all.sh              (push principal + sync todos os modulos)
#   ./push-all.sh --only-main  (push so no repo principal)
#   ./push-all.sh --sync-only  (so sincroniza modulos, sem push principal)
#   ./push-all.sh --force      (force push em todos os modulos)
#   ./push-all.sh AppPortal    (push principal + sync so AppPortal)
#   ./push-all.sh --sync-only AppPortal  (sync so AppPortal, sem push principal)
#   ./push-all.sh --sync-only --force    (force sync todos, sem push principal)
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
SYNC_ONLY=false
ONLY_MAIN=false
FILTER=""

for arg in "$@"; do
  case "$arg" in
    --only-main) ONLY_MAIN=true ;;
    --sync-only) SYNC_ONLY=true ;;
    --force) FORCE=true ;;
    --help)
      echo "Uso:"
      echo "  ./push-all.sh              Push principal + sync todos os modulos"
      echo "  ./push-all.sh --only-main  Push so no repo principal"
      echo "  ./push-all.sh --sync-only  So sincroniza modulos (sem push principal)"
      echo "  ./push-all.sh --force      Force push em todos os modulos"
      echo "  ./push-all.sh NomeModulo   Push principal + sync so esse modulo"
      echo "  ./push-all.sh --sync-only NomeModulo   Sync so esse modulo"
      echo "  ./push-all.sh --sync-only --force      Force sync todos"
      exit 0
      ;;
    *) FILTER="$arg" ;;
  esac
done

echo -e "${BLUE}======================================${NC}"
if [ "$SYNC_ONLY" = true ]; then
  echo -e "${BLUE}  AvelarSys - Sincronizacao Subtree   ${NC}"
else
  echo -e "${BLUE}  AvelarSys - Sincronizacao Completa  ${NC}"
fi
echo -e "${BLUE}======================================${NC}"
echo ""

# Push no repo principal (pula se --sync-only)
if [ "$SYNC_ONLY" = false ]; then
  echo -e "${YELLOW}[1/2] Enviando para o repositorio principal (AvelarSys)...${NC}"
  if git push origin "$BRANCH" 2>&1; then
    echo -e "${GREEN}  OK - AvelarSys atualizado${NC}"
  else
    echo -e "${RED}  ERRO ao enviar para AvelarSys${NC}"
    exit 1
  fi
  echo ""

  if [ "$ONLY_MAIN" = true ]; then
    echo -e "${GREEN}Finalizado (somente repo principal).${NC}"
    exit 0
  fi
fi

# Subtree sync
if [ "$SYNC_ONLY" = true ]; then
  echo -e "${YELLOW}Sincronizando modulos via subtree...${NC}"
else
  echo -e "${YELLOW}[2/2] Sincronizando modulos via subtree...${NC}"
fi
echo ""

SUCCESS=0
FAILED=0
TOTAL=0

echo "$MODULES" | while IFS=: read -r MODULE REMOTE; do
  if [ -n "$FILTER" ] && [ "$FILTER" != "$MODULE" ]; then
    continue
  fi

  if [ ! -d "$MODULE" ]; then
    echo -e "  ${YELLOW}[SKIP]${NC} $MODULE (pasta nao encontrada)"
    continue
  fi

  TOTAL=$((TOTAL + 1))
  BNAME="split-$(echo "$MODULE" | tr './' '--')"
  echo -ne "  ${BLUE}$MODULE${NC} -> $REMOTE ... "

  if [ "$FORCE" = true ]; then
    git subtree split --prefix="$MODULE" -b "$BNAME" > /dev/null 2>&1
    if git push "$REMOTE" "$BNAME:$BRANCH" --force > /dev/null 2>&1; then
      echo -e "${GREEN}[OK] (force)${NC}"
      SUCCESS=$((SUCCESS + 1))
    else
      echo -e "${RED}[ERRO]${NC}"
      FAILED=$((FAILED + 1))
    fi
    git branch -D "$BNAME" > /dev/null 2>&1
  else
    if git subtree push --prefix="$MODULE" "$REMOTE" "$BRANCH" > /dev/null 2>&1; then
      echo -e "${GREEN}[OK]${NC}"
      SUCCESS=$((SUCCESS + 1))
    else
      echo -e "${RED}[ERRO]${NC}"
      FAILED=$((FAILED + 1))
    fi
  fi
done

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "  Sincronizacao finalizada!"
echo -e "${BLUE}======================================${NC}"
