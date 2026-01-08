/**
 * VibeCoin Server - Production entry point for cloud deployment
 * This starts the testnet node with API and P2P
 */
import { Node, NodeConfig } from './node/Node';
import { Wallet } from './wallet/Wallet';

// Configuration from environment
const PORT = parseInt(process.env.PORT || '3000');
const P2P_PORT = parseInt(process.env.P2P_PORT || '6001');
const NODE_ENV = process.env.NODE_ENV || 'development';
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
║                    TESTNET NODE - v0.1.0                          ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
`);

// Generate or load miner wallet
const minerWallet = new Wallet();
console.log(`🔐 Node Wallet: ${minerWallet.getShortAddress()}\n`);

// Node configuration
const config: Partial<NodeConfig> = {
  network: 'testnet',
  dataDir: DATA_DIR,
  api: {
    port: PORT,
    host: '0.0.0.0'
  },
  p2p: {
    port: P2P_PORT,
    seedNodes: []
  },
  mining: {
    enabled: true,
    address: minerWallet.publicKey,
    interval: 30000 // Mine every 30 seconds if there are pending transactions
  }
};

// Start node
async function main() {
  try {
    console.log(`📡 Starting VibeCoin Testnet Node...`);
    console.log(`   Environment: ${NODE_ENV}`);
    console.log(`   API Port: ${PORT}`);
    console.log(`   Data Dir: ${DATA_DIR}\n`);

    const node = new Node(config);
    await node.start();

    console.log(`
✅ VibeCoin Testnet is LIVE!

📍 API Endpoints:
   GET  /info                    - Node info
   GET  /stats                   - Blockchain stats
   GET  /blocks                  - List blocks
   GET  /address/:addr/balance   - Check balance
   POST /wallet/new              - Create wallet
   POST /wallet/import           - Import wallet
   POST /faucet                  - Get free VIBE
   POST /transactions            - Send VIBE
   POST /mine                    - Mine a block

🌐 Ready to accept connections!
`);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await node.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await node.stop();
      process.exit(0);
    });

  } catch (error: any) {
    console.error('❌ Failed to start node:', error.message);
    process.exit(1);
  }
}

main();
