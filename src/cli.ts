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

// Show help
if (flags.help || args.includes('-h')) {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                   VibeCoin Node CLI v0.2.0                        ║
╚═══════════════════════════════════════════════════════════════════╝

Run your own VibeCoin node and join the decentralized network!

USAGE:
  vibecoin [options]

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

  --miner <address>     Miner address (required if --mine is set)
                        Use "new" to generate a new wallet
                        Use a private key to import existing wallet

EXAMPLES:
  # Start a simple testnet node (full mode)
  vibecoin --network testnet

  # Start an eco-friendly light node
  vibecoin --light --network testnet

  # Start a mining node with new wallet
  vibecoin --mine --miner new

  # Start a node and connect to specific peers
  vibecoin --peers "192.168.1.10:6001,192.168.1.11:6001"

  # Start multiple nodes locally for testing
  vibecoin --api-port 3000 --p2p-port 6001
  vibecoin --api-port 3001 --p2p-port 6002 --peers "localhost:6001"

ECO-FRIENDLY TIPS:
  - Use --light mode if you don't need to mine
  - Light nodes use minimal CPU, memory, and disk space
  - Every node helps secure and decentralize the network!

MORE INFO:
  https://github.com/IOSBLKSTUDIO/VibeCoin
`);
  process.exit(0);
}

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
    if (flags.miner === 'new') {
      const wallet = new Wallet();
      console.log(`
🔐 New Miner Wallet Generated:
   Address:     ${wallet.getShortAddress()}
   Private Key: ${wallet.getPrivateKey()}

   ⚠️  SAVE YOUR PRIVATE KEY! You will need it to access your funds.
`);
      config.mining.address = wallet.publicKey;
    } else if (flags.miner) {
      // Assume it's a private key and import wallet
      try {
        const wallet = new Wallet(flags.miner);
        config.mining.address = wallet.publicKey;
        console.log(`🔐 Using miner address: ${wallet.getShortAddress()}`);
      } catch {
        console.error('❌ Invalid miner address or private key');
        process.exit(1);
      }
    } else {
      console.error('❌ Mining enabled but no miner address provided. Use --miner <address> or --miner new');
      process.exit(1);
    }
  }

  // Start full node
  async function startFullNode() {
    try {
      const node = new Node(config);
      await node.start();
    } catch (error: any) {
      console.error('❌ Failed to start node:', error.message);
      process.exit(1);
    }
  }

  startFullNode();
}
