import * as crypto from 'crypto';
import { ec as EC } from 'elliptic';
import { Transaction } from '../core/Transaction';
import { Blockchain } from '../core/Blockchain';

const ec = new EC('secp256k1');

/**
 * Wallet - Manages keys and creates signed transactions
 * Uses ECDSA with secp256k1 curve (same as Bitcoin/Ethereum)
 */
export class Wallet {
  private privateKey: string;
  public publicKey: string;
  public address: string;

  constructor(privateKey?: string) {
    if (privateKey) {
      // Import existing wallet
      const keyPair = ec.keyFromPrivate(privateKey, 'hex');
      this.privateKey = privateKey;
      this.publicKey = keyPair.getPublic('hex');
    } else {
      // Generate new wallet
      const keyPair = ec.genKeyPair();
      this.privateKey = keyPair.getPrivate('hex');
      this.publicKey = keyPair.getPublic('hex');
    }

    // Address is the public key (in real crypto, it would be hashed)
    this.address = this.publicKey;
  }

  /**
   * Get the private key (handle with care!)
   */
  getPrivateKey(): string {
    return this.privateKey;
  }

  /**
   * Get short address for display
   */
  getShortAddress(): string {
    return `${this.address.substring(0, 8)}...${this.address.substring(this.address.length - 8)}`;
  }

  /**
   * Create and sign a transaction
   */
  createTransaction(to: string, amount: number, data: string = '', fee: number = 0.001): Transaction {
    const transaction = new Transaction(this.publicKey, to, amount, data, fee);
    transaction.sign(this.privateKey);
    return transaction;
  }

  /**
   * Get balance from blockchain
   */
  getBalance(blockchain: Blockchain): number {
    return blockchain.getBalance(this.publicKey);
  }

  /**
   * Get pending balance
   */
  getPendingBalance(blockchain: Blockchain): number {
    return blockchain.getPendingBalance(this.publicKey);
  }

  /**
   * Get available balance (confirmed - pending outgoing)
   */
  getAvailableBalance(blockchain: Blockchain): number {
    return this.getBalance(blockchain) - this.getPendingBalance(blockchain);
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(blockchain: Blockchain): Transaction[] {
    return blockchain.getTransactionHistory(this.publicKey);
  }

  /**
   * Send VIBE to another address
   */
  send(
    blockchain: Blockchain,
    to: string,
    amount: number,
    data: string = ''
  ): { success: boolean; transaction?: Transaction; error?: string } {
    // Check available balance
    const available = this.getAvailableBalance(blockchain);
    const fee = 0.001;
    const total = amount + fee;

    if (available < total) {
      return {
        success: false,
        error: `Insufficient balance. Available: ${available} VIBE, Required: ${total} VIBE`
      };
    }

    // Create and sign transaction
    const transaction = this.createTransaction(to, amount, data, fee);

    // Add to pending pool
    const added = blockchain.addTransaction(transaction);

    if (added) {
      return { success: true, transaction };
    } else {
      return { success: false, error: 'Transaction rejected by blockchain' };
    }
  }

  /**
   * Export wallet as JSON (WARNING: includes private key!)
   */
  exportWallet(): object {
    return {
      privateKey: this.privateKey,
      publicKey: this.publicKey,
      address: this.address
    };
  }

  /**
   * Export only public information
   */
  exportPublic(): object {
    return {
      publicKey: this.publicKey,
      address: this.address
    };
  }

  /**
   * Import wallet from JSON
   */
  static importWallet(data: { privateKey: string }): Wallet {
    return new Wallet(data.privateKey);
  }

  /**
   * Generate mnemonic seed phrase (simplified version)
   * In production, use BIP-39
   */
  static generateMnemonic(): string[] {
    const wordList = [
      'vibe', 'code', 'block', 'chain', 'crypto', 'hash', 'mine', 'node',
      'peer', 'sign', 'key', 'wallet', 'send', 'receive', 'balance', 'fee',
      'reward', 'stake', 'vote', 'dao', 'smart', 'contract', 'token', 'coin',
      'flow', 'create', 'build', 'ship', 'deploy', 'test', 'debug', 'commit'
    ];

    const mnemonic: string[] = [];
    for (let i = 0; i < 12; i++) {
      const randomIndex = crypto.randomInt(0, wordList.length);
      mnemonic.push(wordList[randomIndex]);
    }

    return mnemonic;
  }

  /**
   * Create wallet from mnemonic (simplified)
   */
  static fromMnemonic(mnemonic: string[]): Wallet {
    const seed = mnemonic.join(' ');
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    return new Wallet(hash);
  }

  /**
   * Verify if an address is valid
   */
  static isValidAddress(address: string): boolean {
    try {
      // Check if it's a valid public key
      if (address.length !== 130) return false;
      ec.keyFromPublic(address, 'hex');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Display wallet info
   */
  toString(): string {
    return `
╔════════════════════════════════════════════════════════════════╗
║                     VIBECOIN WALLET                             ║
╠════════════════════════════════════════════════════════════════╣
║ Address: ${this.getShortAddress()}
║ Public Key: ${this.publicKey.substring(0, 32)}...
╚════════════════════════════════════════════════════════════════╝
    `.trim();
  }
}
