// VibeCoin API Client
import { API_URL } from './config';

export interface NodeInfo {
  name: string;
  version: string;
  network: string;
  blocks: number;
  difficulty: number;
  circulatingSupply: number;
  pendingTransactions: number;
}

export interface Block {
  index: number;
  timestamp: number;
  hash: string;
  previousHash: string;
  nonce: number;
  difficulty: number;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  timestamp: number;
  data?: string;
}

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

class VibeCoinAPI {
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
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Node info
  async getInfo(): Promise<NodeInfo> {
    return this.fetch<NodeInfo>('/info');
  }

  // Blocks
  async getBlocks(limit: number = 10, offset: number = 0): Promise<{ total: number; blocks: Block[] }> {
    return this.fetch<{ total: number; blocks: Block[] }>(`/blocks?limit=${limit}&offset=${offset}`);
  }

  async getBlock(index: number): Promise<Block> {
    return this.fetch<Block>(`/blocks/${index}`);
  }

  async getLatestBlock(): Promise<Block> {
    return this.fetch<Block>('/blocks/latest');
  }

  // Transactions
  async getPendingTransactions(): Promise<{ count: number; transactions: Transaction[] }> {
    return this.fetch<{ count: number; transactions: Transaction[] }>('/transactions/pending');
  }

  async sendTransaction(from: string, to: string, amount: number, privateKey: string): Promise<{ success: boolean; transaction: Transaction }> {
    return this.fetch<{ success: boolean; transaction: Transaction }>('/transactions', {
      method: 'POST',
      body: JSON.stringify({ from, to, amount, privateKey }),
    });
  }

  // Wallet
  async createWallet(): Promise<WalletData> {
    return this.fetch<WalletData>('/wallet/new', { method: 'POST' });
  }

  async getBalance(address: string): Promise<Balance> {
    return this.fetch<Balance>(`/address/${address}/balance`);
  }

  // Faucet
  async claimFaucet(address: string): Promise<{ success: boolean; message: string; amount: number; remainingClaims: number; nextClaimIn: number }> {
    return this.fetch<{ success: boolean; message: string; amount: number; remainingClaims: number; nextClaimIn: number }>('/faucet', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  }

  // Mining
  async mine(minerAddress: string): Promise<{ success: boolean; block: Block }> {
    return this.fetch<{ success: boolean; block: Block }>('/mine', {
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

export const api = new VibeCoinAPI();
export default api;
