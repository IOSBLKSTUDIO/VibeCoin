// VibeCoin API Client
import { API_URL } from './config';

export interface WalletData {
  address: string;
  publicKey: string;
  privateKey?: string;
}

export interface Balance {
  address: string;
  balance: number;
  pending: number;
  available: number;
}

export interface NodeInfo {
  name: string;
  version: string;
  network: string;
  blocks: number;
  transactions: number;
  circulatingSupply: number;
  isValid: boolean;
}

export interface Block {
  index: number;
  hash: string;
  previousHash: string;
  timestamp: number;
  transactions: Transaction[];
  consensus: string;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  data?: string;
}

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Node info
  async getInfo(): Promise<NodeInfo> {
    return this.fetch('/info');
  }

  async getStats(): Promise<any> {
    return this.fetch('/stats');
  }

  // Wallet
  async createWallet(): Promise<WalletData> {
    return this.fetch('/wallet/new', { method: 'POST' });
  }

  async importWallet(privateKey: string): Promise<WalletData> {
    return this.fetch('/wallet/import', {
      method: 'POST',
      body: JSON.stringify({ privateKey }),
    });
  }

  // Balance
  async getBalance(address: string): Promise<Balance> {
    return this.fetch(`/address/${address}/balance`);
  }

  // Faucet
  async claimFaucet(address: string): Promise<{ success: boolean; message: string }> {
    return this.fetch('/faucet', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  }

  // Transactions
  async sendTransaction(
    privateKey: string,
    from: string,
    to: string,
    amount: number,
    data?: string
  ): Promise<{ success: boolean; transaction: Transaction }> {
    return this.fetch('/transactions', {
      method: 'POST',
      body: JSON.stringify({ privateKey, from, to, amount, data }),
    });
  }

  async getTransactionHistory(address: string): Promise<{ transactions: Transaction[] }> {
    return this.fetch(`/address/${address}/transactions`);
  }

  // Blocks
  async getBlocks(limit: number = 10): Promise<{ blocks: Block[]; total: number }> {
    return this.fetch(`/blocks?limit=${limit}`);
  }

  async getLatestBlock(): Promise<Block> {
    return this.fetch('/blocks/latest');
  }

  // Mining (for testing)
  async mine(minerAddress: string): Promise<{ success: boolean; block: Block }> {
    return this.fetch('/mine', {
      method: 'POST',
      body: JSON.stringify({ minerAddress }),
    });
  }

  // Health check
  async isOnline(): Promise<boolean> {
    try {
      await this.getInfo();
      return true;
    } catch {
      return false;
    }
  }
}

export const api = new APIClient();
export default api;
