/**
 * VibeCoin Browser Blockchain
 * Complete blockchain implementation for browser demo
 */
import { generateKeyPair, sign, verify, getPublicKey } from './crypto';

// ==================== TRANSACTION ====================

export interface TransactionData {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  data: string;
  fee: number;
  signature: string;
}

export class Transaction {
  public id: string;
  public from: string;
  public to: string;
  public amount: number;
  public timestamp: number;
  public data: string;
  public fee: number;
  public signature: string;

  constructor(from: string, to: string, amount: number, data: string = '', fee: number = 0.001) {
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.timestamp = Date.now();
    this.data = data;
    this.fee = fee;
    this.signature = '';
    this.id = this.calculateId();
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  calculateId(): string {
    return this.simpleHash(`${this.from}${this.to}${this.amount}${this.timestamp}${Math.random()}`);
  }

  calculateHash(): string {
    return this.simpleHash(`${this.from}${this.to}${this.amount}${this.timestamp}${this.data}${this.fee}`);
  }

  sign(privateKey: string): void {
    if (this.from === 'GENESIS' || this.from === 'MINING_REWARD') {
      this.signature = 'SYSTEM';
      return;
    }
    const publicKey = getPublicKey(privateKey);
    if (publicKey !== this.from) {
      throw new Error('Cannot sign transaction for other wallets!');
    }
    this.signature = sign(privateKey, this.calculateHash());
  }

  isValid(): boolean {
    if (this.from === 'GENESIS' || this.from === 'MINING_REWARD') return true;
    if (!this.signature) return false;
    return verify(this.from, this.calculateHash(), this.signature);
  }

  isCoinbase(): boolean {
    return this.from === 'MINING_REWARD';
  }

  getTotalCost(): number {
    return this.amount + this.fee;
  }

  toJSON(): TransactionData {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      amount: this.amount,
      timestamp: this.timestamp,
      data: this.data,
      fee: this.fee,
      signature: this.signature
    };
  }

  static fromJSON(data: TransactionData): Transaction {
    const tx = new Transaction(data.from, data.to, data.amount, data.data, data.fee);
    tx.id = data.id;
    tx.timestamp = data.timestamp;
    tx.signature = data.signature;
    return tx;
  }

  static createCoinbase(minerAddress: string, reward: number): Transaction {
    const tx = new Transaction('MINING_REWARD', minerAddress, reward, 'Block mining reward');
    tx.fee = 0;
    tx.signature = 'SYSTEM';
    return tx;
  }
}

// ==================== BLOCK ====================

export interface BlockData {
  index: number;
  timestamp: number;
  transactions: TransactionData[];
  previousHash: string;
  hash: string;
  nonce: number;
  difficulty: number;
  miner: string;
}

export class Block {
  public index: number;
  public timestamp: number;
  public transactions: Transaction[];
  public previousHash: string;
  public hash: string;
  public nonce: number;
  public difficulty: number;
  public miner: string;

  constructor(
    index: number,
    transactions: Transaction[],
    previousHash: string,
    difficulty: number = 2,
    miner: string = ''
  ) {
    this.index = index;
    this.timestamp = Date.now();
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.difficulty = difficulty;
    this.miner = miner;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  private simpleHash(str: string): string {
    let hash1 = 5381;
    let hash2 = 52711;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash1 = (hash1 * 33) ^ char;
      hash2 = (hash2 * 33) ^ char;
    }
    return (Math.abs(hash1).toString(16).padStart(8, '0') +
            Math.abs(hash2).toString(16).padStart(8, '0') +
            Math.abs(hash1 ^ hash2).toString(16).padStart(8, '0') +
            Math.abs(hash1 + hash2).toString(16).padStart(8, '0')).substring(0, 64);
  }

  calculateHash(): string {
    const data = JSON.stringify({
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions.map(tx => tx.toJSON()),
      previousHash: this.previousHash,
      nonce: this.nonce,
      miner: this.miner
    });
    return this.simpleHash(data);
  }

  mine(onProgress?: (nonce: number, hash: string) => void): void {
    const target = '0'.repeat(this.difficulty);

    while (!this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = this.calculateHash();

      if (onProgress && this.nonce % 1000 === 0) {
        onProgress(this.nonce, this.hash);
      }
    }
  }

  isValid(): boolean {
    if (this.hash !== this.calculateHash()) return false;
    if (!this.hash.startsWith('0'.repeat(this.difficulty))) return false;
    return this.transactions.every(tx => tx.isValid());
  }

  toJSON(): BlockData {
    return {
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions.map(tx => tx.toJSON()),
      previousHash: this.previousHash,
      hash: this.hash,
      nonce: this.nonce,
      difficulty: this.difficulty,
      miner: this.miner
    };
  }

  static fromJSON(data: BlockData): Block {
    const block = new Block(
      data.index,
      data.transactions.map(tx => Transaction.fromJSON(tx)),
      data.previousHash,
      data.difficulty,
      data.miner
    );
    block.timestamp = data.timestamp;
    block.nonce = data.nonce;
    block.hash = data.hash;
    return block;
  }

  static createGenesis(): Block {
    const genesisTx = new Transaction('GENESIS', 'GENESIS', 0, 'VibeCoin Genesis - Code with vibes!');
    const genesis = new Block(0, [genesisTx], '0', 1);
    genesis.timestamp = 1704067200000;
    genesis.hash = genesis.calculateHash();
    return genesis;
  }
}

// ==================== BLOCKCHAIN ====================

export const CONFIG = {
  NAME: 'VibeCoin',
  SYMBOL: 'VIBE',
  MAX_SUPPLY: 21_000_000,
  INITIAL_REWARD: 50,
  INITIAL_DIFFICULTY: 2, // Lower for demo
  MIN_FEE: 0.001
};

export class Blockchain {
  public chain: Block[];
  public difficulty: number;
  public pendingTransactions: Transaction[];
  public miningReward: number;

  constructor() {
    this.chain = [Block.createGenesis()];
    this.difficulty = CONFIG.INITIAL_DIFFICULTY;
    this.pendingTransactions = [];
    this.miningReward = CONFIG.INITIAL_REWARD;
  }

  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  addTransaction(transaction: Transaction): boolean {
    if (!transaction.from || !transaction.to) return false;
    if (!transaction.isValid()) return false;

    if (!transaction.isCoinbase()) {
      const balance = this.getBalance(transaction.from);
      if (balance < transaction.getTotalCost()) return false;
    }

    this.pendingTransactions.push(transaction);
    return true;
  }

  minePendingTransactions(
    minerAddress: string,
    onProgress?: (nonce: number, hash: string) => void
  ): Block {
    const rewardTx = Transaction.createCoinbase(minerAddress, this.miningReward);
    const transactions = [rewardTx, ...this.pendingTransactions.slice(0, 99)];

    const totalFees = transactions
      .filter(tx => !tx.isCoinbase())
      .reduce((sum, tx) => sum + tx.fee, 0);
    rewardTx.amount += totalFees;

    const block = new Block(
      this.chain.length,
      transactions,
      this.getLatestBlock().hash,
      this.difficulty,
      minerAddress
    );

    block.mine(onProgress);
    this.chain.push(block);

    const minedIds = new Set(transactions.map(tx => tx.id));
    this.pendingTransactions = this.pendingTransactions.filter(tx => !minedIds.has(tx.id));

    return block;
  }

  getBalance(address: string): number {
    let balance = 0;
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.from === address) balance -= tx.amount + tx.fee;
        if (tx.to === address) balance += tx.amount;
      }
    }
    return balance;
  }

  getTransactionHistory(address: string): Transaction[] {
    const history: Transaction[] = [];
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.from === address || tx.to === address) {
          history.push(tx);
        }
      }
    }
    return history.sort((a, b) => b.timestamp - a.timestamp);
  }

  isValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];
      if (!current.isValid()) return false;
      if (current.previousHash !== previous.hash) return false;
    }
    return true;
  }

  getCirculatingSupply(): number {
    let supply = 0;
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.isCoinbase() || tx.from === 'GENESIS') {
          supply += tx.amount;
        }
      }
    }
    return supply;
  }

  getStats() {
    return {
      name: CONFIG.NAME,
      symbol: CONFIG.SYMBOL,
      blocks: this.chain.length,
      difficulty: this.difficulty,
      pendingTransactions: this.pendingTransactions.length,
      miningReward: this.miningReward,
      circulatingSupply: this.getCirculatingSupply(),
      maxSupply: CONFIG.MAX_SUPPLY,
      isValid: this.isValid()
    };
  }
}

// ==================== WALLET ====================

export class Wallet {
  public privateKey: string;
  public publicKey: string;
  public address: string;

  constructor(privateKey?: string) {
    if (privateKey) {
      this.privateKey = privateKey;
      this.publicKey = getPublicKey(privateKey);
    } else {
      const keys = generateKeyPair();
      this.privateKey = keys.privateKey;
      this.publicKey = keys.publicKey;
    }
    this.address = this.publicKey;
  }

  getShortAddress(): string {
    return `${this.address.substring(0, 8)}...${this.address.substring(this.address.length - 6)}`;
  }

  createTransaction(to: string, amount: number, data: string = ''): Transaction {
    const tx = new Transaction(this.publicKey, to, amount, data);
    tx.sign(this.privateKey);
    return tx;
  }

  getBalance(blockchain: Blockchain): number {
    return blockchain.getBalance(this.publicKey);
  }

  send(blockchain: Blockchain, to: string, amount: number, data: string = ''): boolean {
    const balance = this.getBalance(blockchain);
    if (balance < amount + 0.001) return false;
    const tx = this.createTransaction(to, amount, data);
    return blockchain.addTransaction(tx);
  }

  exportWallet() {
    return {
      privateKey: this.privateKey,
      publicKey: this.publicKey,
      address: this.address
    };
  }

  static importWallet(privateKey: string): Wallet {
    return new Wallet(privateKey);
  }
}
