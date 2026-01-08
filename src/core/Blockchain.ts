import { Block } from './Block';
import { Transaction } from './Transaction';

/**
 * VibeCoin Blockchain Configuration
 */
export const BLOCKCHAIN_CONFIG = {
  // Token info
  NAME: 'VibeCoin',
  SYMBOL: 'VIBE',
  DECIMALS: 8,

  // Supply
  MAX_SUPPLY: 21_000_000,
  INITIAL_REWARD: 50,
  HALVING_INTERVAL: 210_000, // blocks

  // Mining
  INITIAL_DIFFICULTY: 4,
  BLOCK_TIME_TARGET: 10_000, // 10 seconds in ms
  DIFFICULTY_ADJUSTMENT_INTERVAL: 10, // blocks

  // Transactions
  MIN_FEE: 0.001,
  MAX_TRANSACTIONS_PER_BLOCK: 100,
  MAX_PENDING_TRANSACTIONS: 1000 // Limit mempool size
};

/**
 * Blockchain - The main chain that holds all blocks
 * Manages mining, validation, and consensus
 */
export class Blockchain {
  public chain: Block[];
  public difficulty: number;
  public pendingTransactions: Transaction[];
  public miningReward: number;

  constructor() {
    this.chain = [Block.createGenesis()];
    this.difficulty = BLOCKCHAIN_CONFIG.INITIAL_DIFFICULTY;
    this.pendingTransactions = [];
    this.miningReward = BLOCKCHAIN_CONFIG.INITIAL_REWARD;
  }

  /**
   * Get the latest block in the chain
   */
  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Get block by index
   */
  getBlock(index: number): Block | undefined {
    return this.chain[index];
  }

  /**
   * Get block by hash
   */
  getBlockByHash(hash: string): Block | undefined {
    return this.chain.find(block => block.hash === hash);
  }

  /**
   * Add a transaction to pending pool
   */
  addTransaction(transaction: Transaction): boolean {
    // Validate transaction
    if (!transaction.from || !transaction.to) {
      console.log('❌ Transaction must have from and to addresses');
      return false;
    }

    if (!transaction.isValid()) {
      console.log('❌ Invalid transaction signature');
      return false;
    }

    // Check sender balance (except for coinbase)
    if (!transaction.isCoinbase()) {
      const balance = this.getBalance(transaction.from);
      if (balance < transaction.getTotalCost()) {
        console.log(`❌ Insufficient balance. Has: ${balance}, Needs: ${transaction.getTotalCost()}`);
        return false;
      }
    }

    // Check for double spending in pending transactions
    const pendingAmount = this.getPendingBalance(transaction.from);
    const totalPending = pendingAmount + transaction.getTotalCost();
    const balance = this.getBalance(transaction.from);

    if (!transaction.isCoinbase() && totalPending > balance) {
      console.log('❌ Double spending detected in pending transactions');
      return false;
    }

    // Check mempool size limit
    if (this.pendingTransactions.length >= BLOCKCHAIN_CONFIG.MAX_PENDING_TRANSACTIONS) {
      console.log('❌ Transaction pool is full. Please wait for next block.');
      return false;
    }

    this.pendingTransactions.push(transaction);
    console.log(`✅ Transaction added to pending pool: ${transaction.toString()}`);
    return true;
  }

  /**
   * Mine pending transactions into a new block
   */
  minePendingTransactions(minerAddress: string): Block {
    // Create coinbase transaction (mining reward)
    const rewardTx = Transaction.createCoinbase(minerAddress, this.miningReward);

    // Get transactions to include (limited by max per block)
    const transactions = [
      rewardTx,
      ...this.pendingTransactions.slice(0, BLOCKCHAIN_CONFIG.MAX_TRANSACTIONS_PER_BLOCK - 1)
    ];

    // Calculate total fees for miner
    const totalFees = transactions
      .filter(tx => !tx.isCoinbase())
      .reduce((sum, tx) => sum + tx.fee, 0);

    // Add fees to reward transaction
    rewardTx.amount += totalFees;

    // Create new block
    const block = new Block(
      this.chain.length,
      transactions,
      this.getLatestBlock().hash,
      this.difficulty,
      minerAddress
    );

    // Mine the block
    block.mine();

    // Add block to chain
    this.chain.push(block);

    // Remove mined transactions from pending pool
    const minedTxIds = new Set(transactions.map(tx => tx.id));
    this.pendingTransactions = this.pendingTransactions.filter(
      tx => !minedTxIds.has(tx.id)
    );

    // Adjust difficulty if needed
    this.adjustDifficulty();

    // Check for halving
    this.checkHalving();

    console.log(`\n🎉 Block ${block.index} added to blockchain!`);
    console.log(`   Transactions: ${transactions.length}`);
    console.log(`   Miner reward: ${rewardTx.amount} VIBE\n`);

    return block;
  }

  /**
   * Get balance of an address
   */
  getBalance(address: string): number {
    let balance = 0;

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.from === address) {
          balance -= tx.amount + tx.fee;
        }
        if (tx.to === address) {
          balance += tx.amount;
        }
      }
    }

    return balance;
  }

  /**
   * Get pending balance (transactions waiting to be mined)
   */
  getPendingBalance(address: string): number {
    let pending = 0;

    for (const tx of this.pendingTransactions) {
      if (tx.from === address) {
        pending += tx.getTotalCost();
      }
    }

    return pending;
  }

  /**
   * Get all transactions for an address
   */
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

  /**
   * Adjust mining difficulty based on block times
   */
  adjustDifficulty(): void {
    if (this.chain.length % BLOCKCHAIN_CONFIG.DIFFICULTY_ADJUSTMENT_INTERVAL !== 0) {
      return;
    }

    const interval = BLOCKCHAIN_CONFIG.DIFFICULTY_ADJUSTMENT_INTERVAL;
    const latestBlock = this.getLatestBlock();
    const previousAdjustmentBlock = this.chain[this.chain.length - interval];

    const timeExpected = BLOCKCHAIN_CONFIG.BLOCK_TIME_TARGET * interval;
    const timeTaken = latestBlock.timestamp - previousAdjustmentBlock.timestamp;

    if (timeTaken < timeExpected / 2) {
      this.difficulty++;
      console.log(`📈 Difficulty increased to ${this.difficulty}`);
    } else if (timeTaken > timeExpected * 2) {
      this.difficulty = Math.max(1, this.difficulty - 1);
      console.log(`📉 Difficulty decreased to ${this.difficulty}`);
    }
  }

  /**
   * Check and apply halving
   */
  checkHalving(): void {
    const halvings = Math.floor(this.chain.length / BLOCKCHAIN_CONFIG.HALVING_INTERVAL);
    const newReward = BLOCKCHAIN_CONFIG.INITIAL_REWARD / Math.pow(2, halvings);

    if (newReward !== this.miningReward && newReward >= 0.00000001) {
      this.miningReward = newReward;
      console.log(`🔄 Halving! New mining reward: ${this.miningReward} VIBE`);
    }
  }

  /**
   * Validate the entire blockchain
   */
  isValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Check block validity
      if (!currentBlock.isValid()) {
        console.log(`❌ Block ${i} is invalid`);
        return false;
      }

      // Check hash linkage
      if (currentBlock.previousHash !== previousBlock.hash) {
        console.log(`❌ Block ${i} has invalid previous hash`);
        return false;
      }

      // Check hash is correctly calculated
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        console.log(`❌ Block ${i} hash mismatch`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get total circulating supply
   */
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

  /**
   * Get blockchain statistics
   */
  getStats(): object {
    return {
      name: BLOCKCHAIN_CONFIG.NAME,
      symbol: BLOCKCHAIN_CONFIG.SYMBOL,
      blocks: this.chain.length,
      difficulty: this.difficulty,
      pendingTransactions: this.pendingTransactions.length,
      miningReward: this.miningReward,
      circulatingSupply: this.getCirculatingSupply(),
      maxSupply: BLOCKCHAIN_CONFIG.MAX_SUPPLY,
      latestBlockHash: this.getLatestBlock().hash.substring(0, 16) + '...'
    };
  }

  /**
   * Export blockchain to JSON
   */
  toJSON(): object {
    return {
      chain: this.chain.map(block => block.toJSON()),
      difficulty: this.difficulty,
      pendingTransactions: this.pendingTransactions.map(tx => tx.toJSON()),
      miningReward: this.miningReward
    };
  }

  /**
   * Import blockchain from JSON
   */
  static fromJSON(data: any): Blockchain {
    const blockchain = new Blockchain();
    blockchain.chain = data.chain.map((blockData: any) => Block.fromJSON(blockData));
    blockchain.difficulty = data.difficulty;
    blockchain.pendingTransactions = data.pendingTransactions.map((txData: any) =>
      Transaction.fromJSON(txData)
    );
    blockchain.miningReward = data.miningReward;
    return blockchain;
  }
}
