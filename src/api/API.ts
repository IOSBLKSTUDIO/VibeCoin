/**
 * VibeCoin REST API - HTTP interface for node interaction
 */
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Blockchain } from '../core/Blockchain';
import { Transaction } from '../core/Transaction';
import { Wallet } from '../wallet/Wallet';
import { Storage } from '../storage/Storage';

export interface APIConfig {
  port: number;
  host: string;
}

// Faucet configuration
const FAUCET_AMOUNT = 100; // VIBE per claim
const FAUCET_COOLDOWN = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_FAUCET_CLAIMS = 5; // Max claims per address per day

export class API {
  private app: Express;
  private blockchain: Blockchain;
  private storage: Storage;
  private config: APIConfig;
  private nodeWallet: Wallet | null = null;
  private faucetClaims: Map<string, { lastClaim: number; dailyClaims: number; resetDay: number }> = new Map();

  constructor(blockchain: Blockchain, storage: Storage, config: Partial<APIConfig> = {}) {
    this.blockchain = blockchain;
    this.storage = storage;
    this.config = {
      port: config.port || 3000,
      host: config.host || '0.0.0.0'
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      console.log(`📡 ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // ==================== INFO ====================

    // Get node info
    this.app.get('/info', (_req: Request, res: Response) => {
      res.json({
        name: 'VibeCoin Node',
        version: '0.1.0',
        network: 'testnet',
        ...this.blockchain.getStats()
      });
    });

    // Get blockchain stats
    this.app.get('/stats', (_req: Request, res: Response) => {
      res.json(this.blockchain.getStats());
    });

    // ==================== BLOCKS ====================

    // Get all blocks
    this.app.get('/blocks', (req: Request, res: Response) => {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const blocks = this.blockchain.chain
        .slice(offset, offset + limit)
        .map(b => b.toJSON());

      res.json({
        total: this.blockchain.chain.length,
        offset,
        limit,
        blocks
      });
    });

    // Get block by index
    this.app.get('/blocks/:index', (req: Request, res: Response) => {
      const index = parseInt(req.params.index);
      const block = this.blockchain.getBlock(index);

      if (block) {
        res.json(block.toJSON());
      } else {
        res.status(404).json({ error: 'Block not found' });
      }
    });

    // Get block by hash
    this.app.get('/blocks/hash/:hash', (req: Request, res: Response) => {
      const block = this.blockchain.getBlockByHash(req.params.hash);

      if (block) {
        res.json(block.toJSON());
      } else {
        res.status(404).json({ error: 'Block not found' });
      }
    });

    // Get latest block
    this.app.get('/blocks/latest', (_req: Request, res: Response) => {
      res.json(this.blockchain.getLatestBlock().toJSON());
    });

    // ==================== TRANSACTIONS ====================

    // Get pending transactions
    this.app.get('/transactions/pending', (_req: Request, res: Response) => {
      res.json({
        count: this.blockchain.pendingTransactions.length,
        transactions: this.blockchain.pendingTransactions.map(tx => tx.toJSON())
      });
    });

    // Create new transaction
    this.app.post('/transactions', (req: Request, res: Response) => {
      try {
        const { from, to, amount, data, signature, privateKey } = req.body;

        if (!from || !to || amount === undefined) {
          return res.status(400).json({ error: 'Missing required fields: from, to, amount' });
        }

        let tx: Transaction;

        if (privateKey) {
          // Create and sign transaction
          const wallet = new Wallet(privateKey);
          if (wallet.publicKey !== from) {
            return res.status(400).json({ error: 'Private key does not match from address' });
          }
          tx = wallet.createTransaction(to, amount, data || '');
        } else if (signature) {
          // Use pre-signed transaction
          tx = new Transaction(from, to, amount, data || '');
          tx.signature = signature;
        } else {
          return res.status(400).json({ error: 'Must provide privateKey or signature' });
        }

        const success = this.blockchain.addTransaction(tx);

        if (success) {
          // Save updated state
          this.storage.saveBlockchain(this.blockchain);

          res.json({
            success: true,
            transaction: tx.toJSON()
          });
        } else {
          res.status(400).json({ error: 'Transaction rejected', reason: 'Invalid signature or insufficient balance' });
        }
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // Get transaction by ID
    this.app.get('/transactions/:id', async (req: Request, res: Response) => {
      const result = await this.storage.getTransaction(req.params.id);

      if (result) {
        res.json({
          ...result.tx.toJSON(),
          blockIndex: result.blockIndex
        });
      } else {
        // Check pending
        const pending = this.blockchain.pendingTransactions.find(tx => tx.id === req.params.id);
        if (pending) {
          res.json({
            ...pending.toJSON(),
            status: 'pending'
          });
        } else {
          res.status(404).json({ error: 'Transaction not found' });
        }
      }
    });

    // ==================== ADDRESSES ====================

    // Get address balance
    this.app.get('/address/:address/balance', (req: Request, res: Response) => {
      const balance = this.blockchain.getBalance(req.params.address);
      const pending = this.blockchain.getPendingBalance(req.params.address);

      res.json({
        address: req.params.address,
        balance,
        pending,
        available: balance - pending
      });
    });

    // Get address transactions
    this.app.get('/address/:address/transactions', (req: Request, res: Response) => {
      const transactions = this.blockchain.getTransactionHistory(req.params.address);

      res.json({
        address: req.params.address,
        count: transactions.length,
        transactions: transactions.map(tx => tx.toJSON())
      });
    });

    // ==================== MINING ====================

    // Mine a new block
    this.app.post('/mine', async (req: Request, res: Response) => {
      try {
        const { minerAddress } = req.body;

        if (!minerAddress) {
          return res.status(400).json({ error: 'minerAddress required' });
        }

        console.log(`⛏️  Mining requested by ${minerAddress.substring(0, 16)}...`);

        const block = this.blockchain.minePendingTransactions(minerAddress);

        // Index transactions
        for (const tx of block.transactions) {
          await this.storage.indexTransaction(tx, block.index);
        }

        // Save blockchain
        await this.storage.saveBlockchain(this.blockchain);

        res.json({
          success: true,
          block: block.toJSON()
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ==================== WALLET ====================

    // Generate new wallet
    this.app.post('/wallet/new', (_req: Request, res: Response) => {
      const wallet = new Wallet();
      res.json(wallet.exportWallet());
    });

    // Get wallet from private key
    this.app.post('/wallet/import', (req: Request, res: Response) => {
      try {
        const { privateKey } = req.body;
        const wallet = new Wallet(privateKey);
        res.json(wallet.exportPublic());
      } catch (error: any) {
        res.status(400).json({ error: 'Invalid private key' });
      }
    });

    // ==================== FAUCET (Testnet only) ====================

    // Get free testnet VIBE (with rate limiting)
    this.app.post('/faucet', async (req: Request, res: Response) => {
      try {
        const { address } = req.body;

        if (!address) {
          return res.status(400).json({ error: 'address required' });
        }

        const now = Date.now();
        const today = Math.floor(now / (24 * 60 * 60 * 1000)); // Day number

        // Check faucet limits
        const claimInfo = this.faucetClaims.get(address);

        if (claimInfo) {
          // Reset daily claims if new day
          if (claimInfo.resetDay !== today) {
            claimInfo.dailyClaims = 0;
            claimInfo.resetDay = today;
          }

          // Check cooldown (1 hour between claims)
          const timeSinceLastClaim = now - claimInfo.lastClaim;
          if (timeSinceLastClaim < FAUCET_COOLDOWN) {
            const minutesLeft = Math.ceil((FAUCET_COOLDOWN - timeSinceLastClaim) / 60000);
            return res.status(429).json({
              error: `Faucet cooldown active. Try again in ${minutesLeft} minutes.`,
              nextClaimIn: minutesLeft
            });
          }

          // Check daily limit
          if (claimInfo.dailyClaims >= MAX_FAUCET_CLAIMS) {
            return res.status(429).json({
              error: `Daily faucet limit reached (${MAX_FAUCET_CLAIMS} claims per day). Try again tomorrow.`,
              dailyLimit: MAX_FAUCET_CLAIMS
            });
          }

          // Update claim info
          claimInfo.lastClaim = now;
          claimInfo.dailyClaims++;
        } else {
          // First claim for this address
          this.faucetClaims.set(address, {
            lastClaim: now,
            dailyClaims: 1,
            resetDay: today
          });
        }

        // Create faucet transaction
        const tx = Transaction.createCoinbase(address, FAUCET_AMOUNT);
        tx.data = 'Testnet Faucet';

        this.blockchain.pendingTransactions.push(tx);
        await this.storage.saveBlockchain(this.blockchain);

        const claimData = this.faucetClaims.get(address)!;
        const remainingClaims = MAX_FAUCET_CLAIMS - claimData.dailyClaims;

        res.json({
          success: true,
          message: `${FAUCET_AMOUNT} VIBE sent to your wallet!`,
          amount: FAUCET_AMOUNT,
          remainingClaims,
          nextClaimIn: 60, // minutes
          note: 'Transaction will be confirmed in ~10 seconds'
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Check faucet status for an address
    this.app.get('/faucet/status/:address', (req: Request, res: Response) => {
      const { address } = req.params;
      const now = Date.now();
      const today = Math.floor(now / (24 * 60 * 60 * 1000));

      const claimInfo = this.faucetClaims.get(address);

      if (!claimInfo) {
        return res.json({
          canClaim: true,
          remainingClaims: MAX_FAUCET_CLAIMS,
          nextClaimIn: 0
        });
      }

      // Reset if new day
      let dailyClaims = claimInfo.dailyClaims;
      if (claimInfo.resetDay !== today) {
        dailyClaims = 0;
      }

      const timeSinceLastClaim = now - claimInfo.lastClaim;
      const canClaim = timeSinceLastClaim >= FAUCET_COOLDOWN && dailyClaims < MAX_FAUCET_CLAIMS;
      const minutesLeft = timeSinceLastClaim >= FAUCET_COOLDOWN ? 0 : Math.ceil((FAUCET_COOLDOWN - timeSinceLastClaim) / 60000);

      res.json({
        canClaim,
        remainingClaims: MAX_FAUCET_CLAIMS - dailyClaims,
        nextClaimIn: minutesLeft,
        dailyLimit: MAX_FAUCET_CLAIMS
      });
    });

    // ==================== VALIDATION ====================

    // Validate blockchain
    this.app.get('/validate', (_req: Request, res: Response) => {
      const isValid = this.blockchain.isValid();
      res.json({
        valid: isValid,
        blocks: this.blockchain.chain.length
      });
    });

    // ==================== ERROR HANDLING ====================

    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('API Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
  }

  /**
   * Set node wallet for faucet and other operations
   */
  setNodeWallet(wallet: Wallet): void {
    this.nodeWallet = wallet;
  }

  /**
   * Start the API server
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, this.config.host, () => {
        console.log(`🌐 API running at http://${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  /**
   * Get Express app (for testing)
   */
  getApp(): Express {
    return this.app;
  }
}
