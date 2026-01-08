#!/bin/bash
#
# VibeCoin Node Launcher
# Lance le noeud avec la configuration sauvegardée
#
# Usage: ./scripts/start-node.sh [options]
#
# Options:
#   --light     Mode léger (économe en ressources)
#   --no-mine   Désactiver le minage
#

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Find project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_DIR"

# Load saved wallet
WALLET_FILE="$HOME/.vibecoin/wallet.key"

if [ -f "$WALLET_FILE" ]; then
    PRIVATE_KEY=$(cat "$WALLET_FILE")
    echo -e "${GREEN}Wallet chargé depuis $WALLET_FILE${NC}"
else
    echo -e "${YELLOW}Aucun wallet trouvé. Création d'un nouveau...${NC}"
    PRIVATE_KEY="new"
fi

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "")

# Parse arguments
LIGHT_MODE=""
MINE_MODE="--mine"
MINER_ARG="--miner $PRIVATE_KEY"

for arg in "$@"; do
    case $arg in
        --light)
            LIGHT_MODE="--light"
            MINE_MODE=""
            MINER_ARG=""
            ;;
        --no-mine)
            MINE_MODE=""
            MINER_ARG=""
            ;;
    esac
done

# Build command
CMD="node dist/cli.js $LIGHT_MODE $MINE_MODE $MINER_ARG --network testnet"

if [ -n "$PUBLIC_IP" ] && [ -z "$LIGHT_MODE" ]; then
    CMD="$CMD --external-address $PUBLIC_IP:6001"
fi

echo ""
echo -e "${BLUE}Lancement du noeud VibeCoin...${NC}"
echo -e "${BLUE}Commande: $CMD${NC}"
echo ""

# Run
exec $CMD
