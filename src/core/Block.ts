import * as crypto from 'crypto';
import { Transaction } from './Transaction';

export type ConsensusType = 'PoW' | 'PoV';

/**
 * Block - The fundamental unit of the VibeCoin blockchain
 * Each block contains transactions and is linked to the previous block via hash
 * Supports both Proof of Work (PoW) and Proof of Vibe (PoV) consensus
 */
export class Block {
  public index: number;
  public timestamp: number;
  public transactions: Transaction[];
  public previousHash: string;
  public hash: string;
  public nonce: number;
  public difficulty: number;
  public miner: string;

  // Proof of Vibe fields
  public consensusType: ConsensusType;
  public validator: string;         // Validator address (PoV)
  public validatorName: string;     // Validator name (PoV)
  public vibeScore: number;         // Validator's vibe score when block was produced
  public signature: string;         // Validator's signature (PoV)
  public epoch: number;             // Epoch number (PoV)

  constructor(
    index: number,
    transactions: Transaction[],
    previousHash: string,
    difficulty: number = 4,
    miner: string = '',
    consensusType: ConsensusType = 'PoW'
  ) {
    this.index = index;
    this.timestamp = Date.now();
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.difficulty = difficulty;
    this.miner = miner;
    this.nonce = 0;
    this.consensusType = consensusType;
    this.validator = '';
    this.validatorName = '';
    this.vibeScore = 0;
    this.signature = '';
    this.epoch = 0;
    this.hash = this.calculateHash();
  }

  /**
   * Calculate the SHA-256 hash of the block
   */
  calculateHash(): string {
    const data = JSON.stringify({
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions.map(tx => tx.toJSON()),
      previousHash: this.previousHash,
      nonce: this.nonce,
      miner: this.miner,
      consensusType: this.consensusType,
      validator: this.validator,
      vibeScore: this.vibeScore,
      epoch: this.epoch
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Mine the block - Find a nonce that produces a hash with required difficulty
   * Difficulty = number of leading zeros required
   */
  mine(): void {
    const target = '0'.repeat(this.difficulty);

    console.log(`⛏️  Mining block ${this.index}...`);
    const startTime = Date.now();

    while (this.hash.substring(0, this.difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();

      // Log progress every 100000 attempts
      if (this.nonce % 100000 === 0) {
        console.log(`   Nonce: ${this.nonce}, Hash: ${this.hash.substring(0, 20)}...`);
      }
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`✅ Block ${this.index} mined!`);
    console.log(`   Hash: ${this.hash}`);
    console.log(`   Nonce: ${this.nonce}`);
    console.log(`   Time: ${duration.toFixed(2)}s`);
  }

  /**
   * Validate the block's hash
   */
  isValid(): boolean {
    // Check if hash is correctly calculated
    if (this.hash !== this.calculateHash()) {
      return false;
    }

    // Consensus-specific validation
    if (this.consensusType === 'PoW') {
      // Check if hash meets difficulty requirement
      const target = '0'.repeat(this.difficulty);
      if (this.hash.substring(0, this.difficulty) !== target) {
        return false;
      }
    } else if (this.consensusType === 'PoV') {
      // For PoV, check that validator is set
      if (!this.validator) {
        return false;
      }
      // Note: Signature verification would be done by the consensus layer
    }

    // Validate all transactions
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Set Proof of Vibe validator info
   */
  setValidator(
    validatorAddress: string,
    validatorName: string,
    vibeScore: number,
    epoch: number
  ): void {
    this.consensusType = 'PoV';
    this.validator = validatorAddress;
    this.validatorName = validatorName;
    this.vibeScore = vibeScore;
    this.epoch = epoch;
    this.hash = this.calculateHash();
  }

  /**
   * Sign the block (for PoV)
   */
  sign(signature: string): void {
    this.signature = signature;
  }

  /**
   * Check if block uses Proof of Vibe
   */
  isPoV(): boolean {
    return this.consensusType === 'PoV';
  }

  /**
   * Check if block uses Proof of Work
   */
  isPoW(): boolean {
    return this.consensusType === 'PoW';
  }

  /**
   * Check if this is the genesis block
   */
  isGenesis(): boolean {
    return this.index === 0 && this.previousHash === '0';
  }

  /**
   * Get block data as JSON
   */
  toJSON(): object {
    return {
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions.map(tx => tx.toJSON()),
      previousHash: this.previousHash,
      hash: this.hash,
      nonce: this.nonce,
      difficulty: this.difficulty,
      miner: this.miner,
      consensusType: this.consensusType,
      validator: this.validator,
      validatorName: this.validatorName,
      vibeScore: this.vibeScore,
      signature: this.signature,
      epoch: this.epoch
    };
  }

  /**
   * Create block from JSON data
   */
  static fromJSON(data: any): Block {
    const block = new Block(
      data.index,
      data.transactions.map((tx: any) => Transaction.fromJSON(tx)),
      data.previousHash,
      data.difficulty,
      data.miner,
      data.consensusType || 'PoW'
    );
    block.timestamp = data.timestamp;
    block.nonce = data.nonce;
    block.hash = data.hash;
    // PoV fields
    block.validator = data.validator || '';
    block.validatorName = data.validatorName || '';
    block.vibeScore = data.vibeScore || 0;
    block.signature = data.signature || '';
    block.epoch = data.epoch || 0;
    return block;
  }

  /**
   * Create the genesis block (first block of the chain)
   */
  static createGenesis(): Block {
    const genesisTransaction = new Transaction(
      'GENESIS',
      'GENESIS',
      0,
      'The VibeCoin Genesis Block - Code with vibes!'
    );

    const genesis = new Block(0, [genesisTransaction], '0', 1);
    genesis.timestamp = 1704067200000; // Jan 1, 2024 00:00:00 UTC
    genesis.hash = genesis.calculateHash();

    return genesis;
  }
}
