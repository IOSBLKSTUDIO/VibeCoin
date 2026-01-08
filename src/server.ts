/**
 * VibeCoin Server - Production entry point for cloud deployment
 * This starts the testnet node with API and P2P
 */
import { Node } from './node/Node';
import { Wallet } from './wallet/Wallet';

// Configuration from environment
const PORT = parseInt(process.env.PORT || '3000');
const P2P_PORT = parseInt(process.env.P2P_PORT || '6001');
const NODE_ENV = process.env.NODE_ENV || 'production';
const DATA_DIR = process.env.DATA_DIR || './data';

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
console.log('');

// Create a miner wallet for the node
const minerWallet = new Wallet();
console.log(`⛏️  Miner Address: ${minerWallet.publicKey.substring(0, 32)}...`);

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
    seedNodes: []
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
