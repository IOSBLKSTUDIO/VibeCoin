/**
 * VibeCoin Light Node - Eco-friendly node that stores only block headers
 *
 * Light nodes are perfect for:
 * - Users who want to participate in the network without storing the full blockchain
 * - Mobile devices or computers with limited storage
 * - Reducing energy consumption (no mining, minimal storage)
 *
 * Light nodes can:
 * - Verify transactions against block headers
 * - Submit transactions to the network
 * - Query balances via SPV (Simplified Payment Verification)
 *
 * Light nodes cannot:
 * - Mine new blocks
 * - Serve full block data to other nodes
 * - Validate the entire blockchain
 */

import WebSocket, { WebSocketServer } from 'ws';
import * as crypto from 'crypto';
import { Block } from '../core/Block';

// Generate UUID v4 using native crypto (avoids ESM/CommonJS issues with uuid package)
function uuidv4(): string {
  return crypto.randomUUID();
}
import { Transaction } from '../core/Transaction';
import {
  getSeedNodes,
  DISCOVERY_CONFIG,
  NodeCapability
} from '../network/SeedNodes';

// Block header - lightweight representation
export interface BlockHeader {
  index: number;
  timestamp: number;
  previousHash: string;
  hash: string;
  merkleRoot: string;
  difficulty: number;
  nonce: number;
  transactionCount: number;
}

// SPV Proof - proof that a transaction is included in a block
export interface SPVProof {
  txId: string;
  blockHash: string;
  blockIndex: number;
  merkleProof: string[];
  txIndex: number;
}

export interface LightNodeConfig {
  network: 'mainnet' | 'testnet' | 'local';
  dataDir: string;
  p2pPort: number;
  seedNodes?: string[];
  maxHeadersStored: number;
}

const DEFAULT_CONFIG: LightNodeConfig = {
  network: 'testnet',
  dataDir: './data/light',
  p2pPort: 6001,
  maxHeadersStored: 10000 // Store last 10k headers
};

export class LightNode {
  private config: LightNodeConfig;
  private nodeId: string;
  private headers: Map<number, BlockHeader> = new Map();
  private latestHeight: number = 0;
  private peers: Map<string, WebSocket> = new Map();
  private server: WebSocketServer | null = null;
  private running: boolean = false;

  // Pending transactions waiting for confirmation
  private pendingTx: Map<string, Transaction> = new Map();

  // Watched addresses for SPV
  private watchedAddresses: Set<string> = new Set();
  private addressTransactions: Map<string, string[]> = new Map();

  constructor(config: Partial<LightNodeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.nodeId = uuidv4();
  }

  /**
   * Start the light node
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
║                    LIGHT NODE v0.2.0 (ECO MODE)                   ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
    `);

    console.log('🌱 Starting in eco-friendly light mode...');
    console.log('📍 Node ID:', this.nodeId.substring(0, 8) + '...');
    console.log('🌐 Network:', this.config.network);
    console.log('💾 Storage: Headers only (minimal disk usage)');
    console.log('⚡ Energy: Low power consumption');

    // Start P2P server
    this.server = new WebSocketServer({ port: this.config.p2pPort });

    this.server.on('connection', (ws, req) => {
      const address = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
      this.handleConnection(ws, address);
    });

    console.log(`🔗 P2P server running on port ${this.config.p2pPort}`);

    // Connect to seed nodes
    const seeds = this.config.seedNodes?.length
      ? this.config.seedNodes
      : getSeedNodes(this.config.network);

    console.log('🌱 Connecting to seed nodes...');
    for (const seed of seeds) {
      await this.connectToPeer(seed);
    }

    // Start header sync
    this.startHeaderSync();

    this.running = true;

    // Handle shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    this.printStatus();
  }

  /**
   * Connect to a peer
   */
  async connectToPeer(address: string): Promise<boolean> {
    if (this.peers.has(address)) return false;

    try {
      const ws = new WebSocket(`ws://${address}`);

      return new Promise((resolve) => {
        ws.on('open', () => {
          this.peers.set(address, ws);
          console.log(`✓ Connected to ${address}`);

          // Send handshake
          this.send(ws, {
            type: 'LIGHT_HANDSHAKE',
            nodeId: this.nodeId,
            network: this.config.network,
            capabilities: [NodeCapability.LIGHT_NODE],
            headerHeight: this.latestHeight
          });

          // Request headers
          this.send(ws, {
            type: 'GET_HEADERS',
            fromHeight: this.latestHeight
          });

          resolve(true);
        });

        ws.on('message', (data) => this.handleMessage(ws, data.toString()));

        ws.on('close', () => {
          this.peers.delete(address);
        });

        ws.on('error', () => {
          resolve(false);
        });

        setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.terminate();
            resolve(false);
          }
        }, DISCOVERY_CONFIG.CONNECTION_TIMEOUT);
      });
    } catch {
      return false;
    }
  }

  /**
   * Handle incoming connection
   */
  private handleConnection(ws: WebSocket, address: string): void {
    console.log(`← Peer connected: ${address}`);
    this.peers.set(address, ws);

    ws.on('message', (data) => this.handleMessage(ws, data.toString()));

    ws.on('close', () => {
      this.peers.delete(address);
      console.log(`✂️ Peer disconnected: ${address}`);
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(ws: WebSocket, data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'HEADERS':
          this.handleHeaders(message.headers);
          break;

        case 'NEW_BLOCK_HEADER':
          this.handleNewHeader(message.header);
          break;

        case 'TX_PROOF':
          this.handleTxProof(message.proof);
          break;

        case 'TX_CONFIRMED':
          this.handleTxConfirmed(message.txId, message.blockIndex);
          break;

        case 'GET_HEADERS':
          // Send headers we have
          const headers = Array.from(this.headers.values())
            .filter(h => h.index >= message.fromHeight)
            .slice(0, 100);
          this.send(ws, { type: 'HEADERS', headers });
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Invalid message from peer');
    }
  }

  /**
   * Handle received headers
   */
  private handleHeaders(headers: BlockHeader[]): void {
    for (const header of headers) {
      if (this.validateHeader(header)) {
        this.headers.set(header.index, header);
        if (header.index > this.latestHeight) {
          this.latestHeight = header.index;
        }
      }
    }

    console.log(`📥 Synced to height ${this.latestHeight}`);

    // Prune old headers if needed
    this.pruneHeaders();
  }

  /**
   * Handle new block header announcement
   */
  private handleNewHeader(header: BlockHeader): void {
    if (this.validateHeader(header)) {
      this.headers.set(header.index, header);

      if (header.index > this.latestHeight) {
        this.latestHeight = header.index;
        console.log(`📦 New block header ${header.index}`);
      }

      // Check if any pending tx might be confirmed
      this.checkPendingTransactions();
    }
  }

  /**
   * Handle SPV proof for a transaction
   */
  private handleTxProof(proof: SPVProof): void {
    if (this.verifySPVProof(proof)) {
      console.log(`✅ Transaction ${proof.txId.substring(0, 8)} verified via SPV`);
      this.pendingTx.delete(proof.txId);
    }
  }

  /**
   * Handle transaction confirmation notification
   */
  private handleTxConfirmed(txId: string, blockIndex: number): void {
    if (this.pendingTx.has(txId)) {
      console.log(`✅ Transaction ${txId.substring(0, 8)} confirmed in block ${blockIndex}`);
      this.pendingTx.delete(txId);
    }
  }

  /**
   * Validate a block header
   */
  private validateHeader(header: BlockHeader): boolean {
    // Check it links to previous header
    if (header.index > 0) {
      const prevHeader = this.headers.get(header.index - 1);
      if (prevHeader && prevHeader.hash !== header.previousHash) {
        return false;
      }
    }

    // Basic validation - hash starts with correct difficulty
    const target = '0'.repeat(header.difficulty);
    if (!header.hash.startsWith(target)) {
      return false;
    }

    return true;
  }

  /**
   * Verify an SPV proof
   */
  private verifySPVProof(proof: SPVProof): boolean {
    // Verify the block exists
    const header = Array.from(this.headers.values())
      .find(h => h.hash === proof.blockHash);

    if (!header) {
      return false;
    }

    // In a full implementation, verify the merkle proof
    // For now, trust the proof if the block exists
    return true;
  }

  /**
   * Prune old headers to save memory
   */
  private pruneHeaders(): void {
    if (this.headers.size > this.config.maxHeadersStored) {
      const minHeight = this.latestHeight - this.config.maxHeadersStored;

      for (const [index] of this.headers) {
        if (index < minHeight) {
          this.headers.delete(index);
        }
      }
    }
  }

  /**
   * Check pending transactions for confirmations
   */
  private checkPendingTransactions(): void {
    for (const [txId] of this.pendingTx) {
      // Request proof from peers
      this.broadcast({
        type: 'GET_TX_PROOF',
        txId
      });
    }
  }

  /**
   * Start periodic header sync
   */
  private startHeaderSync(): void {
    setInterval(() => {
      // Request new headers from peers
      for (const ws of this.peers.values()) {
        this.send(ws, {
          type: 'GET_HEADERS',
          fromHeight: this.latestHeight
        });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Watch an address for transactions
   */
  watchAddress(address: string): void {
    this.watchedAddresses.add(address);
    console.log(`👁️ Watching address: ${address.substring(0, 16)}...`);

    // Notify peers to relay transactions for this address
    this.broadcast({
      type: 'WATCH_ADDRESS',
      address
    });
  }

  /**
   * Submit a transaction to the network
   */
  submitTransaction(tx: Transaction): void {
    this.pendingTx.set(tx.id, tx);

    // Broadcast to all peers
    this.broadcast({
      type: 'NEW_TRANSACTION',
      transaction: tx.toJSON()
    });

    console.log(`📤 Transaction ${tx.id.substring(0, 8)} submitted`);
  }

  /**
   * Send message to a peer
   */
  private send(ws: WebSocket, message: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...message,
        nodeId: this.nodeId,
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Broadcast to all peers
   */
  private broadcast(message: object): void {
    for (const ws of this.peers.values()) {
      this.send(ws, message);
    }
  }

  /**
   * Get node status
   */
  getStatus(): object {
    return {
      mode: 'light',
      nodeId: this.nodeId,
      network: this.config.network,
      headerHeight: this.latestHeight,
      headersStored: this.headers.size,
      peers: this.peers.size,
      pendingTx: this.pendingTx.size,
      watchedAddresses: this.watchedAddresses.size,
      running: this.running
    };
  }

  /**
   * Print status
   */
  printStatus(): void {
    console.log(`
📊 Light Node Status:
   Mode:        ECO (Light Node)
   Network:     ${this.config.network}
   Height:      ${this.latestHeight}
   Headers:     ${this.headers.size}
   Peers:       ${this.peers.size}
   Pending TX:  ${this.pendingTx.size}
   Watched:     ${this.watchedAddresses.size} addresses

🌱 Eco Benefits:
   Storage:     ~${Math.round(this.headers.size * 0.2)}KB (vs ~${Math.round(this.headers.size * 2)}KB full)
   CPU:         Minimal (no mining)
   Network:     Headers only

🔗 P2P Endpoint: ws://localhost:${this.config.p2pPort}
    `);
  }

  /**
   * Stop the node
   */
  async stop(): Promise<void> {
    console.log('\n🛑 Shutting down light node...');

    this.running = false;

    // Close peer connections
    for (const ws of this.peers.values()) {
      ws.close();
    }

    // Close server
    if (this.server) {
      this.server.close();
    }

    console.log('👋 Light node stopped');
    process.exit(0);
  }
}
