/**
 * VibeCoin Server - Production entry point for cloud deployment
 * This starts the testnet node with API and P2P
 *
 * IMPORTANT: This node will sync with other nodes in the network.
 * If no peers are available, it starts fresh with genesis block.
 * The blockchain is only as persistent as the network of nodes running it!
 */
import { Node } from './node/Node';
import { Wallet } from './wallet/Wallet';

// Configuration from environment
const PORT = parseInt(process.env.PORT || '3000');
const P2P_PORT = parseInt(process.env.P2P_PORT || '6001');
const NODE_ENV = process.env.NODE_ENV || 'production';
const DATA_DIR = process.env.DATA_DIR || './data';

// Fixed miner private key from environment (so wallet persists across restarts)
// If not set, a new wallet is created each time (blockchain resets)
const MINER_PRIVATE_KEY = process.env.MINER_PRIVATE_KEY || '';

// Known peer nodes to sync with (comma-separated)
// Format: "host1:port1,host2:port2"
const SEED_PEERS = process.env.SEED_PEERS ? process.env.SEED_PEERS.split(',').map(s => s.trim()) : [];

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   ██╗   ██╗██╗██████╗ ███████╗ ██████╗ ██████╗ ██╗███╗   ██╗      ║
║   ██║   ██║██║██╔══██╗██╔════╝██╔════╝██╔═══██╗██║████╗  ██║      ║
║   ██║   ██║██║██████╔╝█████╗  ██║     ██║   ██║██║██╔██╗ ██║      ║
║   ╚██╗ ██╔╝██║██╔══██╗██╔══╝  ██║     ██║   ██║██║██║╚██╗██║      ║
║    ╚████╔╝ ██║██████╔╝███████╗╚██████╗╚██████╔╝██║██║ ╚████║      ║
║     ╚═══╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝      ║
║                                                                    ║
║              TESTNET NODE - Cloud Deployment                       ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
`);

console.log(`🚀 Starting VibeCoin Testnet Node...`);
console.log(`   Environment: ${NODE_ENV}`);
console.log(`   API Port:    ${PORT}`);
console.log(`   P2P Port:    ${P2P_PORT}`);
console.log(`   Data Dir:    ${DATA_DIR}`);
console.log(`   Seed Peers:  ${SEED_PEERS.length > 0 ? SEED_PEERS.join(', ') : '(none - will start fresh)'}`);
console.log('');

// Create or restore miner wallet
let minerWallet: Wallet;
if (MINER_PRIVATE_KEY) {
  try {
    minerWallet = new Wallet(MINER_PRIVATE_KEY);
    console.log(`⛏️  Restored Miner Wallet: ${minerWallet.publicKey.substring(0, 32)}...`);
  } catch {
    console.log(`⚠️  Invalid MINER_PRIVATE_KEY, creating new wallet`);
    minerWallet = new Wallet();
    console.log(`⛏️  New Miner Address: ${minerWallet.publicKey.substring(0, 32)}...`);
    console.log(`   💡 Set MINER_PRIVATE_KEY env var to persist: ${minerWallet.getPrivateKey()}`);
  }
} else {
  minerWallet = new Wallet();
  console.log(`⛏️  New Miner Address: ${minerWallet.publicKey.substring(0, 32)}...`);
  console.log(`   ⚠️  No MINER_PRIVATE_KEY set - wallet will change on restart`);
  console.log(`   💡 To persist, set MINER_PRIVATE_KEY=${minerWallet.getPrivateKey()}`);
}
console.log('');

// Initialize and start the node
const node = new Node({
  network: 'testnet',
  dataDir: DATA_DIR,
  api: {
    port: PORT,
    host: '0.0.0.0'
  },
  p2p: {
    port: P2P_PORT,
    maxPeers: 25,
    seedNodes: SEED_PEERS
  },
  mining: {
    enabled: true,
    address: minerWallet.publicKey,
    interval: 10000 // Check for pending transactions every 10 seconds
  }
});

// Set node wallet
node.setWallet(minerWallet);

// Start the node
node.start()
  .then(() => {
    console.log('');
    console.log('✅ VibeCoin Testnet Node is running!');
    console.log('');
    console.log('📝 Available Endpoints:');
    console.log(`   GET  /info                    - Node information`);
    console.log(`   GET  /stats                   - Blockchain statistics`);
    console.log(`   GET  /blocks                  - List blocks`);
    console.log(`   GET  /blocks/:index           - Get block by index`);
    console.log(`   GET  /transactions/pending    - Pending transactions`);
    console.log(`   POST /transactions            - Create transaction`);
    console.log(`   GET  /address/:addr/balance   - Get balance`);
    console.log(`   POST /wallet/new              - Create new wallet`);
    console.log(`   POST /faucet                  - Get free testnet VIBE`);
    console.log(`   POST /mine                    - Mine a block`);
    console.log('');
  })
  .catch((error) => {
    console.error('❌ Failed to start node:', error);
    process.exit(1);
  });
