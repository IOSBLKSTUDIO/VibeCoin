#!/bin/bash
#
# VibeCoin Node Installation Script
# Run your own VibeCoin node on Mac or Linux
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/IOSBLKSTUDIO/VibeCoin/master/scripts/install.sh | bash
#
# Or download and run:
#   chmod +x install.sh && ./install.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║   ██╗   ██╗██╗██████╗ ███████╗ ██████╗ ██████╗ ██╗███╗   ██╗     ║"
echo "║   ██║   ██║██║██╔══██╗██╔════╝██╔════╝██╔═══██╗██║████╗  ██║     ║"
echo "║   ██║   ██║██║██████╔╝█████╗  ██║     ██║   ██║██║██╔██╗ ██║     ║"
echo "║   ╚██╗ ██╔╝██║██╔══██╗██╔══╝  ██║     ██║   ██║██║██║╚██╗██║     ║"
echo "║    ╚████╔╝ ██║██████╔╝███████╗╚██████╗╚██████╔╝██║██║ ╚████║     ║"
echo "║     ╚═══╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝     ║"
echo "║                                                                   ║"
echo "║                 Node Installation Script v1.0                     ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${CYAN}Welcome to VibeCoin! Let's set up your node.${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo -e "${RED}Please don't run this script as root.${NC}"
  exit 1
fi

# Installation directory
INSTALL_DIR="$HOME/.vibecoin"
DATA_DIR="$INSTALL_DIR/data"

# Check for Node.js
echo -e "${BLUE}Checking requirements...${NC}"

if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}Node.js not found. Installing...${NC}"

  # Detect OS
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
      brew install node
    else
      echo -e "${RED}Please install Homebrew first: https://brew.sh${NC}"
      exit 1
    fi
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v apt-get &> /dev/null; then
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      sudo apt-get install -y nodejs
    elif command -v dnf &> /dev/null; then
      sudo dnf install -y nodejs
    elif command -v pacman &> /dev/null; then
      sudo pacman -S nodejs npm
    else
      echo -e "${RED}Please install Node.js manually: https://nodejs.org${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Unsupported OS. Please install Node.js manually: https://nodejs.org${NC}"
    exit 1
  fi
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION} found${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
  echo -e "${RED}npm not found. Please reinstall Node.js.${NC}"
  exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm ${NPM_VERSION} found${NC}"

# Create installation directory
echo ""
echo -e "${BLUE}Setting up VibeCoin...${NC}"

mkdir -p "$INSTALL_DIR"
mkdir -p "$DATA_DIR"

cd "$INSTALL_DIR"

# Clone or update repository
if [ -d "$INSTALL_DIR/VibeCoin" ]; then
  echo -e "${YELLOW}Updating existing installation...${NC}"
  cd VibeCoin
  git pull origin master
else
  echo -e "${YELLOW}Downloading VibeCoin...${NC}"
  git clone https://github.com/IOSBLKSTUDIO/VibeCoin.git
  cd VibeCoin
fi

# Install dependencies
echo ""
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Build
echo ""
echo -e "${BLUE}Building VibeCoin...${NC}"
npm run build

# Create start script
echo ""
echo -e "${BLUE}Creating launcher scripts...${NC}"

# Main start script
cat > "$INSTALL_DIR/start-node.sh" << 'SCRIPT'
#!/bin/bash
cd "$HOME/.vibecoin/VibeCoin"
node dist/cli.js --network testnet --data "$HOME/.vibecoin/data" "$@"
SCRIPT
chmod +x "$INSTALL_DIR/start-node.sh"

# Start with mining
cat > "$INSTALL_DIR/start-miner.sh" << 'SCRIPT'
#!/bin/bash
cd "$HOME/.vibecoin/VibeCoin"
node dist/cli.js --network testnet --data "$HOME/.vibecoin/data" --mine --miner new "$@"
SCRIPT
chmod +x "$INSTALL_DIR/start-miner.sh"

# Create symlinks (optional)
if [ -w "/usr/local/bin" ]; then
  ln -sf "$INSTALL_DIR/start-node.sh" /usr/local/bin/vibecoin-node
  ln -sf "$INSTALL_DIR/start-miner.sh" /usr/local/bin/vibecoin-mine
  echo -e "${GREEN}✓ Created commands: vibecoin-node, vibecoin-mine${NC}"
fi

# Success message
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                    Installation Complete!                          ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Your VibeCoin node is ready! Here's how to use it:${NC}"
echo ""
echo -e "${YELLOW}Start a node:${NC}"
echo "  $INSTALL_DIR/start-node.sh"
echo ""
echo -e "${YELLOW}Start a mining node:${NC}"
echo "  $INSTALL_DIR/start-miner.sh"
echo ""
echo -e "${YELLOW}Or if symlinks were created:${NC}"
echo "  vibecoin-node       # Start a regular node"
echo "  vibecoin-mine       # Start a mining node"
echo ""
echo -e "${CYAN}Data is stored in: $DATA_DIR${NC}"
echo ""
echo -e "${PURPLE}Join the network and help decentralize VibeCoin!${NC}"
echo -e "${PURPLE}Every node makes the network stronger.${NC}"
echo ""
echo -e "${BLUE}Learn more: https://github.com/IOSBLKSTUDIO/VibeCoin${NC}"
echo ""
