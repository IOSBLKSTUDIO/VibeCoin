import React from 'react';

interface ValidatorCardProps {
  rank: number;
  name: string;
  address: string;
  stake: number;
  votes: number;
  vibeScore: number;
  isActive: boolean;
  blocksProduced: number;
  onVote: () => void;
  hasVoted: boolean;
}

export const ValidatorCard: React.FC<ValidatorCardProps> = ({
  rank,
  name,
  address,
  stake,
  votes,
  vibeScore,
  isActive,
  blocksProduced,
  onVote,
  hasVoted
}) => {
  return (
    <div className={`validator-card ${isActive ? 'active' : ''}`}>
      <div className="validator-rank">
        <span className="rank-number">#{rank}</span>
        {isActive && <span className="active-badge">Active</span>}
      </div>

      <div className="validator-info">
        <h3 className="validator-name">{name}</h3>
        <p className="validator-address">{address.substring(0, 12)}...{address.substring(address.length - 8)}</p>
      </div>

      <div className="validator-stats">
        <div className="stat-item">
          <span className="stat-value">{stake.toLocaleString()}</span>
          <span className="stat-label">Stake</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{votes.toLocaleString()}</span>
          <span className="stat-label">Votes</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{vibeScore.toFixed(1)}</span>
          <span className="stat-label">VibeScore</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{blocksProduced}</span>
          <span className="stat-label">Blocks</span>
        </div>
      </div>

      <button
        className={`vote-btn ${hasVoted ? 'voted' : ''}`}
        onClick={onVote}
      >
        {hasVoted ? '✓ Voted' : 'Vote'}
      </button>
    </div>
  );
};
