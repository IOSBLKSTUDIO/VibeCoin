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
  mnemonic?: string;
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

  // Create wallet with BIP39 mnemonic seed phrase
  async createWalletWithMnemonic(): Promise<WalletData> {
    return this.fetch<WalletData>('/wallet/new-with-mnemonic', { method: 'POST' });
  }

  // Restore wallet from mnemonic
  async restoreFromMnemonic(mnemonic: string): Promise<WalletData> {
    return this.fetch<WalletData>('/wallet/from-mnemonic', {
      method: 'POST',
      body: JSON.stringify({ mnemonic }),
    });
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

  // ==================== REWARDS API (On-Chain Gamification) ====================

  // Get rewards status for an address
  async getRewardsStatus(address: string): Promise<RewardsStatus> {
    return this.fetch<RewardsStatus>(`/rewards/${address}`);
  }

  // Record presence heartbeat
  async recordPresence(address: string, isTabActive: boolean): Promise<PresenceResponse> {
    const timestamp = Date.now();
    const signature = `${address}:${timestamp}`; // Simple signature for now
    return this.fetch<PresenceResponse>('/rewards/presence', {
      method: 'POST',
      body: JSON.stringify({ address, isTabActive, signature, timestamp }),
    });
  }

  // Check and update streak on login
  async updateStreak(address: string): Promise<StreakResponse> {
    return this.fetch<StreakResponse>('/rewards/streak', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  }

  // Track mission action
  async trackMission(address: string, action: string): Promise<MissionTrackResponse> {
    return this.fetch<MissionTrackResponse>('/rewards/mission/track', {
      method: 'POST',
      body: JSON.stringify({ address, action }),
    });
  }

  // Claim mission reward
  async claimMission(address: string, missionId: string): Promise<MissionClaimResponse> {
    return this.fetch<MissionClaimResponse>('/rewards/mission/claim', {
      method: 'POST',
      body: JSON.stringify({ address, missionId }),
    });
  }

  // Claim Twitter share reward
  async claimTwitterReward(address: string): Promise<TwitterRewardResponse> {
    return this.fetch<TwitterRewardResponse>('/rewards/twitter', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  }

  // ==================== BLOCKCHAIN BACKUP API ====================

  // Export full blockchain for backup
  async exportBlockchain(): Promise<BlockchainExport> {
    return this.fetch<BlockchainExport>('/blockchain/export');
  }

  // Get blockchain snapshot info (lightweight)
  async getSnapshot(): Promise<BlockchainSnapshot> {
    return this.fetch<BlockchainSnapshot>('/blockchain/snapshot');
  }

  // Verify backup and optionally claim guardian reward
  async verifyBackup(backup: BlockchainExport, guardianAddress?: string): Promise<BackupVerificationResponse> {
    return this.fetch<BackupVerificationResponse>('/blockchain/verify-backup', {
      method: 'POST',
      body: JSON.stringify({ backup, guardianAddress }),
    });
  }

  // Download blockchain as file
  async downloadBlockchain(): Promise<void> {
    const data = await this.exportBlockchain();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibecoin-blockchain-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Rewards API types
export interface RewardsStatus {
  address: string;
  streak: {
    current: number;
    lastLoginDate: string;
    longest: number;
  };
  presence: {
    minutesToday: number;
    earnedToday: number;
    maxDaily: number;
    ratePerMinute: number;
    activeBonus: number;
  };
  missions: {
    balanceChecked: boolean;
    blocksViewed: boolean;
    faucetClaimed: boolean;
    transactionSent: boolean;
    twitterShared: boolean;
    presenceMinutes: number;
    claimed: string[];
  };
  twitter: {
    canShare: boolean;
    cooldownMinutes: number;
  };
  totalEarned: number;
  config: {
    PRESENCE_PER_MINUTE: number;
    PRESENCE_ACTIVE_BONUS: number;
    MAX_DAILY_PRESENCE: number;
    STREAK_DAY_2: number;
    STREAK_DAY_3: number;
    STREAK_DAY_7: number;
    STREAK_DAY_14: number;
    STREAK_DAY_30: number;
    TWITTER_SHARE: number;
    TWITTER_SHARE_COOLDOWN: number;
    MISSION_EASY: number;
    MISSION_MEDIUM: number;
    MISSION_HARD: number;
  };
}

export interface PresenceResponse {
  success: boolean;
  message?: string;
  earnedNow: number;
  earnedToday: number;
  minutesToday?: number;
  maxDaily?: number;
}

export interface StreakResponse {
  streak: number;
  longest?: number;
  bonus: number;
  isNewDay: boolean;
  message: string;
}

export interface MissionTrackResponse {
  success: boolean;
  action: string;
  completed: boolean;
  missionId: string | null;
  missions: {
    balanceChecked: boolean;
    blocksViewed: boolean;
    faucetClaimed: boolean;
    transactionSent: boolean;
    twitterShared: boolean;
    presenceMinutes: number;
    claimed: string[];
  };
}

export interface MissionClaimResponse {
  success: boolean;
  missionId: string;
  reward: number;
  totalEarned: number;
  message: string;
}

export interface TwitterRewardResponse {
  success: boolean;
  reward: number;
  totalEarned: number;
  nextShareIn: number;
  message: string;
}

// Blockchain backup types
export interface BlockchainExport {
  version: string;
  network: string;
  exportedAt: string;
  blocks: Block[];
  pendingTransactions: Transaction[];
  stats: {
    blocks: number;
    difficulty: number;
    circulatingSupply: number;
    pendingTransactions: number;
  };
  checksum: string;
}

export interface BlockchainSnapshot {
  blocks: number;
  latestHash: string;
  latestIndex: number;
  pendingTx: number;
  timestamp: number;
}

export interface BackupVerificationResponse {
  valid: boolean;
  backupBlocks: number;
  currentBlocks: number;
  errors: string[];
  isUseful: boolean;
  guardianReward?: number;
  guardianCooldown?: number;
  message?: string;
}

export const api = new VibeCoinAPI();
export default api;
