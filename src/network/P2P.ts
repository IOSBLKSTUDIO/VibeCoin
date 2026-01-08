/**
 * VibeCoin P2P Network - Peer-to-peer communication between nodes
 */
import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Blockchain } from '../core/Blockchain';
import { Block } from '../core/Block';
import { Transaction } from '../core/Transaction';
import { Storage } from '../storage/Storage';

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
  PONG = 'PONG'
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
}

export interface P2PConfig {
  port: number;
  maxPeers: number;
  seedNodes: string[];
}

export class P2PNetwork {
  private server: WebSocketServer | null = null;
  private peers: Map<string, Peer> = new Map();
  private blockchain: Blockchain;
  private storage: Storage;
  private config: P2PConfig;
  private nodeId: string;
  private messageHandlers: Map<MessageType, (peer: Peer, data: any) => void> = new Map();

  constructor(blockchain: Blockchain, storage: Storage, config: Partial<P2PConfig> = {}) {
    this.blockchain = blockchain;
    this.storage = storage;
    this.nodeId = uuidv4();
    this.config = {
      port: config.port || 6001,
      maxPeers: config.maxPeers || 25,
      seedNodes: config.seedNodes || []
    };

    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    // Handshake
    this.messageHandlers.set(MessageType.HANDSHAKE, (peer, data) => {
      peer.nodeId = data.nodeId;
      console.log(`🤝 Handshake from ${peer.nodeId.substring(0, 8)}`);

      this.sendToPeer(peer, {
        type: MessageType.HANDSHAKE_REPLY,
        data: {
          nodeId: this.nodeId,
          height: this.blockchain.chain.length,
          latestHash: this.blockchain.getLatestBlock().hash
        }
      });
    });

    // Handshake reply
    this.messageHandlers.set(MessageType.HANDSHAKE_REPLY, (peer, data) => {
      peer.nodeId = data.nodeId;
      console.log(`🤝 Connected to ${peer.nodeId.substring(0, 8)} (height: ${data.height})`);

      // If peer has more blocks, request sync
      if (data.height > this.blockchain.chain.length) {
        this.requestBlocks(peer, this.blockchain.chain.length);
      }
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

    // Connect to seed nodes
    for (const seed of this.config.seedNodes) {
      await this.connectToPeer(seed);
    }

    // Load saved peers
    const savedPeers = await this.storage.loadPeers();
    for (const peer of savedPeers) {
      await this.connectToPeer(peer);
    }

    // Start heartbeat
    setInterval(() => this.heartbeat(), 30000);
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
      lastSeen: Date.now()
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

    // Send handshake
    if (isOutbound) {
      this.sendToPeer(peer, {
        type: MessageType.HANDSHAKE,
        data: {
          nodeId: this.nodeId,
          height: this.blockchain.chain.length,
          latestHash: this.blockchain.getLatestBlock().hash
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
   * Validate new block
   */
  private isValidNewBlock(block: Block): boolean {
    const latestBlock = this.blockchain.getLatestBlock();

    if (block.index !== latestBlock.index + 1) {
      return false;
    }

    if (block.previousHash !== latestBlock.hash) {
      return false;
    }

    if (!block.isValid()) {
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
   * Get peer list
   */
  getPeers(): Array<{ nodeId: string; address: string; connected: boolean }> {
    return Array.from(this.peers.values()).map(p => ({
      nodeId: p.nodeId,
      address: p.address,
      connected: p.connected
    }));
  }

  /**
   * Stop P2P server
   */
  async stop(): Promise<void> {
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
