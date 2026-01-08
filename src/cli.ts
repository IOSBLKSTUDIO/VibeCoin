#!/usr/bin/env node
/**
 * VibeCoin CLI - Command line interface for running a node
 *
 * Run your own VibeCoin node on Mac or PC!
 * Join the decentralized network and help secure VibeCoin.
 */
import { Node, NodeConfig } from './node/Node';
import { LightNode, LightNodeConfig } from './node/LightNode';
import { Wallet } from './wallet/Wallet';
import {
  checkForUpdates,
  performGitUpdate,
  displayUpdateNotification,
  displayCompactUpdateNotification,
  getCurrentVersion,
  isGitRepo,
} from './utils/UpdateChecker';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Wallet storage location
const WALLET_DIR = path.join(os.homedir(), '.vibecoin');
const WALLET_FILE = path.join(WALLET_DIR, 'wallet.key');

/**
 * Load saved wallet from disk
 */
function loadSavedWallet(): Wallet | null {
  try {
    if (fs.existsSync(WALLET_FILE)) {
      const privateKey = fs.readFileSync(WALLET_FILE, 'utf8').trim();
      return new Wallet(privateKey);
    }
  } catch (error) {
    console.error('⚠️  Failed to load saved wallet:', error);
  }
  return null;
}

/**
 * Save wallet to disk
 */
function saveWallet(wallet: Wallet): void {
  try {
    if (!fs.existsSync(WALLET_DIR)) {
      fs.mkdirSync(WALLET_DIR, { recursive: true });
    }
    fs.writeFileSync(WALLET_FILE, wallet.getPrivateKey(), { mode: 0o600 });
    console.log(`💾 Wallet saved to ${WALLET_FILE}`);
  } catch (error) {
    console.error('⚠️  Failed to save wallet:', error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const flags: Record<string, string> = {};

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
    flags[key] = value;
    if (value !== 'true') i++;
  }
}

// Track if a command was handled (to prevent node startup)
let commandHandled = false;

// Update commands
if (flags.update === 'true') {
  commandHandled = true;
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                    VibeCoin Update / Mise à jour                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

  async function runUpdate() {
    console.log(`Current version: v${getCurrentVersion()}`);
    console.log('');

    // Check for updates first
    console.log('Checking for updates...');
    const updateInfo = await checkForUpdates(true);

    if (!updateInfo.updateAvailable) {
      console.log(`
✅ You are already running the latest version (v${updateInfo.currentVersion})
`);
      process.exit(0);
    }

    console.log(`
📦 New version available: v${updateInfo.latestVersion}
`);

    if (!isGitRepo()) {
      console.log(`
⚠️  This is not a git repository.

To update manually:
  1. Download the latest version from GitHub:
     https://github.com/IOSBLKSTUDIO/VibeCoin/releases

  2. Or re-clone the repository:
     git clone https://github.com/IOSBLKSTUDIO/VibeCoin.git
     cd VibeCoin
     npm install && npm run build
`);
      process.exit(1);
    }

    // Perform the update
    const result = await performGitUpdate();

    if (result.success) {
      console.log(`
✅ ${result.message}

You can now restart your node with:
  node dist/cli.js --mine
`);
    } else {
      console.log(`
❌ ${result.message}
`);
      process.exit(1);
    }
  }

  runUpdate();
  // Don't exit here - let the async function handle it
} else if (flags['check-update'] === 'true') {
  commandHandled = true;
  // Just check for updates without installing
  (async function checkUpdate() {
    console.log(`
Checking for VibeCoin updates...
`);

    const updateInfo = await checkForUpdates(true);

    if (updateInfo.updateAvailable) {
      displayUpdateNotification(updateInfo);
    } else {
      console.log(`
✅ VibeCoin is up to date!
   Current version: v${updateInfo.currentVersion}
`);
    }
    process.exit(0);
  })();
} else if (flags.version === 'true' || args.includes('-v')) {
  // Show version
  console.log(`VibeCoin CLI v${getCurrentVersion()}`);
  process.exit(0);
}

// Wallet management commands
else if (flags.wallet) {
  const walletCommand = flags.wallet;

  if (walletCommand === 'show' || walletCommand === 'info') {
    // Show current wallet info
    const wallet = loadSavedWallet();
    if (wallet) {
      console.log(`
🔐 Current Wallet:
   Address:     ${wallet.publicKey}
   Short:       ${wallet.getShortAddress()}
   Saved at:    ${WALLET_FILE}

   💡 Use --wallet export to see your private key
`);
    } else {
      console.log(`
❌ No wallet found at ${WALLET_FILE}

   💡 Run 'node dist/cli.js --mine' to create one automatically
`);
    }
    process.exit(0);
  }

  if (walletCommand === 'export') {
    // Export private key (dangerous!)
    const wallet = loadSavedWallet();
    if (wallet) {
      console.log(`
🔐 Wallet Export:
   Address:     ${wallet.getShortAddress()}
   Private Key: ${wallet.getPrivateKey()}

   ⚠️  NEVER SHARE YOUR PRIVATE KEY!
   Store it somewhere safe (password manager, paper in a safe).
`);
    } else {
      console.log(`❌ No wallet found at ${WALLET_FILE}`);
    }
    process.exit(0);
  }

  if (walletCommand === 'delete') {
    // Delete wallet (with confirmation)
    if (!fs.existsSync(WALLET_FILE)) {
      console.log(`❌ No wallet found at ${WALLET_FILE}`);
      process.exit(0);
    }

    const wallet = loadSavedWallet();
    if (!wallet) {
      console.log(`❌ Failed to load wallet`);
      process.exit(1);
    }

    // Check for --confirm flag
    if (flags.confirm !== 'true') {
      console.log(`
⚠️  WARNING: This will DELETE your wallet!

   Address: ${wallet.getShortAddress()}
   File:    ${WALLET_FILE}

   If you haven't backed up your private key, your VIBE will be LOST FOREVER!

   To confirm deletion, run:
   node dist/cli.js --wallet delete --confirm
`);
      process.exit(0);
    }

    // Actually delete
    try {
      // First show the private key one last time
      console.log(`
🔐 LAST CHANCE - Your private key:
   ${wallet.getPrivateKey()}

   Copy this NOW if you haven't already!
`);

      fs.unlinkSync(WALLET_FILE);
      console.log(`✅ Wallet deleted from ${WALLET_FILE}`);
      console.log(`   A new wallet will be created next time you run --mine`);
    } catch (error) {
      console.error(`❌ Failed to delete wallet:`, error);
      process.exit(1);
    }
    process.exit(0);
  }

  if (walletCommand === 'import') {
    // Import wallet from private key
    const privateKey = flags.key;
    if (!privateKey) {
      console.log(`
❌ Missing private key

   Usage: node dist/cli.js --wallet import --key "your-private-key"
`);
      process.exit(1);
    }

    try {
      const wallet = new Wallet(privateKey);

      // Check if wallet already exists
      if (fs.existsSync(WALLET_FILE)) {
        const existingWallet = loadSavedWallet();
        if (existingWallet && existingWallet.publicKey === wallet.publicKey) {
          console.log(`✅ This wallet is already saved!`);
          process.exit(0);
        }

        if (flags.force !== 'true') {
          console.log(`
⚠️  A wallet already exists!

   Existing: ${existingWallet?.getShortAddress()}
   New:      ${wallet.getShortAddress()}

   To replace it, run:
   node dist/cli.js --wallet import --key "..." --force
`);
          process.exit(0);
        }
      }

      saveWallet(wallet);
      console.log(`
✅ Wallet imported successfully!
   Address: ${wallet.getShortAddress()}
   Saved to: ${WALLET_FILE}
`);
    } catch (error) {
      console.error(`❌ Invalid private key`);
      process.exit(1);
    }
    process.exit(0);
  }

  // Unknown wallet command
  console.log(`
❌ Unknown wallet command: ${walletCommand}

Available commands:
   --wallet show      Show current wallet address
   --wallet export    Export private key (careful!)
   --wallet delete    Delete local wallet
   --wallet import    Import wallet from private key

Examples:
   node dist/cli.js --wallet show
   node dist/cli.js --wallet export
   node dist/cli.js --wallet delete --confirm
   node dist/cli.js --wallet import --key "your-private-key"
`);
  process.exit(1);
}

// Show help
if (flags.help || args.includes('-h')) {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                   VibeCoin Node CLI v${getCurrentVersion().padEnd(6)}                       ║
╚═══════════════════════════════════════════════════════════════════╝

Run your own VibeCoin node and join the decentralized network!

USAGE:
  vibecoin [options]

VERSION & UPDATES:
  --version, -v         Show current version
  --check-update        Check if updates are available
  --update              Update to latest version (git pull + rebuild)

NODE TYPES:
  --light               Run in light mode (eco-friendly, minimal storage)
                        Perfect for laptops and low-power devices

  --full                Run as full node (default)
                        Stores complete blockchain, can mine

NETWORK OPTIONS:
  --network <network>   Network to connect to (mainnet, testnet, local)
                        Default: testnet

  --data <dir>          Data directory
                        Default: ./data

  --api-port <port>     REST API port (full node only)
                        Default: 3000

  --p2p-port <port>     P2P network port
                        Default: 6001

  --peers <addresses>   Additional peer addresses (comma-separated)
                        Example: --peers "192.168.1.10:6001,node.example.com:6001"
                        For cloud nodes: --peers "your-app.onrender.com"

  --external <address>  Your external IP:port for NAT traversal
                        Example: --external "my-node.dyndns.org:6001"

CLOUD CONNECTION:
  Connect to a cloud-hosted VibeCoin node (Render, Heroku, etc.):
  --peers "vibecoin-testnet.onrender.com"

  The CLI automatically detects cloud URLs and connects via WebSocket (wss://)

MINING OPTIONS:
  --mine                Enable automatic mining (full node only)
                        Wallet is automatically loaded/created and saved

  --miner <option>      Wallet management:
                        - (omitted): Load saved wallet or create new one
                        - "new": Same as omitted, load existing or create
                        - "force-new": Force create a new wallet
                        - <private-key>: Import wallet from private key

WALLET STORAGE:
  Your wallet is automatically saved to: ~/.vibecoin/wallet.key
  It will be reused every time you start the node.
  BACKUP THIS FILE or your private key!

WALLET MANAGEMENT:
  --wallet show      Show current wallet address
  --wallet export    Export your private key (careful!)
  --wallet delete    Delete local wallet (requires --confirm)
  --wallet import    Import wallet from private key (--key "...")

EXAMPLES:
  # Start mining (auto-loads or creates wallet)
  vibecoin --mine

  # Same as above (explicit)
  vibecoin --mine --miner new

  # Force create a NEW wallet (replaces existing)
  vibecoin --mine --miner force-new

  # Import a specific wallet
  vibecoin --mine --miner "your-private-key-here"

  # Start an eco-friendly light node
  vibecoin --light --network testnet

  # Start a node and connect to specific peers
  vibecoin --peers "192.168.1.10:6001,192.168.1.11:6001"

  # Start multiple nodes locally for testing
  vibecoin --api-port 3000 --p2p-port 6001
  vibecoin --api-port 3001 --p2p-port 6002 --peers "localhost:6001"

UPDATE COMMANDS:
  # Check for updates
  vibecoin --check-update

  # Update to latest version
  vibecoin --update

  # Show current version
  vibecoin --version

ECO-FRIENDLY TIPS:
  - Use --light mode if you don't need to mine
  - Light nodes use minimal CPU, memory, and disk space
  - Every node helps secure and decentralize the network!

MORE INFO:
  https://github.com/IOSBLKSTUDIO/VibeCoin
`);
  process.exit(0);
}

// Don't start node if a command was already handled
if (commandHandled) {
  // Wait for async commands to complete - they will call process.exit()
} else {
  // Check if running in light mode
  const isLightMode = flags.light === 'true';

  // Light node configuration
  if (isLightMode) {
  const lightConfig: Partial<LightNodeConfig> = {
    network: (flags.network as any) || 'testnet',
    dataDir: flags.data || './data/light',
    p2pPort: parseInt(flags['p2p-port']) || 6001,
    seedNodes: flags.peers ? flags.peers.split(',').map(s => s.trim()) : undefined
  };

  // Start light node
  async function startLightNode() {
    try {
      // Check for updates in background (non-blocking)
      checkForUpdates().then(info => {
        if (info.updateAvailable) {
          displayCompactUpdateNotification(info);
        }
      }).catch(() => {}); // Silently ignore update check errors

      const lightNode = new LightNode(lightConfig);
      await lightNode.start();
    } catch (error: any) {
      console.error('❌ Failed to start light node:', error.message);
      process.exit(1);
    }
  }

  startLightNode();
} else {
  // Full node configuration
  const config: Partial<NodeConfig> = {
    network: (flags.network as any) || 'testnet',
    dataDir: flags.data || './data',
    api: {
      port: parseInt(flags['api-port']) || 3000,
      host: '0.0.0.0'
    },
    p2p: {
      port: parseInt(flags['p2p-port']) || 6001,
      seedNodes: flags.peers ? flags.peers.split(',').map(s => s.trim()) : []
    },
    mining: {
      enabled: flags.mine === 'true',
      interval: 10000
    },
    externalAddress: flags.external,
    lightMode: false
  };

  // Handle miner address
  if (config.mining?.enabled) {
    let wallet: Wallet | null = null;

    if (flags.miner === 'new') {
      // Check if we already have a saved wallet
      const existingWallet = loadSavedWallet();
      if (existingWallet) {
        console.log(`
🔐 Found existing wallet (use --miner force-new to create a new one):
   Address: ${existingWallet.getShortAddress()}
   Loaded from: ${WALLET_FILE}
`);
        wallet = existingWallet;
      } else {
        // Create new wallet and save it
        wallet = new Wallet();
        saveWallet(wallet);
        console.log(`
🔐 New Miner Wallet Generated & Saved:
   Address:     ${wallet.getShortAddress()}
   Private Key: ${wallet.getPrivateKey()}
   Saved to:    ${WALLET_FILE}

   ⚠️  BACKUP YOUR PRIVATE KEY! Store it somewhere safe.
   💡 Your wallet will be automatically loaded on next start.
`);
      }
    } else if (flags.miner === 'force-new') {
      // Force create a new wallet even if one exists
      wallet = new Wallet();
      saveWallet(wallet);
      console.log(`
🔐 New Miner Wallet Generated & Saved (forced):
   Address:     ${wallet.getShortAddress()}
   Private Key: ${wallet.getPrivateKey()}
   Saved to:    ${WALLET_FILE}

   ⚠️  BACKUP YOUR PRIVATE KEY! Store it somewhere safe.
`);
    } else if (flags.miner) {
      // Assume it's a private key and import wallet
      try {
        wallet = new Wallet(flags.miner);
        saveWallet(wallet);
        console.log(`🔐 Imported & saved miner wallet: ${wallet.getShortAddress()}`);
      } catch {
        console.error('❌ Invalid miner address or private key');
        process.exit(1);
      }
    } else {
      // No --miner flag: try to load existing wallet
      wallet = loadSavedWallet();
      if (wallet) {
        console.log(`🔐 Loaded saved wallet: ${wallet.getShortAddress()}`);
      } else {
        // No saved wallet, create one automatically
        wallet = new Wallet();
        saveWallet(wallet);
        console.log(`
🔐 No wallet found - Created & Saved New Wallet:
   Address:     ${wallet.getShortAddress()}
   Private Key: ${wallet.getPrivateKey()}
   Saved to:    ${WALLET_FILE}

   ⚠️  BACKUP YOUR PRIVATE KEY! Store it somewhere safe.
   💡 Your wallet will be automatically loaded on next start.
`);
      }
    }

    config.mining.address = wallet.publicKey;
  }

  // Start full node
  async function startFullNode() {
    try {
      // Check for updates in background (non-blocking)
      checkForUpdates().then(info => {
        if (info.updateAvailable) {
          displayCompactUpdateNotification(info);
        }
      }).catch(() => {}); // Silently ignore update check errors

      const node = new Node(config);
      await node.start();
    } catch (error: any) {
      console.error('❌ Failed to start node:', error.message);
      process.exit(1);
    }
  }

  startFullNode();
  }
}
