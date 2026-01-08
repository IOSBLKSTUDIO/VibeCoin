/**
 * VibeCoin Voting System
 * Democratic validator election through community votes
 */

export interface Vote {
  voter: string;
  validator: string;
  weight: number;
  timestamp: number;
}

export interface VoteRecord {
  voter: string;
  votes: Map<string, number>; // validator -> weight
  totalVotingPower: number;
  lastVoted: number;
}

export interface VotingConfig {
  maxVotesPerAddress: number;     // Max validators one can vote for
  votePowerCap: number;           // Max vote power per voter (prevents whale dominance)
  voteCooldown: number;           // Time between vote changes in ms
  epochDuration: number;          // Voting epoch duration
}

export const DEFAULT_VOTING_CONFIG: VotingConfig = {
  maxVotesPerAddress: 10,         // Can vote for up to 10 validators
  votePowerCap: 10000,            // Max 10,000 VIBE voting power
  voteCooldown: 60 * 60 * 1000,   // 1 hour cooldown between changes
  epochDuration: 24 * 60 * 60 * 1000 // 24 hours
};

export class VotingManager {
  private votes: Map<string, VoteRecord> = new Map();
  private validatorVotes: Map<string, number> = new Map();
  private config: VotingConfig;
  private currentEpoch: number = 0;
  private epochStartTime: number = Date.now();

  constructor(config: Partial<VotingConfig> = {}) {
    this.config = { ...DEFAULT_VOTING_CONFIG, ...config };
  }

  /**
   * Cast votes for validators
   * @param voter Address of the voter
   * @param votingPower The voter's VIBE balance/stake
   * @param validators Array of validator addresses to vote for
   */
  vote(
    voter: string,
    votingPower: number,
    validators: string[]
  ): { success: boolean; error?: string } {
    if (validators.length > this.config.maxVotesPerAddress) {
      return {
        success: false,
        error: `Maximum ${this.config.maxVotesPerAddress} validators per voter`
      };
    }

    if (validators.length === 0) {
      return { success: false, error: 'Must vote for at least one validator' };
    }

    // Check for duplicates
    const uniqueValidators = new Set(validators);
    if (uniqueValidators.size !== validators.length) {
      return { success: false, error: 'Duplicate validators in vote' };
    }

    const now = Date.now();
    const existingRecord = this.votes.get(voter);

    // Check cooldown
    if (existingRecord && (now - existingRecord.lastVoted) < this.config.voteCooldown) {
      const remainingTime = Math.ceil(
        (this.config.voteCooldown - (now - existingRecord.lastVoted)) / 60000
      );
      return {
        success: false,
        error: `Vote cooldown active. Try again in ${remainingTime} minutes`
      };
    }

    // Cap voting power to prevent whale dominance
    const cappedPower = Math.min(votingPower, this.config.votePowerCap);

    // Calculate vote weight per validator (equal distribution)
    const weightPerValidator = cappedPower / validators.length;

    // Remove old votes if they exist
    if (existingRecord) {
      for (const [validator, weight] of existingRecord.votes) {
        const currentVotes = this.validatorVotes.get(validator) || 0;
        this.validatorVotes.set(validator, Math.max(0, currentVotes - weight));
      }
    }

    // Create new vote record
    const newVotes = new Map<string, number>();
    for (const validator of validators) {
      newVotes.set(validator, weightPerValidator);
      const currentVotes = this.validatorVotes.get(validator) || 0;
      this.validatorVotes.set(validator, currentVotes + weightPerValidator);
    }

    this.votes.set(voter, {
      voter,
      votes: newVotes,
      totalVotingPower: cappedPower,
      lastVoted: now
    });

    return { success: true };
  }

  /**
   * Remove all votes from a voter
   */
  unvote(voter: string): { success: boolean; error?: string } {
    const record = this.votes.get(voter);
    if (!record) {
      return { success: false, error: 'No votes found for this address' };
    }

    // Remove votes from validators
    for (const [validator, weight] of record.votes) {
      const currentVotes = this.validatorVotes.get(validator) || 0;
      this.validatorVotes.set(validator, Math.max(0, currentVotes - weight));
    }

    this.votes.delete(voter);
    return { success: true };
  }

  /**
   * Get total votes for a validator
   */
  getValidatorVotes(validatorAddress: string): number {
    return this.validatorVotes.get(validatorAddress) || 0;
  }

  /**
   * Get all validators sorted by votes
   */
  getValidatorsByVotes(): { validator: string; votes: number }[] {
    return Array.from(this.validatorVotes.entries())
      .map(([validator, votes]) => ({ validator, votes }))
      .sort((a, b) => b.votes - a.votes);
  }

  /**
   * Get vote record for a voter
   */
  getVoteRecord(voter: string): VoteRecord | undefined {
    return this.votes.get(voter);
  }

  /**
   * Get voters for a specific validator
   */
  getValidatorVoters(validatorAddress: string): { voter: string; weight: number }[] {
    const voters: { voter: string; weight: number }[] = [];

    for (const [_, record] of this.votes) {
      const weight = record.votes.get(validatorAddress);
      if (weight) {
        voters.push({ voter: record.voter, weight });
      }
    }

    return voters.sort((a, b) => b.weight - a.weight);
  }

  /**
   * Check if epoch needs rotation
   */
  checkEpochRotation(): boolean {
    const now = Date.now();
    if (now - this.epochStartTime >= this.config.epochDuration) {
      this.currentEpoch++;
      this.epochStartTime = now;
      return true;
    }
    return false;
  }

  /**
   * Get current epoch info
   */
  getEpochInfo(): {
    epoch: number;
    startTime: number;
    endTime: number;
    remainingTime: number;
  } {
    const endTime = this.epochStartTime + this.config.epochDuration;
    return {
      epoch: this.currentEpoch,
      startTime: this.epochStartTime,
      endTime,
      remainingTime: Math.max(0, endTime - Date.now())
    };
  }

  /**
   * Get voting statistics
   */
  getStats(): object {
    const topValidators = this.getValidatorsByVotes().slice(0, 5);
    return {
      totalVoters: this.votes.size,
      totalValidatorsWithVotes: this.validatorVotes.size,
      currentEpoch: this.currentEpoch,
      epochRemainingHours: Math.round(
        (this.epochStartTime + this.config.epochDuration - Date.now()) / 3600000
      ),
      topValidators: topValidators.map(v => ({
        address: v.validator.substring(0, 16) + '...',
        votes: Math.round(v.votes)
      }))
    };
  }

  /**
   * Export votes for persistence
   */
  exportVotes(): {
    votes: Array<{ voter: string; votes: [string, number][]; totalVotingPower: number; lastVoted: number }>;
    validatorVotes: [string, number][];
    epoch: number;
    epochStartTime: number;
  } {
    const votesArray = Array.from(this.votes.values()).map(record => ({
      voter: record.voter,
      votes: Array.from(record.votes.entries()),
      totalVotingPower: record.totalVotingPower,
      lastVoted: record.lastVoted
    }));

    return {
      votes: votesArray,
      validatorVotes: Array.from(this.validatorVotes.entries()),
      epoch: this.currentEpoch,
      epochStartTime: this.epochStartTime
    };
  }

  /**
   * Import votes from persistence
   */
  importVotes(data: {
    votes: Array<{ voter: string; votes: [string, number][]; totalVotingPower: number; lastVoted: number }>;
    validatorVotes: [string, number][];
    epoch: number;
    epochStartTime: number;
  }): void {
    this.votes.clear();
    this.validatorVotes.clear();

    for (const record of data.votes) {
      this.votes.set(record.voter, {
        voter: record.voter,
        votes: new Map(record.votes),
        totalVotingPower: record.totalVotingPower,
        lastVoted: record.lastVoted
      });
    }

    for (const [validator, votes] of data.validatorVotes) {
      this.validatorVotes.set(validator, votes);
    }

    this.currentEpoch = data.epoch;
    this.epochStartTime = data.epochStartTime;
  }
}
