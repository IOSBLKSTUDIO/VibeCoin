/**
 * VibeCoin P2P Network - Peer-to-peer communication between nodes
 *
 * This is the heart of VibeCoin's decentralization. Each node running on
 * someone's Mac or PC connects to other nodes, sharing the blockchain
 * and keeping it synchronized across the entire network.
 *
 * Eco-friendly: Uses Proof of Vibe instead of energy-intensive mining
 */
import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Blockchain } from '../core/Blockchain';
import { Block } from '../core/Block';
import { Transaction } from '../core/Transaction';
import { Storage } from '../storage/Storage';
import {
  getSeedNodes,
  DISCOVERY_CONFIG,
  NodeCapability,
  NodeAdvertisement,
  PeerScore,
  calculatePeerScore
} from './SeedNodes';
import { ChainValidator } from '../core/ChainValidator';

// Version for protocol compatibility
const PROTOCOL_VERSION = '1.0.0';
const NODE_VERSION = '0.2.0';

// Message types
enum MessageType {
  HANDSHAKE = 'HANDSHAKE',
  HANDSHAKE_REPLY = 'HANDSHAKE_REPLY',
  GET_BLOCKS = 'GET_BLOCKS',
  BLOCKS = 'BLOCKS',
  NEW_BLOCK = 'NEW_BLOCK',
  NEW_TRANSACTION = 'NEW_TRANSACTION',
  GET_PEERS = 'GET_PEERS',
  PEERS = 'PEERS',
  PING = 'PING',
  PONG = 'PONG',
  // New message types for enhanced P2P
  NODE_ANNOUNCE = 'NODE_ANNOUNCE',
  GET_NODE_INFO = 'GET_NODE_INFO',
  NODE_INFO = 'NODE_INFO',
  SYNC_REQUEST = 'SYNC_REQUEST',
  SYNC_RESPONSE = 'SYNC_RESPONSE'
}

interface P2PMessage {
  type: MessageType;
  data: any;
  nodeId: string;
  timestamp: number;
}

interface Peer {
  ws: WebSocket;
  nodeId: string;
  address: string;
  connected: boolean;
  lastSeen: number;
  version: string;
  blockHeight: number;
  capabilities: NodeCapability[];
  latency: number;
  score: PeerScore;
}

export interface P2PConfig {
  port: number;
  maxPeers: number;
  seedNodes: string[];
  network: 'mainnet' | 'testnet' | 'local';
  externalAddress?: string;  // For NAT traversal
  capabilities: NodeCapability[];
}

export class P2PNetwork {
  private server: WebSocketServer | null = null;
  private peers: Map<string, Peer> = new Map();
  private knownPeers: Map<string, { lastSeen: number; score: number }> = new Map();
  private blockchain: Blockchain;
  private storage: Storage;
  private config: P2PConfig;
  private nodeId: string;
  private messageHandlers: Map<MessageType, (peer: Peer, data: any) => void> = new Map();
  private discoveryInterval: NodeJS.Timeout | null = null;
  private syncInProgress: boolean = false;

  constructor(blockchain: Blockchain, storage: Storage, config: Partial<P2PConfig> = {}) {
    this.blockchain = blockchain;
    this.storage = storage;
    this.nodeId = uuidv4();

    // Default network to testnet
    const network = config.network || 'testnet';

    this.config = {
      port: config.port || 6001,
      maxPeers: config.maxPeers || DISCOVERY_CONFIG.MAX_PEERS,
      seedNodes: config.seedNodes?.length ? config.seedNodes : getSeedNodes(network),
      network: network,
      externalAddress: config.externalAddress,
      capabilities: config.capabilities || [NodeCapability.FULL_NODE]
    };

    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    // Handshake - enhanced with version and capabilities
    this.messageHandlers.set(MessageType.HANDSHAKE, (peer, data) => {
      peer.nodeId = data.nodeId;
      peer.version = data.version || '0.1.0';
      peer.blockHeight = data.height || 0;
      peer.capabilities = data.capabilities || [NodeCapability.FULL_NODE];

      console.log(`🤝 Handshake from ${peer.nodeId.substring(0, 8)} v${peer.version} (height: ${peer.blockHeight})`);

      this.sendToPeer(peer, {
        type: MessageType.HANDSHAKE_REPLY,
        data: {
          nodeId: this.nodeId,
          version: NODE_VERSION,
          protocolVersion: PROTOCOL_VERSION,
          network: this.config.network,
          height: this.blockchain.chain.length,
          latestHash: this.blockchain.getLatestBlock().hash,
          capabilities: this.config.capabilities
        }
      });

      // Request peer list for discovery
      setTimeout(() => {
        this.sendToPeer(peer, { type: MessageType.GET_PEERS, data: {} });
      }, 1000);
    });

    // Handshake reply - enhanced
    this.messageHandlers.set(MessageType.HANDSHAKE_REPLY, (peer, data) => {
      peer.nodeId = data.nodeId;
      peer.version = data.version || '0.1.0';
      peer.blockHeight = data.height || 0;
      peer.capabilities = data.capabilities || [NodeCapability.FULL_NODE];

      console.log(`🤝 Connected to ${peer.nodeId.substring(0, 8)} v${peer.version} (height: ${data.height})`);

      // Check network compatibility
      if (data.network && data.network !== this.config.network) {
        console.log(`⚠️  Network mismatch: we're on ${this.config.network}, peer is on ${data.network}`);
        peer.ws.close();
        return;
      }

      // If peer has more blocks, request sync
      if (data.height > this.blockchain.chain.length) {
        this.requestSync(peer);
      }

      // Request peer list for discovery
      setTimeout(() => {
        this.sendToPeer(peer, { type: MessageType.GET_PEERS, data: {} });
      }, 1000);
    });

    // Block request
    this.messageHandlers.set(MessageType.GET_BLOCKS, (peer, data) => {
      const { fromIndex } = data;
      const blocks = this.blockchain.chain.slice(fromIndex).map(b => b.toJSON());

      this.sendToPeer(peer, {
        type: MessageType.BLOCKS,
        data: { blocks }
      });
    });

    // Receive blocks
    this.messageHandlers.set(MessageType.BLOCKS, async (_peer, data) => {
      const { blocks } = data;

      for (const blockData of blocks) {
        const block = Block.fromJSON(blockData);

        if (this.isValidNewBlock(block)) {
          this.blockchain.chain.push(block);
          console.log(`📦 Added block ${block.index} from sync`);
        }
      }

      await this.storage.saveBlockchain(this.blockchain);
    });

    // New block announcement
    this.messageHandlers.set(MessageType.NEW_BLOCK, async (peer, data) => {
      const block = Block.fromJSON(data.block);

      if (this.isValidNewBlock(block)) {
        this.blockchain.chain.push(block);

        // Remove mined transactions from pending
        const minedIds = new Set(block.transactions.map(tx => tx.id));
        this.blockchain.pendingTransactions = this.blockchain.pendingTransactions
          .filter(tx => !minedIds.has(tx.id));

        await this.storage.saveBlockchain(this.blockchain);
        console.log(`📦 New block ${block.index} from ${peer.nodeId.substring(0, 8)}`);

        // Broadcast to other peers
        this.broadcastExcept(peer.nodeId, {
          type: MessageType.NEW_BLOCK,
          data: { block: block.toJSON() }
        });
      }
    });

    // New transaction announcement
    this.messageHandlers.set(MessageType.NEW_TRANSACTION, (peer, data) => {
      const tx = Transaction.fromJSON(data.transaction);

      if (tx.isValid()) {
        const exists = this.blockchain.pendingTransactions.some(t => t.id === tx.id);

        if (!exists) {
          this.blockchain.addTransaction(tx);
          console.log(`📝 New transaction from ${peer.nodeId.substring(0, 8)}`);

          // Broadcast to other peers
          this.broadcastExcept(peer.nodeId, {
            type: MessageType.NEW_TRANSACTION,
            data: { transaction: tx.toJSON() }
          });
        }
      }
    });

    // Peer list request
    this.messageHandlers.set(MessageType.GET_PEERS, (peer) => {
      const peerList = Array.from(this.peers.values())
        .filter(p => p.connected && p.nodeId !== peer.nodeId)
        .map(p => p.address);

      this.sendToPeer(peer, {
        type: MessageType.PEERS,
        data: { peers: peerList }
      });
    });

    // Receive peer list
    this.messageHandlers.set(MessageType.PEERS, (_peer, data) => {
      for (const address of data.peers) {
        if (this.peers.size < this.config.maxPeers) {
          this.connectToPeer(address);
        }
      }
    });

    // Ping
    this.messageHandlers.set(MessageType.PING, (peer) => {
      this.sendToPeer(peer, { type: MessageType.PONG, data: {} });
    });

    // Pong
    this.messageHandlers.set(MessageType.PONG, (peer) => {
      peer.lastSeen = Date.now();
    });

    // Node announcement - for peer discovery
    this.messageHandlers.set(MessageType.NODE_ANNOUNCE, (peer, data) => {
      const { address, nodeId, height, capabilities } = data;
      if (address && nodeId !== this.nodeId) {
        this.knownPeers.set(address, {
          lastSeen: Date.now(),
          score: 0.5
        });
        // Try to connect if we need more peers
        if (this.peers.size < DISCOVERY_CONFIG.MIN_PEERS) {
          this.connectToPeer(address);
        }
      }
    });

    // Sync request - for initial blockchain sync
    this.messageHandlers.set(MessageType.SYNC_REQUEST, async (peer, data) => {
      const { fromHeight, toHeight } = data;
      const blocks: any[] = [];

      const maxBlocks = Math.min(toHeight - fromHeight, 100); // Max 100 blocks per request
      for (let i = fromHeight; i < fromHeight + maxBlocks && i < this.blockchain.chain.length; i++) {
        blocks.push(this.blockchain.chain[i].toJSON());
      }

      this.sendToPeer(peer, {
        type: MessageType.SYNC_RESPONSE,
        data: {
          blocks,
          hasMore: fromHeight + blocks.length < this.blockchain.chain.length,
          totalHeight: this.blockchain.chain.length
        }
      });
    });

    // Sync response - receiving blocks during sync
    this.messageHandlers.set(MessageType.SYNC_RESPONSE, async (peer, data) => {
      const { blocks, hasMore, totalHeight } = data;

      for (const blockData of blocks) {
        const block = Block.fromJSON(blockData);
        if (this.isValidNewBlock(block)) {
          this.blockchain.chain.push(block);
          peer.score.blocksReceived++;
        } else {
          peer.score.invalidBlocks++;
        }
      }

      console.log(`📥 Synced ${blocks.length} blocks from ${peer.nodeId.substring(0, 8)} (${this.blockchain.chain.length}/${totalHeight})`);

      // Request more if needed
      if (hasMore && this.blockchain.chain.length < totalHeight) {
        this.sendToPeer(peer, {
          type: MessageType.SYNC_REQUEST,
          data: {
            fromHeight: this.blockchain.chain.length,
            toHeight: totalHeight
          }
        });
      } else {
        this.syncInProgress = false;
        await this.storage.saveBlockchain(this.blockchain);
        console.log(`✅ Sync complete! Height: ${this.blockchain.chain.length}`);
      }
    });
  }

  /**
   * Request sync from a peer
   */
  private requestSync(peer: Peer): void {
    if (this.syncInProgress) return;

    this.syncInProgress = true;
    console.log(`🔄 Starting sync from ${peer.nodeId.substring(0, 8)}...`);

    this.sendToPeer(peer, {
      type: MessageType.SYNC_REQUEST,
      data: {
        fromHeight: this.blockchain.chain.length,
        toHeight: peer.blockHeight
      }
    });
  }

  /**
   * Start P2P server
   */
  async start(): Promise<void> {
    this.server = new WebSocketServer({ port: this.config.port });

    this.server.on('connection', (ws, req) => {
      const address = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
      this.handleConnection(ws, address, false);
    });

    console.log(`🔗 P2P server running on port ${this.config.port}`);
    console.log(`📍 Node ID: ${this.nodeId.substring(0, 8)}...`);
    console.log(`🌐 Network: ${this.config.network}`);

    // Load saved peers first
    const savedPeers = await this.storage.loadPeers();
    console.log(`📂 Loaded ${savedPeers.length} known peers from storage`);

    // Try saved peers first
    for (const peer of savedPeers) {
      await this.connectToPeer(peer);
    }

    // Connect to seed nodes
    console.log(`🌱 Connecting to ${this.config.seedNodes.length} seed nodes...`);
    for (const seed of this.config.seedNodes) {
      const connected = await this.connectToPeer(seed);
      if (connected) {
        console.log(`   ✓ Connected to ${seed}`);
      }
    }

    // Start heartbeat
    setInterval(() => this.heartbeat(), 30000);

    // Start peer discovery
    this.startDiscovery();
  }

  /**
   * Start automatic peer discovery
   */
  private startDiscovery(): void {
    this.discoveryInterval = setInterval(() => {
      // If we don't have enough peers, try to find more
      if (this.peers.size < DISCOVERY_CONFIG.MIN_PEERS) {
        console.log(`🔍 Low peer count (${this.peers.size}), discovering more...`);

        // Try known peers
        for (const [address] of this.knownPeers) {
          if (!this.peers.has(address) && this.peers.size < this.config.maxPeers) {
            this.connectToPeer(address);
          }
        }

        // Try seed nodes again
        for (const seed of this.config.seedNodes) {
          if (!this.peers.has(seed)) {
            this.connectToPeer(seed);
          }
        }
      }

      // Request peer lists from connected peers
      for (const peer of this.peers.values()) {
        if (peer.connected) {
          this.sendToPeer(peer, { type: MessageType.GET_PEERS, data: {} });
        }
      }

      // Announce ourselves to the network
      this.announceNode();
    }, DISCOVERY_CONFIG.PEER_EXCHANGE_INTERVAL);
  }

  /**
   * Announce this node to all peers
   */
  private announceNode(): void {
    const announcement = {
      address: this.config.externalAddress || `localhost:${this.config.port}`,
      nodeId: this.nodeId,
      height: this.blockchain.chain.length,
      capabilities: this.config.capabilities,
      version: NODE_VERSION
    };

    this.broadcast({
      type: MessageType.NODE_ANNOUNCE,
      data: announcement
    });
  }

  /**
   * Connect to a peer
   */
  async connectToPeer(address: string): Promise<boolean> {
    if (this.peers.has(address) || this.peers.size >= this.config.maxPeers) {
      return false;
    }

    try {
      const ws = new WebSocket(`ws://${address}`);

      return new Promise((resolve) => {
        ws.on('open', () => {
          this.handleConnection(ws, address, true);
          resolve(true);
        });

        ws.on('error', () => {
          resolve(false);
        });

        // Timeout
        setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.terminate();
            resolve(false);
          }
        }, 5000);
      });
    } catch {
      return false;
    }
  }

  /**
   * Handle new connection
   */
  private handleConnection(ws: WebSocket, address: string, isOutbound: boolean): void {
    const peer: Peer = {
      ws,
      nodeId: '',
      address,
      connected: true,
      lastSeen: Date.now(),
      version: '',
      blockHeight: 0,
      capabilities: [],
      latency: 0,
      score: {
        address,
        score: 0.5,
        successfulConnections: 1,
        failedConnections: 0,
        blocksReceived: 0,
        invalidBlocks: 0,
        latency: 0,
        lastUpdated: Date.now()
      }
    };

    this.peers.set(address, peer);
    console.log(`${isOutbound ? '→' : '←'} Peer connected: ${address}`);

    ws.on('message', (data) => {
      try {
        const message: P2PMessage = JSON.parse(data.toString());
        const handler = this.messageHandlers.get(message.type);

        if (handler) {
          handler(peer, message.data);
        }
      } catch (error) {
        console.error('Invalid message from peer');
      }
    });

    ws.on('close', () => {
      peer.connected = false;
      this.peers.delete(address);
      console.log(`✂️ Peer disconnected: ${address}`);
    });

    ws.on('error', () => {
      peer.connected = false;
      this.peers.delete(address);
    });

    // Send handshake with enhanced info
    if (isOutbound) {
      this.sendToPeer(peer, {
        type: MessageType.HANDSHAKE,
        data: {
          nodeId: this.nodeId,
          version: NODE_VERSION,
          protocolVersion: PROTOCOL_VERSION,
          network: this.config.network,
          height: this.blockchain.chain.length,
          latestHash: this.blockchain.getLatestBlock().hash,
          capabilities: this.config.capabilities
        }
      });
    }
  }

  /**
   * Send message to peer
   */
  private sendToPeer(peer: Peer, message: Omit<P2PMessage, 'nodeId' | 'timestamp'>): void {
    if (peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(JSON.stringify({
        ...message,
        nodeId: this.nodeId,
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Broadcast message to all peers
   */
  broadcast(message: Omit<P2PMessage, 'nodeId' | 'timestamp'>): void {
    for (const peer of this.peers.values()) {
      if (peer.connected) {
        this.sendToPeer(peer, message);
      }
    }
  }

  /**
   * Broadcast to all peers except one
   */
  private broadcastExcept(excludeNodeId: string, message: Omit<P2PMessage, 'nodeId' | 'timestamp'>): void {
    for (const peer of this.peers.values()) {
      if (peer.connected && peer.nodeId !== excludeNodeId) {
        this.sendToPeer(peer, message);
      }
    }
  }

  /**
   * Request blocks from peer
   */
  private requestBlocks(peer: Peer, fromIndex: number): void {
    this.sendToPeer(peer, {
      type: MessageType.GET_BLOCKS,
      data: { fromIndex }
    });
  }

  /**
   * Broadcast new block
   */
  broadcastBlock(block: Block): void {
    this.broadcast({
      type: MessageType.NEW_BLOCK,
      data: { block: block.toJSON() }
    });
  }

  /**
   * Broadcast new transaction
   */
  broadcastTransaction(transaction: Transaction): void {
    this.broadcast({
      type: MessageType.NEW_TRANSACTION,
      data: { transaction: transaction.toJSON() }
    });
  }

  /**
   * Validate new block using ChainValidator
   * This ensures no one (including creators) can inject invalid blocks
   */
  private isValidNewBlock(block: Block): boolean {
    const latestBlock = this.blockchain.getLatestBlock();

    // Basic structure checks
    if (block.index !== latestBlock.index + 1) {
      console.log(`❌ Block ${block.index} rejected: wrong index (expected ${latestBlock.index + 1})`);
      return false;
    }

    if (block.previousHash !== latestBlock.hash) {
      console.log(`❌ Block ${block.index} rejected: invalid previous hash`);
      return false;
    }

    // Use ChainValidator for thorough validation
    const validationResult = ChainValidator.validateBlock(block, latestBlock, block.index);
    if (!validationResult.valid) {
      console.log(`❌ Block ${block.index} rejected by ChainValidator: ${validationResult.message}`);
      return false;
    }

    // Verify proof of work
    if (!block.isValid()) {
      console.log(`❌ Block ${block.index} rejected: invalid proof of work`);
      return false;
    }

    return true;
  }

  /**
   * Validate entire chain received from peer
   * Prevents accepting corrupted chains
   */
  private validateReceivedChain(chain: Block[]): boolean {
    const tempBlockchain = new Blockchain();
    tempBlockchain.chain = chain;

    const result = ChainValidator.validateChain(tempBlockchain);
    if (!result.valid) {
      console.log(`❌ Received chain rejected: ${result.message}`);
      return false;
    }

    return true;
  }

  /**
   * Heartbeat - check peer connections
   */
  private async heartbeat(): Promise<void> {
    for (const peer of this.peers.values()) {
      if (peer.connected) {
        this.sendToPeer(peer, { type: MessageType.PING, data: {} });
      }
    }

    // Save current peers
    const addresses = Array.from(this.peers.values())
      .filter(p => p.connected)
      .map(p => p.address);

    await this.storage.savePeers(addresses);
  }

  /**
   * Get connected peer count
   */
  getPeerCount(): number {
    return Array.from(this.peers.values()).filter(p => p.connected).length;
  }

  /**
   * Get peer list with detailed info
   */
  getPeers(): Array<{
    nodeId: string;
    address: string;
    connected: boolean;
    version: string;
    blockHeight: number;
    capabilities: NodeCapability[];
  }> {
    return Array.from(this.peers.values()).map(p => ({
      nodeId: p.nodeId,
      address: p.address,
      connected: p.connected,
      version: p.version,
      blockHeight: p.blockHeight,
      capabilities: p.capabilities
    }));
  }

  /**
   * Get network status
   */
  getNetworkStatus(): {
    nodeId: string;
    network: string;
    version: string;
    peers: number;
    knownPeers: number;
    syncStatus: string;
    blockHeight: number;
  } {
    return {
      nodeId: this.nodeId,
      network: this.config.network,
      version: NODE_VERSION,
      peers: this.getPeerCount(),
      knownPeers: this.knownPeers.size,
      syncStatus: this.syncInProgress ? 'syncing' : 'synced',
      blockHeight: this.blockchain.chain.length
    };
  }

  /**
   * Get node ID
   */
  getNodeId(): string {
    return this.nodeId;
  }

  /**
   * Stop P2P server
   */
  async stop(): Promise<void> {
    // Stop discovery
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }

    // Close all peer connections
    for (const peer of this.peers.values()) {
      peer.ws.close();
    }

    // Close server
    if (this.server) {
      this.server.close();
    }

    console.log('🔗 P2P server stopped');
  }
}
