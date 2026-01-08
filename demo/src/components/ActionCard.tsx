import React from 'react';

interface ActionCardProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  highlight = false
}) => {
  return (
    <button
      className={`action-card ${highlight ? 'highlight' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="action-icon">{icon}</span>
      <div className="action-content">
        <h3 className="action-title">{title}</h3>
        <p className="action-description">{description}</p>
      </div>
      <span className="action-arrow">→</span>
    </button>
  );
};
