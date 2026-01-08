/**
 * VibeCoin Staking System
 * Manages stake deposits, withdrawals, and stake-based calculations
 */

export interface StakeInfo {
  address: string;
  amount: number;
  stakedAt: number;
  lockedUntil: number;
  isValidator: boolean;
  delegatedTo?: string;
}

export interface StakingConfig {
  minStakeAmount: number;        // Minimum to become validator candidate
  minDelegateAmount: number;     // Minimum to delegate
  lockPeriod: number;            // Lock period in ms (for unstaking)
  maxValidators: number;         // Maximum active validators
  epochDuration: number;         // Duration of an epoch in ms
  slashingRates: {
    missedBlock: number;         // % slashed for missing a block
    doubleSign: number;          // % slashed for double signing
    inactivity: number;          // % slashed per hour of inactivity
  };
}

export const DEFAULT_STAKING_CONFIG: StakingConfig = {
  minStakeAmount: 100,           // 100 VIBE to become validator
  minDelegateAmount: 1,          // 1 VIBE to delegate
  lockPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days lock
  maxValidators: 21,             // Top 21 validators
  epochDuration: 24 * 60 * 60 * 1000,  // 24 hours per epoch
  slashingRates: {
    missedBlock: 1,              // 1% for missed block
    doubleSign: 10,              // 10% for double signing
    inactivity: 0.5              // 0.5% per hour inactive
  }
};

export class StakingManager {
  private stakes: Map<string, StakeInfo> = new Map();
  private config: StakingConfig;
  private totalStaked: number = 0;

  constructor(config: Partial<StakingConfig> = {}) {
    this.config = { ...DEFAULT_STAKING_CONFIG, ...config };
  }

  /**
   * Stake tokens to become a validator candidate
   */
  stake(address: string, amount: number, isValidator: boolean = false): { success: boolean; error?: string } {
    if (amount < this.config.minStakeAmount && isValidator) {
      return {
        success: false,
        error: `Minimum stake for validator is ${this.config.minStakeAmount} VIBE`
      };
    }

    if (amount < this.config.minDelegateAmount) {
      return {
        success: false,
        error: `Minimum stake is ${this.config.minDelegateAmount} VIBE`
      };
    }

    const existing = this.stakes.get(address);
    const now = Date.now();

    if (existing) {
      // Add to existing stake
      existing.amount += amount;
      existing.lockedUntil = now + this.config.lockPeriod;
      if (isValidator && existing.amount >= this.config.minStakeAmount) {
        existing.isValidator = true;
      }
    } else {
      // New stake
      this.stakes.set(address, {
        address,
        amount,
        stakedAt: now,
        lockedUntil: now + this.config.lockPeriod,
        isValidator: isValidator && amount >= this.config.minStakeAmount
      });
    }

    this.totalStaked += amount;
    return { success: true };
  }

  /**
   * Request to unstake tokens (subject to lock period)
   */
  unstake(address: string, amount: number): { success: boolean; error?: string; availableAt?: number } {
    const stake = this.stakes.get(address);

    if (!stake) {
      return { success: false, error: 'No stake found for this address' };
    }

    if (amount > stake.amount) {
      return { success: false, error: `Insufficient stake. You have ${stake.amount} VIBE staked` };
    }

    const now = Date.now();

    if (now < stake.lockedUntil) {
      return {
        success: false,
        error: 'Stake is still locked',
        availableAt: stake.lockedUntil
      };
    }

    stake.amount -= amount;
    this.totalStaked -= amount;

    if (stake.amount < this.config.minStakeAmount) {
      stake.isValidator = false;
    }

    if (stake.amount === 0) {
      this.stakes.delete(address);
    }

    return { success: true };
  }

  /**
   * Delegate stake to a validator
   */
  delegate(fromAddress: string, toValidator: string, amount: number): { success: boolean; error?: string } {
    if (amount < this.config.minDelegateAmount) {
      return {
        success: false,
        error: `Minimum delegation is ${this.config.minDelegateAmount} VIBE`
      };
    }

    const validatorStake = this.stakes.get(toValidator);
    if (!validatorStake || !validatorStake.isValidator) {
      return { success: false, error: 'Target is not a registered validator' };
    }

    // Create or update delegator stake
    const existing = this.stakes.get(fromAddress);
    const now = Date.now();

    if (existing) {
      existing.amount += amount;
      existing.delegatedTo = toValidator;
      existing.lockedUntil = now + this.config.lockPeriod;
    } else {
      this.stakes.set(fromAddress, {
        address: fromAddress,
        amount,
        stakedAt: now,
        lockedUntil: now + this.config.lockPeriod,
        isValidator: false,
        delegatedTo: toValidator
      });
    }

    this.totalStaked += amount;
    return { success: true };
  }

  /**
   * Slash a validator's stake (penalty)
   */
  slash(address: string, reason: 'missedBlock' | 'doubleSign' | 'inactivity', hours: number = 1): number {
    const stake = this.stakes.get(address);
    if (!stake) return 0;

    let slashRate = this.config.slashingRates[reason];
    if (reason === 'inactivity') {
      slashRate *= hours;
    }

    const slashAmount = stake.amount * (slashRate / 100);
    stake.amount -= slashAmount;
    this.totalStaked -= slashAmount;

    if (stake.amount < this.config.minStakeAmount) {
      stake.isValidator = false;
    }

    console.log(`⚠️ Slashed ${slashAmount.toFixed(4)} VIBE from ${address.substring(0, 8)}... (${reason})`);
    return slashAmount;
  }

  /**
   * Get stake info for an address
   */
  getStake(address: string): StakeInfo | undefined {
    return this.stakes.get(address);
  }

  /**
   * Get all validator candidates
   */
  getValidatorCandidates(): StakeInfo[] {
    return Array.from(this.stakes.values())
      .filter(s => s.isValidator)
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get all delegators for a validator
   */
  getDelegators(validatorAddress: string): StakeInfo[] {
    return Array.from(this.stakes.values())
      .filter(s => s.delegatedTo === validatorAddress);
  }

  /**
   * Get total delegated amount for a validator
   */
  getTotalDelegated(validatorAddress: string): number {
    return this.getDelegators(validatorAddress)
      .reduce((sum, s) => sum + s.amount, 0);
  }

  /**
   * Get effective stake (own stake + delegations)
   */
  getEffectiveStake(validatorAddress: string): number {
    const ownStake = this.stakes.get(validatorAddress)?.amount || 0;
    const delegated = this.getTotalDelegated(validatorAddress);
    return ownStake + delegated;
  }

  /**
   * Get total staked in the network
   */
  getTotalStaked(): number {
    return this.totalStaked;
  }

  /**
   * Get staking statistics
   */
  getStats(): object {
    const validators = this.getValidatorCandidates();
    return {
      totalStaked: this.totalStaked,
      validatorCount: validators.length,
      averageStake: validators.length > 0
        ? this.totalStaked / validators.length
        : 0,
      topValidator: validators[0]?.address.substring(0, 16) + '...',
      topValidatorStake: validators[0]?.amount || 0
    };
  }

  /**
   * Export stakes for persistence
   */
  exportStakes(): StakeInfo[] {
    return Array.from(this.stakes.values());
  }

  /**
   * Import stakes from persistence
   */
  importStakes(stakes: StakeInfo[]): void {
    this.stakes.clear();
    this.totalStaked = 0;
    for (const stake of stakes) {
      this.stakes.set(stake.address, stake);
      this.totalStaked += stake.amount;
    }
  }
}
