/**
 * VibeCoin Storage - Persistent blockchain storage using LevelDB
 */
import { Level } from 'level';
import { Block } from '../core/Block';
import { Transaction } from '../core/Transaction';
import { Blockchain } from '../core/Blockchain';
import { Wallet } from '../wallet/Wallet';
import * as fs from 'fs';
import * as path from 'path';

export interface StorageConfig {
  dataDir: string;
  network: 'mainnet' | 'testnet' | 'local';
}

export class Storage {
  private db: Level<string, string>;
  private config: StorageConfig;
  private dataPath: string;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = {
      dataDir: config.dataDir || './data',
      network: config.network || 'testnet'
    };

    this.dataPath = path.join(this.config.dataDir, this.config.network);

    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }

    this.db = new Level(path.join(this.dataPath, 'chaindata'));
  }

  /**
   * Initialize storage and open database
   */
  async init(): Promise<void> {
    await this.db.open();
    console.log(`📂 Storage initialized at ${this.dataPath}`);
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.db.close();
    console.log('📂 Storage closed');
  }

  // ==================== BLOCKCHAIN ====================

  /**
   * Save entire blockchain
   */
  async saveBlockchain(blockchain: Blockchain): Promise<void> {
    const batch = this.db.batch();

    // Save chain metadata
    batch.put('meta:height', blockchain.chain.length.toString());
    batch.put('meta:difficulty', blockchain.difficulty.toString());
    batch.put('meta:miningReward', blockchain.miningReward.toString());

    // Save each block
    for (const block of blockchain.chain) {
      await this.saveBlock(block);
    }

    // Save pending transactions
    batch.put('pending:count', blockchain.pendingTransactions.length.toString());
    for (let i = 0; i < blockchain.pendingTransactions.length; i++) {
      batch.put(`pending:${i}`, JSON.stringify(blockchain.pendingTransactions[i].toJSON()));
    }

    await batch.write();
    console.log(`💾 Blockchain saved (${blockchain.chain.length} blocks)`);
  }

  /**
   * Load blockchain from storage
   */
  async loadBlockchain(): Promise<Blockchain | null> {
    try {
      const heightStr = await this.db.get('meta:height');
      const height = parseInt(heightStr);

      if (isNaN(height) || height === 0) {
        return null;
      }

      const blockchain = new Blockchain();
      blockchain.chain = [];

      // Load blocks
      for (let i = 0; i < height; i++) {
        const block = await this.loadBlock(i);
        if (block) {
          blockchain.chain.push(block);
        }
      }

      // Verify we loaded at least one block
      if (blockchain.chain.length === 0) {
        return null;
      }

      // Load metadata
      const diffStr = await this.db.get('meta:difficulty');
      const rewardStr = await this.db.get('meta:miningReward');
      blockchain.difficulty = parseInt(diffStr) || 4;
      blockchain.miningReward = parseFloat(rewardStr) || 50;

      // Load pending transactions
      blockchain.pendingTransactions = [];
      try {
        const pendingCountStr = await this.db.get('pending:count');
        const pendingCount = parseInt(pendingCountStr) || 0;

        for (let i = 0; i < pendingCount; i++) {
          const txData = JSON.parse(await this.db.get(`pending:${i}`));
          blockchain.pendingTransactions.push(Transaction.fromJSON(txData));
        }
      } catch {
        // No pending transactions
      }

      console.log(`📂 Blockchain loaded (${blockchain.chain.length} blocks)`);
      return blockchain;
    } catch (error) {
      console.log('📂 No existing blockchain found, starting fresh');
      return null;
    }
  }

  // ==================== BLOCKS ====================

  /**
   * Save a single block
   */
  async saveBlock(block: Block): Promise<void> {
    const blockData = JSON.stringify(block.toJSON());

    await this.db.batch()
      .put(`block:${block.index}`, blockData)
      .put(`block:hash:${block.hash}`, block.index.toString())
      .write();
  }

  /**
   * Load block by index
   */
  async loadBlock(index: number): Promise<Block | null> {
    try {
      const blockData = await this.db.get(`block:${index}`);
      return Block.fromJSON(JSON.parse(blockData));
    } catch {
      return null;
    }
  }

  /**
   * Load block by hash
   */
  async loadBlockByHash(hash: string): Promise<Block | null> {
    try {
      const indexStr = await this.db.get(`block:hash:${hash}`);
      return this.loadBlock(parseInt(indexStr));
    } catch {
      return null;
    }
  }

  /**
   * Get latest block
   */
  async getLatestBlock(): Promise<Block | null> {
    try {
      const heightStr = await this.db.get('meta:height');
      const height = parseInt(heightStr);
      return this.loadBlock(height - 1);
    } catch {
      return null;
    }
  }

  // ==================== TRANSACTIONS ====================

  /**
   * Save transaction to index
   */
  async indexTransaction(tx: Transaction, blockIndex: number): Promise<void> {
    await this.db.batch()
      .put(`tx:${tx.id}`, JSON.stringify({ ...tx.toJSON(), blockIndex }))
      .put(`addr:${tx.from}:${tx.id}`, tx.id)
      .put(`addr:${tx.to}:${tx.id}`, tx.id)
      .write();
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(txId: string): Promise<{ tx: Transaction; blockIndex: number } | null> {
    try {
      const data = JSON.parse(await this.db.get(`tx:${txId}`));
      return {
        tx: Transaction.fromJSON(data),
        blockIndex: data.blockIndex
      };
    } catch {
      return null;
    }
  }

  /**
   * Get transactions for an address
   */
  async getAddressTransactions(address: string): Promise<string[]> {
    const txIds: string[] = [];

    for await (const [key, value] of this.db.iterator({
      gte: `addr:${address}:`,
      lte: `addr:${address}:\xFF`
    })) {
      txIds.push(value);
    }

    return txIds;
  }

  // ==================== WALLETS ====================

  /**
   * Save wallet (encrypted)
   */
  async saveWallet(wallet: Wallet, name: string): Promise<void> {
    const walletData = wallet.exportWallet();
    await this.db.put(`wallet:${name}`, JSON.stringify(walletData));
    console.log(`💾 Wallet "${name}" saved`);
  }

  /**
   * Load wallet by name
   */
  async loadWallet(name: string): Promise<Wallet | null> {
    try {
      const data = JSON.parse(await this.db.get(`wallet:${name}`));
      return Wallet.importWallet(data);
    } catch {
      return null;
    }
  }

  /**
   * List all saved wallets
   */
  async listWallets(): Promise<string[]> {
    const names: string[] = [];

    for await (const [key] of this.db.iterator({
      gte: 'wallet:',
      lte: 'wallet:\xFF'
    })) {
      names.push(key.replace('wallet:', ''));
    }

    return names;
  }

  // ==================== PEERS ====================

  /**
   * Save known peers
   */
  async savePeers(peers: string[]): Promise<void> {
    await this.db.put('peers', JSON.stringify(peers));
  }

  /**
   * Load known peers
   */
  async loadPeers(): Promise<string[]> {
    try {
      return JSON.parse(await this.db.get('peers'));
    } catch {
      return [];
    }
  }

  // ==================== USER ACTIVITY (Rewards) ====================

  /**
   * Save user activity data for rewards system
   */
  async saveUserActivity(address: string, activity: object): Promise<void> {
    await this.db.put(`activity:${address}`, JSON.stringify(activity));
  }

  /**
   * Load user activity data
   */
  async loadUserActivity(address: string): Promise<object | null> {
    try {
      const data = await this.db.get(`activity:${address}`);
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Save all user activities (batch operation)
   */
  async saveAllUserActivities(activities: Map<string, object>): Promise<void> {
    const batch = this.db.batch();
    for (const [address, activity] of activities) {
      batch.put(`activity:${address}`, JSON.stringify(activity));
    }
    await batch.write();
  }

  /**
   * Load all user activities
   */
  async loadAllUserActivities(): Promise<Map<string, object>> {
    const activities = new Map<string, object>();

    for await (const [key, value] of this.db.iterator({
      gte: 'activity:',
      lte: 'activity:\xFF'
    })) {
      const address = key.replace('activity:', '');
      try {
        activities.set(address, JSON.parse(value));
      } catch {
        // Skip invalid data
      }
    }

    return activities;
  }

  // ==================== UTILITIES ====================

  /**
   * Clear all data (use with caution!)
   */
  async clearAll(): Promise<void> {
    await this.db.clear();
    console.log('⚠️ All data cleared');
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<object> {
    let blockCount = 0;
    let txCount = 0;
    let walletCount = 0;

    try {
      blockCount = parseInt(await this.db.get('meta:height'));
    } catch {}

    for await (const _ of this.db.iterator({ gte: 'tx:', lte: 'tx:\xFF' })) {
      txCount++;
    }

    for await (const _ of this.db.iterator({ gte: 'wallet:', lte: 'wallet:\xFF' })) {
      walletCount++;
    }

    return {
      dataPath: this.dataPath,
      network: this.config.network,
      blocks: blockCount,
      transactions: txCount,
      wallets: walletCount
    };
  }
}
