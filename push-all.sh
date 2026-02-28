#!/bin/bash
# =====================================================
# AvelarSys - Push Monorepo + Subtree Sync
# =====================================================
# Uso:
#   ./push-all.sh              (push principal + todos os modulos)
#   ./push-all.sh --only-main  (push so no repo principal)
#   ./push-all.sh AppPortal    (push principal + so AppPortal)
# =====================================================

set -e

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

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  AvelarSys - Sincronizacao Completa  ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# 1. Push no repositorio principal
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

# 2. Subtree push para cada modulo
echo -e "${YELLOW}[2/2] Sincronizando modulos via subtree...${NC}"
echo ""

TOTAL=0
SUCCESS=0
FAILED=0
SKIPPED=0

echo "$MODULES" | while IFS=: read -r MODULE REMOTE; do
  if [ -n "$1" ] && [ "$1" != "--only-main" ] && [ "$1" != "$MODULE" ]; then
    continue
  fi

  TOTAL=$((TOTAL + 1))

  if [ ! -d "$MODULE" ]; then
    echo -e "  ${YELLOW}[SKIP]${NC} $MODULE (pasta nao encontrada)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo -ne "  Sincronizando ${BLUE}$MODULE${NC} -> $REMOTE... "

  if git subtree push --prefix="$MODULE" "$REMOTE" "$BRANCH" 2>&1; then
    echo -e "  ${GREEN}[OK]${NC} $MODULE"
    SUCCESS=$((SUCCESS + 1))
  else
    echo -e "  ${RED}[ERRO]${NC} $MODULE"
    FAILED=$((FAILED + 1))
  fi
  echo ""
done

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "  Sincronizacao finalizada!"
echo -e "${BLUE}======================================${NC}"
