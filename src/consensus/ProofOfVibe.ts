/**
 * VibeCoin Proof of Vibe (PoV) Consensus
 * Hybrid consensus combining PoS + DPoS + Reputation
 *
 * The consensus mechanism that embodies VibeCoding philosophy:
 * - Democratic: Community votes for validators
 * - Accessible: Anyone with stake can participate
 * - Meritocratic: Contributions are rewarded
 * - Sustainable: No energy-intensive mining
 */

import { StakingManager, StakeInfo, DEFAULT_STAKING_CONFIG } from './Staking';
import { VotingManager, DEFAULT_VOTING_CONFIG } from './Voting';
import { ValidatorManager, ValidatorInfo, VibeScore } from './Validator';
import { Block } from '../core/Block';
import { Transaction } from '../core/Transaction';

export interface PoVConfig {
  blockTime: number;           // Target block time in ms
  blockReward: number;         // VIBE reward per block
  voterRewardShare: number;    // % of reward shared with voters
  maxValidators: number;       // Maximum active validators
  epochDuration: number;       // Duration of voting epoch
  minStake: number;            // Minimum stake to be validator
}

export const DEFAULT_POV_CONFIG: PoVConfig = {
  blockTime: 10000,            // 10 seconds
  blockReward: 5,              // 5 VIBE per block (less than PoW, more sustainable)
  voterRewardShare: 10,        // 10% to voters
  maxValidators: 21,           // Top 21 validators
  epochDuration: 24 * 60 * 60 * 1000, // 24 hours
  minStake: 100                // 100 VIBE minimum
};

export interface BlockProposal {
  block: Block;
  proposer: string;
  timestamp: number;
  vibeScore: number;
}

export interface ConsensusState {
  currentEpoch: number;
  epochStartTime: number;
  lastBlockTime: number;
  activeValidators: string[];
  currentProducerIndex: number;
  totalBlocksProduced: number;
}

export class ProofOfVibe {
  private config: PoVConfig;
  private stakingManager: StakingManager;
  private votingManager: VotingManager;
  private validatorManager: ValidatorManager;
  private state: ConsensusState;
  private vibeScores: VibeScore[] = [];

  constructor(config: Partial<PoVConfig> = {}) {
    this.config = { ...DEFAULT_POV_CONFIG, ...config };

    this.stakingManager = new StakingManager({
      minStakeAmount: this.config.minStake,
      maxValidators: this.config.maxValidators,
      epochDuration: this.config.epochDuration
    });

    this.votingManager = new VotingManager({
      epochDuration: this.config.epochDuration
    });

    this.validatorManager = new ValidatorManager(this.config.maxValidators);

    this.state = {
      currentEpoch: 0,
      epochStartTime: Date.now(),
      lastBlockTime: Date.now(),
      activeValidators: [],
      currentProducerIndex: 0,
      totalBlocksProduced: 0
    };
  }

  // ==================== VALIDATOR OPERATIONS ====================

  /**
   * Register as a validator candidate
   */
  registerValidator(
    address: string,
    name: string,
    stakeAmount: number,
    options: { website?: string; description?: string } = {}
  ): { success: boolean; error?: string } {
    // First, stake tokens
    const stakeResult = this.stakingManager.stake(address, stakeAmount, true);
    if (!stakeResult.success) {
      return stakeResult;
    }

    // Then register validator info
    const registerResult = this.validatorManager.registerValidator(address, name, options);
    if (!registerResult.success) {
      // Rollback stake if registration fails
      this.stakingManager.unstake(address, stakeAmount);
      return registerResult;
    }

    console.log(`\n🎉 Welcome validator "${name}"!`);
    console.log(`   Stake: ${stakeAmount} VIBE`);
    console.log(`   Address: ${address.substring(0, 20)}...`);

    // Recalculate scores
    this.updateVibeScores();

    return { success: true };
  }

  /**
   * Add more stake
   */
  addStake(address: string, amount: number): { success: boolean; error?: string } {
    const result = this.stakingManager.stake(address, amount, false);
    if (result.success) {
      this.updateVibeScores();
    }
    return result;
  }

  /**
   * Remove stake (subject to lock period)
   */
  removeStake(address: string, amount: number): { success: boolean; error?: string; availableAt?: number } {
    const result = this.stakingManager.unstake(address, amount);
    if (result.success) {
      this.updateVibeScores();
    }
    return result;
  }

  /**
   * Delegate stake to a validator
   */
  delegate(
    fromAddress: string,
    toValidator: string,
    amount: number
  ): { success: boolean; error?: string } {
    // Verify validator exists
    if (!this.validatorManager.getValidator(toValidator)) {
      return { success: false, error: 'Validator not found' };
    }

    const result = this.stakingManager.delegate(fromAddress, toValidator, amount);
    if (result.success) {
      this.updateVibeScores();
    }
    return result;
  }

  // ==================== VOTING OPERATIONS ====================

  /**
   * Vote for validators
   */
  vote(
    voterAddress: string,
    voterBalance: number,
    validators: string[]
  ): { success: boolean; error?: string } {
    // Verify all validators exist
    for (const v of validators) {
      if (!this.validatorManager.getValidator(v)) {
        return { success: false, error: `Validator ${v.substring(0, 16)}... not found` };
      }
    }

    const result = this.votingManager.vote(voterAddress, voterBalance, validators);
    if (result.success) {
      this.updateVibeScores();
    }
    return result;
  }

  /**
   * Remove all votes
   */
  unvote(voterAddress: string): { success: boolean; error?: string } {
    const result = this.votingManager.unvote(voterAddress);
    if (result.success) {
      this.updateVibeScores();
    }
    return result;
  }

  // ==================== CONSENSUS OPERATIONS ====================

  /**
   * Update VibeScores and select active validators
   */
  updateVibeScores(): void {
    // Build stake map
    const stakes = new Map<string, number>();
    for (const validator of this.validatorManager.getAllValidators()) {
      stakes.set(validator.address, this.stakingManager.getEffectiveStake(validator.address));
    }

    // Build votes map
    const votes = new Map<string, number>();
    for (const { validator, votes: voteCount } of this.votingManager.getValidatorsByVotes()) {
      votes.set(validator, voteCount);
    }

    // Calculate scores
    this.vibeScores = this.validatorManager.calculateVibeScores(stakes, votes);

    // Select active validators
    this.state.activeValidators = this.validatorManager.selectActiveValidators(this.vibeScores);
  }

  /**
   * Check if it's time for a new epoch
   */
  checkEpochRotation(): boolean {
    const rotated = this.votingManager.checkEpochRotation();
    if (rotated) {
      this.state.currentEpoch++;
      this.state.epochStartTime = Date.now();
      this.updateVibeScores();
      console.log(`\n🔄 New epoch started: ${this.state.currentEpoch}`);
      console.log(`   Active validators: ${this.state.activeValidators.length}`);
    }
    return rotated;
  }

  /**
   * Get current block producer
   */
  getCurrentProducer(): string | null {
    if (this.state.activeValidators.length === 0) {
      return null;
    }

    const slotDuration = this.config.blockTime;
    const timeSinceEpoch = Date.now() - this.state.epochStartTime;
    const currentSlot = Math.floor(timeSinceEpoch / slotDuration);
    const producerIndex = currentSlot % this.state.activeValidators.length;

    return this.state.activeValidators[producerIndex];
  }

  /**
   * Check if an address can produce the next block
   */
  canProduceBlock(address: string): boolean {
    return this.getCurrentProducer() === address;
  }

  /**
   * Validate a proposed block
   */
  validateBlock(block: Block, proposer: string): { valid: boolean; error?: string } {
    // Check proposer is the expected producer
    const expectedProducer = this.getCurrentProducer();
    if (proposer !== expectedProducer) {
      return {
        valid: false,
        error: `Invalid proposer. Expected ${expectedProducer?.substring(0, 16)}, got ${proposer.substring(0, 16)}`
      };
    }

    // Check block timing
    const timeSinceLastBlock = Date.now() - this.state.lastBlockTime;
    if (timeSinceLastBlock < this.config.blockTime * 0.9) {
      return {
        valid: false,
        error: 'Block produced too quickly'
      };
    }

    // Verify block hash and structure
    if (block.hash !== block.calculateHash()) {
      return { valid: false, error: 'Invalid block hash' };
    }

    return { valid: true };
  }

  /**
   * Process a validated block
   */
  processBlock(block: Block, proposer: string): { reward: number; voterRewards: Map<string, number> } {
    // Record block production
    this.validatorManager.recordBlockProduced(proposer, this.config.blockReward);

    // Calculate rewards
    const validatorReward = this.config.blockReward * (1 - this.config.voterRewardShare / 100);
    const voterPool = this.config.blockReward * (this.config.voterRewardShare / 100);

    // Distribute voter rewards
    const voterRewards = new Map<string, number>();
    const voters = this.votingManager.getValidatorVoters(proposer);
    const totalVotes = voters.reduce((sum, v) => sum + v.weight, 0);

    if (totalVotes > 0) {
      for (const { voter, weight } of voters) {
        const share = (weight / totalVotes) * voterPool;
        voterRewards.set(voter, share);
      }
    }

    // Update state
    this.state.lastBlockTime = Date.now();
    this.state.totalBlocksProduced++;

    return { reward: validatorReward, voterRewards };
  }

  /**
   * Handle missed block
   */
  handleMissedBlock(expectedProducer: string): void {
    this.validatorManager.recordBlockMissed(expectedProducer);
    this.stakingManager.slash(expectedProducer, 'missedBlock');

    // Move to next producer
    const index = this.state.activeValidators.indexOf(expectedProducer);
    if (index >= 0) {
      this.state.currentProducerIndex = (index + 1) % this.state.activeValidators.length;
    }
  }

  // ==================== CONTRIBUTION SYSTEM ====================

  /**
   * Award contribution points to a validator
   */
  awardContribution(
    validatorAddress: string,
    points: number,
    reason: string
  ): void {
    this.validatorManager.addContributionScore(validatorAddress, points, reason);
    this.updateVibeScores();
  }

  // ==================== QUERY METHODS ====================

  /**
   * Get validator info with scores
   */
  getValidatorInfo(address: string): {
    info: ValidatorInfo;
    stake: number;
    delegated: number;
    votes: number;
    vibeScore: VibeScore;
  } | null {
    const info = this.validatorManager.getValidator(address);
    if (!info) return null;

    const stake = this.stakingManager.getStake(address)?.amount || 0;
    const delegated = this.stakingManager.getTotalDelegated(address);
    const votes = this.votingManager.getValidatorVotes(address);
    const vibeScore = this.vibeScores.find(s => s.address === address) || {
      address,
      stakeScore: 0,
      voteScore: 0,
      contributionScore: 0,
      totalScore: 0,
      rank: 0
    };

    return { info, stake, delegated, votes, vibeScore };
  }

  /**
   * Get all validators with their scores
   */
  getAllValidatorsWithScores(): Array<{
    info: ValidatorInfo;
    stake: number;
    votes: number;
    vibeScore: VibeScore;
  }> {
    return this.validatorManager.getAllValidators().map(info => {
      const stake = this.stakingManager.getEffectiveStake(info.address);
      const votes = this.votingManager.getValidatorVotes(info.address);
      const vibeScore = this.vibeScores.find(s => s.address === info.address) || {
        address: info.address,
        stakeScore: 0,
        voteScore: 0,
        contributionScore: 0,
        totalScore: 0,
        rank: 999
      };

      return { info, stake, votes, vibeScore };
    }).sort((a, b) => a.vibeScore.rank - b.vibeScore.rank);
  }

  /**
   * Get consensus statistics
   */
  getStats(): object {
    return {
      consensus: 'Proof of Vibe (PoV)',
      config: {
        blockTime: `${this.config.blockTime / 1000}s`,
        blockReward: `${this.config.blockReward} VIBE`,
        maxValidators: this.config.maxValidators,
        minStake: `${this.config.minStake} VIBE`
      },
      state: {
        epoch: this.state.currentEpoch,
        activeValidators: this.state.activeValidators.length,
        totalBlocksProduced: this.state.totalBlocksProduced,
        currentProducer: this.getCurrentProducer()?.substring(0, 16) + '...'
      },
      staking: this.stakingManager.getStats(),
      voting: this.votingManager.getStats(),
      validators: this.validatorManager.getStats()
    };
  }

  /**
   * Get epoch info
   */
  getEpochInfo(): {
    epoch: number;
    startTime: number;
    endTime: number;
    remainingTime: number;
    activeValidators: number;
  } {
    const epochInfo = this.votingManager.getEpochInfo();
    return {
      ...epochInfo,
      activeValidators: this.state.activeValidators.length
    };
  }

  // ==================== PERSISTENCE ====================

  /**
   * Export consensus state for persistence
   */
  exportState(): object {
    return {
      config: this.config,
      state: this.state,
      stakes: this.stakingManager.exportStakes(),
      votes: this.votingManager.exportVotes(),
      validators: this.validatorManager.exportValidators(),
      vibeScores: this.vibeScores
    };
  }

  /**
   * Import consensus state from persistence
   */
  importState(data: any): void {
    if (data.config) {
      this.config = { ...DEFAULT_POV_CONFIG, ...data.config };
    }

    if (data.state) {
      this.state = data.state;
    }

    if (data.stakes) {
      this.stakingManager.importStakes(data.stakes);
    }

    if (data.votes) {
      this.votingManager.importVotes(data.votes);
    }

    if (data.validators) {
      this.validatorManager.importValidators(data.validators);
    }

    if (data.vibeScores) {
      this.vibeScores = data.vibeScores;
    }
  }

  // ==================== ACCESS TO MANAGERS ====================

  getStakingManager(): StakingManager {
    return this.stakingManager;
  }

  getVotingManager(): VotingManager {
    return this.votingManager;
  }

  getValidatorManager(): ValidatorManager {
    return this.validatorManager;
  }

  getConfig(): PoVConfig {
    return { ...this.config };
  }
}
