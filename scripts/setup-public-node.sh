#!/bin/bash
#
# VibeCoin Public Node Setup Script
# Automatise la configuration d'un noeud public accessible sur Internet
#
# Usage: ./scripts/setup-public-node.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                    ║${NC}"
echo -e "${BLUE}║   ██╗   ██╗██╗██████╗ ███████╗ ██████╗ ██████╗ ██╗███╗   ██╗      ║${NC}"
echo -e "${BLUE}║   ██║   ██║██║██╔══██╗██╔════╝██╔════╝██╔═══██╗██║████╗  ██║      ║${NC}"
echo -e "${BLUE}║   ██║   ██║██║██████╔╝█████╗  ██║     ██║   ██║██║██╔██╗ ██║      ║${NC}"
echo -e "${BLUE}║   ╚██╗ ██╔╝██║██╔══██╗██╔══╝  ██║     ██║   ██║██║██║╚██╗██║      ║${NC}"
echo -e "${BLUE}║    ╚████╔╝ ██║██████╔╝███████╗╚██████╗╚██████╔╝██║██║ ╚████║      ║${NC}"
echo -e "${BLUE}║     ╚═══╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝      ║${NC}"
echo -e "${BLUE}║                                                                    ║${NC}"
echo -e "${BLUE}║              PUBLIC NODE SETUP / CONFIGURATION NOEUD PUBLIC       ║${NC}"
echo -e "${BLUE}║                                                                    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running from VibeCoin directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Erreur: Exécutez ce script depuis le dossier VibeCoin${NC}"
    echo "cd /chemin/vers/VibeCoin && ./scripts/setup-public-node.sh"
    exit 1
fi

# Step 1: Check prerequisites
echo -e "${YELLOW}[1/6] Vérification des prérequis...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js n'est pas installé!${NC}"
    echo "Installez-le depuis: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js 18+ requis (vous avez v$NODE_VERSION)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) détecté${NC}"

# Step 2: Install dependencies
echo ""
echo -e "${YELLOW}[2/6] Installation des dépendances...${NC}"
npm install --silent
echo -e "${GREEN}✓ Dépendances installées${NC}"

# Step 3: Build the project
echo ""
echo -e "${YELLOW}[3/6] Compilation du projet...${NC}"
npm run build --silent 2>/dev/null || npm run build
echo -e "${GREEN}✓ Projet compilé${NC}"

# Step 4: Get public IP
echo ""
echo -e "${YELLOW}[4/6] Détection de votre IP publique...${NC}"
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s api.ipify.org 2>/dev/null || echo "non-detectee")

if [ "$PUBLIC_IP" = "non-detectee" ]; then
    echo -e "${RED}Impossible de détecter l'IP publique${NC}"
    echo "Vérifiez votre connexion Internet"
else
    echo -e "${GREEN}✓ IP publique: $PUBLIC_IP${NC}"
fi

# Step 5: Create or load wallet
echo ""
echo -e "${YELLOW}[5/6] Configuration du wallet...${NC}"

WALLET_FILE="$HOME/.vibecoin/wallet.key"
mkdir -p "$HOME/.vibecoin"

if [ -f "$WALLET_FILE" ]; then
    PRIVATE_KEY=$(cat "$WALLET_FILE")
    echo -e "${GREEN}✓ Wallet existant chargé${NC}"
else
    # Generate a new wallet by running node temporarily
    PRIVATE_KEY=$(node -e "
        const { Wallet } = require('./dist/wallet/Wallet');
        const w = new Wallet();
        console.log(w.getPrivateKey());
    " 2>/dev/null)

    if [ -z "$PRIVATE_KEY" ]; then
        echo -e "${RED}Erreur lors de la création du wallet${NC}"
        exit 1
    fi

    echo "$PRIVATE_KEY" > "$WALLET_FILE"
    chmod 600 "$WALLET_FILE"
    echo -e "${GREEN}✓ Nouveau wallet créé et sauvegardé${NC}"
fi

# Get public key
PUBLIC_KEY=$(node -e "
    const { Wallet } = require('./dist/wallet/Wallet');
    const w = new Wallet('$PRIVATE_KEY');
    console.log(w.publicKey.substring(0, 32) + '...');
" 2>/dev/null)

echo -e "${BLUE}  Adresse: $PUBLIC_KEY${NC}"

# Step 6: Show configuration
echo ""
echo -e "${YELLOW}[6/6] Configuration terminée!${NC}"
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    VOTRE NOEUD EST PRET!                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create launch script
cat > "$HOME/.vibecoin/start-node.sh" << EOF
#!/bin/bash
cd "$(pwd)"
export MINER_PRIVATE_KEY="$PRIVATE_KEY"
node dist/cli.js --mine --miner "$PRIVATE_KEY" --network testnet --external-address "$PUBLIC_IP:6001"
EOF
chmod +x "$HOME/.vibecoin/start-node.sh"

echo -e "${BLUE}Pour lancer votre noeud:${NC}"
echo ""
echo -e "  ${GREEN}./scripts/start-node.sh${NC}"
echo ""
echo -e "  ou:"
echo ""
echo -e "  ${GREEN}~/.vibecoin/start-node.sh${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT - Ouvrir le port 6001:${NC}"
echo ""
echo "  1. Allez dans les paramètres de votre box/routeur"
echo "  2. Section 'NAT' ou 'Redirection de ports' ou 'Port Forwarding'"
echo "  3. Ajoutez une règle:"
echo ""
echo -e "     ${GREEN}Port externe: 6001${NC}"
echo -e "     ${GREEN}Port interne: 6001${NC}"
echo -e "     ${GREEN}Protocole: TCP${NC}"
echo -e "     ${GREEN}IP locale: $(hostname -I 2>/dev/null | awk '{print $1}' || echo "votre-ip-locale")${NC}"
echo ""
echo -e "  4. Sauvegardez et testez: ${BLUE}https://canyouseeme.org${NC} (port 6001)"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${RED}SAUVEGARDEZ VOTRE CLE PRIVEE:${NC}"
echo ""
echo -e "  ${YELLOW}$PRIVATE_KEY${NC}"
echo ""
echo "  Stockez-la en lieu sûr (gestionnaire de mots de passe)."
echo "  C'est le SEUL moyen de récupérer vos VIBE!"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""
