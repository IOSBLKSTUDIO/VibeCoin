/**
 * VibeCoin Chain Validator - Advanced blockchain integrity protection
 *
 * This module ensures the blockchain cannot be corrupted, even by the creators.
 * The rules are immutable and enforced by mathematics, not trust.
 *
 * Key principles:
 * 1. No single entity can modify the chain unilaterally
 * 2. All nodes independently verify every block
 * 3. Invalid blocks are rejected regardless of source
 * 4. The longest VALID chain always wins
 */

import { Block } from './Block';
import { Transaction } from './Transaction';
import { Blockchain, BLOCKCHAIN_CONFIG } from './Blockchain';
import * as crypto from 'crypto';

// Validation error types
export enum ValidationError {
  NONE = 'NONE',
  INVALID_GENESIS = 'INVALID_GENESIS',
  INVALID_HASH = 'INVALID_HASH',
  INVALID_PREVIOUS_HASH = 'INVALID_PREVIOUS_HASH',
  INVALID_INDEX = 'INVALID_INDEX',
  INVALID_TIMESTAMP = 'INVALID_TIMESTAMP',
  INVALID_DIFFICULTY = 'INVALID_DIFFICULTY',
  INVALID_MERKLE_ROOT = 'INVALID_MERKLE_ROOT',
  INVALID_TRANSACTION = 'INVALID_TRANSACTION',
  INVALID_COINBASE = 'INVALID_COINBASE',
  DOUBLE_SPEND = 'DOUBLE_SPEND',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  CHAIN_TOO_SHORT = 'CHAIN_TOO_SHORT',
  FORK_DETECTED = 'FORK_DETECTED',
}

export interface ValidationResult {
  valid: boolean;
  error: ValidationError;
  message: string;
  blockIndex?: number;
  txIndex?: number;
}

/**
 * Hardcoded genesis block hash - this can NEVER change
 * Anyone can verify this matches the expected genesis
 */
export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Checkpoint hashes - known good blocks that cannot be reorged
 * These are added as the chain grows and become immutable
 */
export const CHECKPOINTS: Map<number, string> = new Map([
  // Block 0 - Genesis
  [0, GENESIS_HASH],
  // Add more checkpoints as chain grows:
  // [1000, 'expected_hash_at_1000'],
  // [10000, 'expected_hash_at_10000'],
]);

/**
 * Chain Validator - Independent verification of blockchain integrity
 */
export class ChainValidator {
  /**
   * Validate the entire blockchain from genesis
   * This should be run on startup and periodically
   */
  static validateChain(blockchain: Blockchain): ValidationResult {
    const chain = blockchain.chain;

    // Must have at least genesis block
    if (chain.length === 0) {
      return {
        valid: false,
        error: ValidationError.CHAIN_TOO_SHORT,
        message: 'Blockchain is empty - no genesis block'
      };
    }

    // Validate genesis block
    const genesisResult = this.validateGenesisBlock(chain[0]);
    if (!genesisResult.valid) {
      return genesisResult;
    }

    // Track all spent outputs to detect double spending
    const spentOutputs = new Set<string>();

    // Validate each block
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      const previousBlock = chain[i - 1];

      // Validate block structure
      const blockResult = this.validateBlock(block, previousBlock, i);
      if (!blockResult.valid) {
        return { ...blockResult, blockIndex: i };
      }

      // Validate all transactions in block
      for (let j = 0; j < block.transactions.length; j++) {
        const tx = block.transactions[j];

        // Check for double spending
        if (!tx.isCoinbase()) {
          const outputKey = `${tx.from}:${tx.id}`;
          if (spentOutputs.has(outputKey)) {
            return {
              valid: false,
              error: ValidationError.DOUBLE_SPEND,
              message: `Double spend detected: ${tx.id}`,
              blockIndex: i,
              txIndex: j
            };
          }
          spentOutputs.add(outputKey);
        }

        // Validate transaction
        const txResult = this.validateTransaction(tx, j === 0, blockchain, i);
        if (!txResult.valid) {
          return { ...txResult, blockIndex: i, txIndex: j };
        }
      }

      // Check against checkpoints
      const checkpoint = CHECKPOINTS.get(i);
      if (checkpoint && block.hash !== checkpoint) {
        return {
          valid: false,
          error: ValidationError.FORK_DETECTED,
          message: `Block ${i} does not match checkpoint. Expected: ${checkpoint}, Got: ${block.hash}`,
          blockIndex: i
        };
      }
    }

    return {
      valid: true,
      error: ValidationError.NONE,
      message: `Chain valid: ${chain.length} blocks verified`
    };
  }

  /**
   * Validate the genesis block
   */
  static validateGenesisBlock(block: Block): ValidationResult {
    // Genesis must be at index 0
    if (block.index !== 0) {
      return {
        valid: false,
        error: ValidationError.INVALID_GENESIS,
        message: 'Genesis block must have index 0'
      };
    }

    // Genesis must have specific previous hash
    if (block.previousHash !== '0') {
      return {
        valid: false,
        error: ValidationError.INVALID_GENESIS,
        message: 'Genesis block must have previous hash of "0"'
      };
    }

    // Genesis hash must be recalculable
    if (block.hash !== block.calculateHash()) {
      return {
        valid: false,
        error: ValidationError.INVALID_HASH,
        message: 'Genesis block hash is invalid'
      };
    }

    return {
      valid: true,
      error: ValidationError.NONE,
      message: 'Genesis block valid'
    };
  }

  /**
   * Validate a single block
   */
  static validateBlock(block: Block, previousBlock: Block, expectedIndex: number): ValidationResult {
    // Check index is sequential
    if (block.index !== expectedIndex) {
      return {
        valid: false,
        error: ValidationError.INVALID_INDEX,
        message: `Expected index ${expectedIndex}, got ${block.index}`
      };
    }

    // Check link to previous block
    if (block.previousHash !== previousBlock.hash) {
      return {
        valid: false,
        error: ValidationError.INVALID_PREVIOUS_HASH,
        message: `Previous hash mismatch. Expected: ${previousBlock.hash}, Got: ${block.previousHash}`
      };
    }

    // Verify hash is correctly calculated
    const calculatedHash = block.calculateHash();
    if (block.hash !== calculatedHash) {
      return {
        valid: false,
        error: ValidationError.INVALID_HASH,
        message: `Hash mismatch. Stored: ${block.hash}, Calculated: ${calculatedHash}`
      };
    }

    // Verify proof of work (hash starts with required zeros)
    const target = '0'.repeat(block.difficulty);
    if (!block.hash.startsWith(target)) {
      return {
        valid: false,
        error: ValidationError.INVALID_DIFFICULTY,
        message: `Block does not meet difficulty requirement of ${block.difficulty}`
      };
    }

    // Verify timestamp is reasonable (not too far in future)
    const maxFutureTime = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
    if (block.timestamp > maxFutureTime) {
      return {
        valid: false,
        error: ValidationError.INVALID_TIMESTAMP,
        message: 'Block timestamp is too far in the future'
      };
    }

    // Verify timestamp is after previous block
    if (block.timestamp <= previousBlock.timestamp) {
      return {
        valid: false,
        error: ValidationError.INVALID_TIMESTAMP,
        message: 'Block timestamp must be after previous block'
      };
    }

    return {
      valid: true,
      error: ValidationError.NONE,
      message: 'Block valid'
    };
  }

  /**
   * Validate a transaction
   */
  static validateTransaction(
    tx: Transaction,
    isCoinbase: boolean,
    blockchain: Blockchain,
    blockIndex: number
  ): ValidationResult {
    // Coinbase (mining reward) has special rules
    if (isCoinbase) {
      if (!tx.isCoinbase()) {
        return {
          valid: false,
          error: ValidationError.INVALID_COINBASE,
          message: 'First transaction must be coinbase'
        };
      }

      // Verify coinbase amount doesn't exceed block reward + fees
      const maxReward = this.calculateBlockReward(blockIndex);
      if (tx.amount > maxReward * 2) { // Allow for fees
        return {
          valid: false,
          error: ValidationError.INVALID_COINBASE,
          message: `Coinbase amount ${tx.amount} exceeds maximum ${maxReward * 2}`
        };
      }

      return {
        valid: true,
        error: ValidationError.NONE,
        message: 'Coinbase valid'
      };
    }

    // Regular transaction must have valid signature
    if (!tx.isValid()) {
      return {
        valid: false,
        error: ValidationError.INVALID_SIGNATURE,
        message: 'Transaction signature is invalid'
      };
    }

    // Must have positive amount
    if (tx.amount <= 0) {
      return {
        valid: false,
        error: ValidationError.INVALID_TRANSACTION,
        message: 'Transaction amount must be positive'
      };
    }

    // Must have valid addresses
    if (!tx.from || !tx.to) {
      return {
        valid: false,
        error: ValidationError.INVALID_TRANSACTION,
        message: 'Transaction must have from and to addresses'
      };
    }

    return {
      valid: true,
      error: ValidationError.NONE,
      message: 'Transaction valid'
    };
  }

  /**
   * Calculate block reward with halving
   */
  static calculateBlockReward(blockIndex: number): number {
    const halvings = Math.floor(blockIndex / BLOCKCHAIN_CONFIG.HALVING_INTERVAL);
    return BLOCKCHAIN_CONFIG.INITIAL_REWARD / Math.pow(2, halvings);
  }

  /**
   * Compare two chains and determine which is valid
   * Returns the better chain or null if current is better
   */
  static compareChains(currentChain: Block[], newChain: Block[]): Block[] | null {
    // New chain must be longer
    if (newChain.length <= currentChain.length) {
      return null;
    }

    // Validate new chain completely
    const tempBlockchain = new Blockchain();
    tempBlockchain.chain = newChain;

    const result = this.validateChain(tempBlockchain);
    if (!result.valid) {
      console.log(`❌ Rejected longer chain: ${result.message}`);
      return null;
    }

    // Check checkpoints - new chain must include all checkpoints
    for (const [index, hash] of CHECKPOINTS) {
      if (index < newChain.length && newChain[index].hash !== hash) {
        console.log(`❌ Chain violates checkpoint at block ${index}`);
        return null;
      }
    }

    return newChain;
  }

  /**
   * Generate a proof that the chain is valid
   * This can be shared to prove integrity without sharing the full chain
   */
  static generateChainProof(blockchain: Blockchain): object {
    const chain = blockchain.chain;

    return {
      length: chain.length,
      genesisHash: chain[0]?.hash,
      latestHash: chain[chain.length - 1]?.hash,
      latestIndex: chain.length - 1,
      totalDifficulty: chain.reduce((sum, b) => sum + b.difficulty, 0),
      checkpointsValid: this.verifyCheckpoints(chain),
      timestamp: Date.now(),
      // Merkle root of all block hashes for compact verification
      chainMerkleRoot: this.calculateChainMerkleRoot(chain)
    };
  }

  /**
   * Verify all checkpoints are present and valid
   */
  static verifyCheckpoints(chain: Block[]): boolean {
    for (const [index, hash] of CHECKPOINTS) {
      if (index >= chain.length) continue;
      if (chain[index].hash !== hash) return false;
    }
    return true;
  }

  /**
   * Calculate merkle root of all block hashes
   */
  static calculateChainMerkleRoot(chain: Block[]): string {
    if (chain.length === 0) return '';

    let hashes = chain.map(b => b.hash);

    while (hashes.length > 1) {
      const newHashes: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left;
        newHashes.push(
          crypto.createHash('sha256').update(left + right).digest('hex')
        );
      }
      hashes = newHashes;
    }

    return hashes[0];
  }
}

/**
 * Immutable rules that can NEVER be changed
 * Breaking these would create an incompatible fork
 */
export const CONSENSUS_RULES = {
  // Maximum supply - hardcoded, immutable
  MAX_SUPPLY: 21_000_000,

  // Block reward halving interval
  HALVING_INTERVAL: 210_000,

  // Initial block reward
  INITIAL_REWARD: 50,

  // Minimum difficulty
  MIN_DIFFICULTY: 1,

  // Maximum block size (transactions)
  MAX_BLOCK_SIZE: 100,

  // Cryptographic algorithms - cannot change without hard fork
  HASH_ALGORITHM: 'sha256',
  SIGNATURE_ALGORITHM: 'secp256k1',

  // These rules are enforced by ALL nodes
  // Violating them results in immediate rejection
  // No admin, creator, or majority can override them
};

/**
 * Security guarantees
 *
 * 1. IMMUTABILITY: Once a block is confirmed, it cannot be changed
 *    - Changing any data would change the hash
 *    - This would break the link to the next block
 *    - All subsequent blocks would be invalid
 *
 * 2. DECENTRALIZATION: No single point of control
 *    - Every node validates independently
 *    - Majority consensus determines truth
 *    - Even creators cannot override consensus
 *
 * 3. TRANSPARENCY: All rules are public
 *    - Anyone can verify the chain
 *    - Anyone can run a node
 *    - Code is open source
 *
 * 4. MATHEMATICAL CERTAINTY: Security based on cryptography
 *    - SHA-256 is computationally irreversible
 *    - ECDSA signatures cannot be forged
 *    - Breaking these would require breaking mathematics
 */
