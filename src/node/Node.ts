/**
 * VibeCoin Node - Main node class that combines all components
 */
import { Blockchain } from '../core/Blockchain';
import { Block } from '../core/Block';
import { Wallet } from '../wallet/Wallet';
import { Storage, StorageConfig } from '../storage/Storage';
import { API, APIConfig } from '../api/API';
import { P2PNetwork, P2PConfig } from '../network/P2P';

export interface NodeConfig {
  network: 'mainnet' | 'testnet' | 'local';
  dataDir: string;
  api: Partial<APIConfig>;
  p2p: Partial<P2PConfig>;
  mining: {
    enabled: boolean;
    address?: string;
    interval: number;
  };
}

const DEFAULT_CONFIG: NodeConfig = {
  network: 'testnet',
  dataDir: './data',
  api: {
    port: 3000,
    host: '0.0.0.0'
  },
  p2p: {
    port: 6001,
    maxPeers: 25,
    seedNodes: []
  },
  mining: {
    enabled: false,
    interval: 10000
  }
};

export class Node {
  private config: NodeConfig;
  private blockchain: Blockchain;
  private storage: Storage;
  private api: API;
  private p2p: P2PNetwork;
  private wallet: Wallet | null = null;
  private miningInterval: NodeJS.Timeout | null = null;
  private running: boolean = false;

  constructor(config: Partial<NodeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize components
    this.storage = new Storage({
      dataDir: this.config.dataDir,
      network: this.config.network
    });

    this.blockchain = new Blockchain();

    this.api = new API(this.blockchain, this.storage, this.config.api);

    this.p2p = new P2PNetwork(this.blockchain, this.storage, this.config.p2p);
  }

  /**
   * Start the node
   */
  async start(): Promise<void> {
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
║                     TESTNET NODE v0.1.0                           ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
    `);

    // Initialize storage
    await this.storage.init();

    // Load existing blockchain or start fresh
    const existingChain = await this.storage.loadBlockchain();
    if (existingChain) {
      this.blockchain = existingChain;
      // Re-initialize API and P2P with loaded blockchain
      this.api = new API(this.blockchain, this.storage, this.config.api);
      this.p2p = new P2PNetwork(this.blockchain, this.storage, this.config.p2p);
    } else {
      // Save genesis
      await this.storage.saveBlockchain(this.blockchain);
    }

    // Start API
    await this.api.start();

    // Start P2P
    await this.p2p.start();

    // Start mining if enabled
    if (this.config.mining.enabled && this.config.mining.address) {
      this.startMining(this.config.mining.address);
    }

    this.running = true;

    // Print status
    this.printStatus();

    // Handle shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  /**
   * Stop the node
   */
  async stop(): Promise<void> {
    console.log('\n🛑 Shutting down node...');

    this.running = false;

    // Stop mining
    if (this.miningInterval) {
      clearInterval(this.miningInterval);
    }

    // Save final state
    await this.storage.saveBlockchain(this.blockchain);

    // Stop P2P
    await this.p2p.stop();

    // Close storage
    await this.storage.close();

    console.log('👋 Node stopped gracefully');
    process.exit(0);
  }

  /**
   * Start automatic mining
   */
  startMining(address: string): void {
    if (this.miningInterval) {
      clearInterval(this.miningInterval);
    }

    console.log(`⛏️  Mining enabled for ${address.substring(0, 16)}...`);

    this.miningInterval = setInterval(async () => {
      if (this.blockchain.pendingTransactions.length > 0 || this.blockchain.chain.length < 5) {
        console.log(`\n⛏️  Mining block ${this.blockchain.chain.length}...`);

        const block = this.blockchain.minePendingTransactions(address);

        // Index transactions
        for (const tx of block.transactions) {
          await this.storage.indexTransaction(tx, block.index);
        }

        // Save and broadcast
        await this.storage.saveBlockchain(this.blockchain);
        this.p2p.broadcastBlock(block);

        console.log(`✅ Block ${block.index} mined and broadcast`);
      }
    }, this.config.mining.interval);
  }

  /**
   * Stop mining
   */
  stopMining(): void {
    if (this.miningInterval) {
      clearInterval(this.miningInterval);
      this.miningInterval = null;
      console.log('⛏️  Mining stopped');
    }
  }

  /**
   * Set node wallet
   */
  setWallet(wallet: Wallet): void {
    this.wallet = wallet;
    this.api.setNodeWallet(wallet);
  }

  /**
   * Get node status
   */
  getStatus(): object {
    return {
      running: this.running,
      network: this.config.network,
      blockchain: this.blockchain.getStats(),
      peers: this.p2p.getPeerCount(),
      api: {
        port: this.config.api.port
      },
      p2p: {
        port: this.config.p2p.port
      },
      mining: {
        enabled: this.miningInterval !== null
      }
    };
  }

  /**
   * Print node status
   */
  printStatus(): void {
    const stats = this.blockchain.getStats() as any;

    console.log(`
📊 Node Status:
   Network:     ${this.config.network}
   Blocks:      ${stats.blocks}
   Difficulty:  ${stats.difficulty}
   Supply:      ${stats.circulatingSupply.toFixed(2)} VIBE
   Peers:       ${this.p2p.getPeerCount()}
   Pending TX:  ${stats.pendingTransactions}

🌐 Endpoints:
   API:         http://localhost:${this.config.api.port}
   P2P:         ws://localhost:${this.config.p2p.port}

📝 API Documentation:
   GET  /info                    - Node information
   GET  /stats                   - Blockchain statistics
   GET  /blocks                  - List blocks
   GET  /blocks/:index           - Get block by index
   GET  /blocks/latest           - Get latest block
   GET  /transactions/pending    - Pending transactions
   POST /transactions            - Create transaction
   GET  /address/:addr/balance   - Get balance
   POST /mine                    - Mine a block
   POST /wallet/new              - Create new wallet
   POST /faucet                  - Get free testnet VIBE
    `);
  }

  /**
   * Access blockchain
   */
  getBlockchain(): Blockchain {
    return this.blockchain;
  }

  /**
   * Access P2P network
   */
  getP2P(): P2PNetwork {
    return this.p2p;
  }
}
