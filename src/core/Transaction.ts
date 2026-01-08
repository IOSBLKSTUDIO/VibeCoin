import * as crypto from 'crypto';
import { ec as EC } from 'elliptic';

const ec = new EC('secp256k1');

/**
 * Transaction - Represents a transfer of VIBE between addresses
 * Uses ECDSA signatures for authentication
 */
export class Transaction {
  public id: string;
  public from: string;
  public to: string;
  public amount: number;
  public timestamp: number;
  public data: string;
  public signature: string;
  public fee: number;

  constructor(
    from: string,
    to: string,
    amount: number,
    data: string = '',
    fee: number = 0.001
  ) {
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.timestamp = Date.now();
    this.data = data;
    this.fee = fee;
    this.signature = '';
    this.id = this.calculateId();
  }

  /**
   * Calculate unique transaction ID
   */
  calculateId(): string {
    const data = `${this.from}${this.to}${this.amount}${this.timestamp}${this.data}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Calculate hash for signing
   */
  calculateHash(): string {
    return crypto
      .createHash('sha256')
      .update(`${this.from}${this.to}${this.amount}${this.timestamp}${this.data}${this.fee}`)
      .digest('hex');
  }

  /**
   * Sign the transaction with a private key
   */
  sign(privateKey: string): void {
    // Genesis and mining reward transactions don't need signing
    if (this.from === 'GENESIS' || this.from === 'MINING_REWARD') {
      this.signature = 'SYSTEM';
      return;
    }

    const keyPair = ec.keyFromPrivate(privateKey, 'hex');
    const publicKey = keyPair.getPublic('hex');

    // Verify the public key matches the from address
    if (publicKey !== this.from) {
      throw new Error('Cannot sign transaction for other wallets!');
    }

    const hash = this.calculateHash();
    const signature = keyPair.sign(hash, 'base64');
    this.signature = signature.toDER('hex');
  }

  /**
   * Verify the transaction signature
   */
  isValid(): boolean {
    // Genesis and mining reward transactions are always valid
    if (this.from === 'GENESIS' || this.from === 'MINING_REWARD') {
      return true;
    }

    // Check if signature exists
    if (!this.signature || this.signature.length === 0) {
      console.log('❌ Transaction has no signature');
      return false;
    }

    // Verify signature
    try {
      const publicKey = ec.keyFromPublic(this.from, 'hex');
      const hash = this.calculateHash();
      return publicKey.verify(hash, this.signature);
    } catch (error) {
      console.log('❌ Invalid signature:', error);
      return false;
    }
  }

  /**
   * Check if this is a coinbase/mining reward transaction
   */
  isCoinbase(): boolean {
    return this.from === 'MINING_REWARD';
  }

  /**
   * Get total cost (amount + fee)
   */
  getTotalCost(): number {
    return this.amount + this.fee;
  }

  /**
   * Get transaction as JSON
   */
  toJSON(): object {
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

  /**
   * Create transaction from JSON
   */
  static fromJSON(data: any): Transaction {
    const tx = new Transaction(
      data.from,
      data.to,
      data.amount,
      data.data,
      data.fee
    );
    tx.id = data.id;
    tx.timestamp = data.timestamp;
    tx.signature = data.signature;
    return tx;
  }

  /**
   * Create a mining reward transaction
   */
  static createCoinbase(minerAddress: string, reward: number): Transaction {
    const tx = new Transaction(
      'MINING_REWARD',
      minerAddress,
      reward,
      'Block mining reward'
    );
    tx.fee = 0;
    tx.signature = 'SYSTEM';
    return tx;
  }

  /**
   * Format transaction for display
   */
  toString(): string {
    const fromShort = this.from.substring(0, 8) + '...';
    const toShort = this.to.substring(0, 8) + '...';
    return `TX ${this.id.substring(0, 8)}: ${fromShort} → ${toShort} | ${this.amount} VIBE`;
  }
}
