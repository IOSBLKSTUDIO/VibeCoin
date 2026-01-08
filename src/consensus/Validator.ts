/**
 * VibeCoin Validator System
 * Manages validator registration, reputation, and performance tracking
 */

export interface ValidatorInfo {
  address: string;
  name: string;
  website?: string;
  description?: string;
  registeredAt: number;
  lastBlockProduced: number;
  blocksProduced: number;
  blocksMissed: number;
  totalRewards: number;
  isActive: boolean;
  contributionScore: number;
  uptime: number; // Percentage
}

export interface ValidatorPerformance {
  address: string;
  recentBlocks: number;      // Blocks in last 24h
  recentMissed: number;      // Missed in last 24h
  averageBlockTime: number;  // Average time to produce block
  reliability: number;       // Percentage
}

export interface VibeScore {
  address: string;
  stakeScore: number;        // 40% weight
  voteScore: number;         // 30% weight
  contributionScore: number; // 30% weight
  totalScore: number;
  rank: number;
}

export class ValidatorManager {
  private validators: Map<string, ValidatorInfo> = new Map();
  private activeValidators: Set<string> = new Set();
  private maxValidators: number;

  constructor(maxValidators: number = 21) {
    this.maxValidators = maxValidators;
  }

  /**
   * Register a new validator
   */
  registerValidator(
    address: string,
    name: string,
    options: { website?: string; description?: string } = {}
  ): { success: boolean; error?: string } {
    if (this.validators.has(address)) {
      return { success: false, error: 'Validator already registered' };
    }

    if (name.length < 3 || name.length > 32) {
      return { success: false, error: 'Name must be 3-32 characters' };
    }

    // Check for duplicate names
    for (const [_, validator] of this.validators) {
      if (validator.name.toLowerCase() === name.toLowerCase()) {
        return { success: false, error: 'Validator name already taken' };
      }
    }

    this.validators.set(address, {
      address,
      name,
      website: options.website,
      description: options.description,
      registeredAt: Date.now(),
      lastBlockProduced: 0,
      blocksProduced: 0,
      blocksMissed: 0,
      totalRewards: 0,
      isActive: false,
      contributionScore: 0,
      uptime: 100
    });

    console.log(`✅ Validator "${name}" registered: ${address.substring(0, 16)}...`);
    return { success: true };
  }

  /**
   * Update validator info
   */
  updateValidator(
    address: string,
    updates: Partial<Pick<ValidatorInfo, 'name' | 'website' | 'description'>>
  ): { success: boolean; error?: string } {
    const validator = this.validators.get(address);
    if (!validator) {
      return { success: false, error: 'Validator not found' };
    }

    if (updates.name) {
      if (updates.name.length < 3 || updates.name.length > 32) {
        return { success: false, error: 'Name must be 3-32 characters' };
      }
      validator.name = updates.name;
    }

    if (updates.website !== undefined) validator.website = updates.website;
    if (updates.description !== undefined) validator.description = updates.description;

    return { success: true };
  }

  /**
   * Record block production
   */
  recordBlockProduced(address: string, reward: number): void {
    const validator = this.validators.get(address);
    if (validator) {
      validator.blocksProduced++;
      validator.lastBlockProduced = Date.now();
      validator.totalRewards += reward;
      this.updateUptime(address);
    }
  }

  /**
   * Record missed block
   */
  recordBlockMissed(address: string): void {
    const validator = this.validators.get(address);
    if (validator) {
      validator.blocksMissed++;
      this.updateUptime(address);
    }
  }

  /**
   * Update validator uptime
   */
  private updateUptime(address: string): void {
    const validator = this.validators.get(address);
    if (validator) {
      const total = validator.blocksProduced + validator.blocksMissed;
      validator.uptime = total > 0
        ? (validator.blocksProduced / total) * 100
        : 100;
    }
  }

  /**
   * Add contribution score to validator
   */
  addContributionScore(address: string, points: number, reason: string): void {
    const validator = this.validators.get(address);
    if (validator) {
      validator.contributionScore += points;
      console.log(`🌟 +${points} contribution points to ${validator.name}: ${reason}`);
    }
  }

  /**
   * Calculate VibeScore for all validators
   */
  calculateVibeScores(
    stakes: Map<string, number>,
    votes: Map<string, number>
  ): VibeScore[] {
    const scores: VibeScore[] = [];
    const maxStake = Math.max(...Array.from(stakes.values()), 1);
    const maxVotes = Math.max(...Array.from(votes.values()), 1);
    const maxContribution = Math.max(
      ...Array.from(this.validators.values()).map(v => v.contributionScore),
      1
    );

    for (const [address, validator] of this.validators) {
      const stake = stakes.get(address) || 0;
      const voteCount = votes.get(address) || 0;

      // Normalize scores to 0-100
      const stakeScore = (stake / maxStake) * 100;
      const voteScore = (voteCount / maxVotes) * 100;
      const contributionScore = (validator.contributionScore / maxContribution) * 100;

      // Weighted total: 40% stake, 30% votes, 30% contribution
      const totalScore = (stakeScore * 0.4) + (voteScore * 0.3) + (contributionScore * 0.3);

      scores.push({
        address,
        stakeScore,
        voteScore,
        contributionScore,
        totalScore,
        rank: 0 // Will be set after sorting
      });
    }

    // Sort by total score and assign ranks
    scores.sort((a, b) => b.totalScore - a.totalScore);
    scores.forEach((score, index) => {
      score.rank = index + 1;
    });

    return scores;
  }

  /**
   * Select active validators based on VibeScore
   */
  selectActiveValidators(vibeScores: VibeScore[]): string[] {
    // Deactivate all first
    for (const [_, validator] of this.validators) {
      validator.isActive = false;
    }
    this.activeValidators.clear();

    // Activate top validators
    const selected = vibeScores
      .slice(0, this.maxValidators)
      .map(score => score.address);

    for (const address of selected) {
      const validator = this.validators.get(address);
      if (validator) {
        validator.isActive = true;
        this.activeValidators.add(address);
      }
    }

    console.log(`\n🎯 Active validators for this epoch: ${selected.length}`);
    return selected;
  }

  /**
   * Get current block producer (round-robin)
   */
  getCurrentProducer(blockIndex: number): string | null {
    const active = Array.from(this.activeValidators);
    if (active.length === 0) return null;
    return active[blockIndex % active.length];
  }

  /**
   * Get validator info
   */
  getValidator(address: string): ValidatorInfo | undefined {
    return this.validators.get(address);
  }

  /**
   * Get validator by name
   */
  getValidatorByName(name: string): ValidatorInfo | undefined {
    for (const [_, validator] of this.validators) {
      if (validator.name.toLowerCase() === name.toLowerCase()) {
        return validator;
      }
    }
    return undefined;
  }

  /**
   * Get all validators
   */
  getAllValidators(): ValidatorInfo[] {
    return Array.from(this.validators.values());
  }

  /**
   * Get active validators
   */
  getActiveValidators(): ValidatorInfo[] {
    return Array.from(this.validators.values())
      .filter(v => v.isActive)
      .sort((a, b) => b.blocksProduced - a.blocksProduced);
  }

  /**
   * Get validator performance metrics
   */
  getPerformance(address: string): ValidatorPerformance | null {
    const validator = this.validators.get(address);
    if (!validator) return null;

    return {
      address,
      recentBlocks: validator.blocksProduced, // TODO: Track 24h window
      recentMissed: validator.blocksMissed,
      averageBlockTime: 10, // TODO: Calculate actual
      reliability: validator.uptime
    };
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(limit: number = 10): ValidatorInfo[] {
    return Array.from(this.validators.values())
      .sort((a, b) => b.blocksProduced - a.blocksProduced)
      .slice(0, limit);
  }

  /**
   * Check if address is an active validator
   */
  isActiveValidator(address: string): boolean {
    return this.activeValidators.has(address);
  }

  /**
   * Get validator statistics
   */
  getStats(): object {
    const all = Array.from(this.validators.values());
    const active = all.filter(v => v.isActive);

    return {
      totalValidators: all.length,
      activeValidators: active.length,
      maxValidators: this.maxValidators,
      totalBlocksProduced: all.reduce((sum, v) => sum + v.blocksProduced, 0),
      totalRewardsDistributed: all.reduce((sum, v) => sum + v.totalRewards, 0),
      averageUptime: all.length > 0
        ? all.reduce((sum, v) => sum + v.uptime, 0) / all.length
        : 0
    };
  }

  /**
   * Export validators for persistence
   */
  exportValidators(): ValidatorInfo[] {
    return Array.from(this.validators.values());
  }

  /**
   * Import validators from persistence
   */
  importValidators(validators: ValidatorInfo[]): void {
    this.validators.clear();
    this.activeValidators.clear();

    for (const validator of validators) {
      this.validators.set(validator.address, validator);
      if (validator.isActive) {
        this.activeValidators.add(validator.address);
      }
    }
  }
}
