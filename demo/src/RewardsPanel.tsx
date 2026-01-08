/**
 * VibeCoin Rewards Panel Component
 * Gamification UI for earning VIBE through activities
 */
import { useState, useEffect, useCallback } from 'react';
import {
  initRewardsState,
  initStreakState,
  initMissionsState,
  updateStreak,
  updateMissionProgress,
  claimMissionReward,
  calculatePresenceReward,
  generateTwitterShareUrl,
  canShareOnTwitter,
  recordTwitterShare,
  getTwitterShareCooldown,
  saveRewardsState,
  REWARDS,
  type RewardsState,
  type StreakState,
  type MissionsState,
} from './rewards';

interface RewardsPanelProps {
  language: 'en' | 'fr';
  walletAddress: string | null;
  onRewardEarned: (amount: number, reason: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export function RewardsPanel({
  language,
  walletAddress,
  onRewardEarned,
  isVisible,
  onClose,
}: RewardsPanelProps) {
  const [rewardsState, setRewardsState] = useState<RewardsState | null>(null);
  const [streakState, setStreakState] = useState<StreakState | null>(null);
  const [missionsState, setMissionsState] = useState<MissionsState | null>(null);
  const [presenceTime, setPresenceTime] = useState(0);
  const [isTabActive, setIsTabActive] = useState(true);
  const [twitterCooldown, setTwitterCooldown] = useState(0);

  // Translations
  const t = {
    title: language === 'fr' ? 'Récompenses' : 'Rewards',
    presence: language === 'fr' ? 'Proof of Presence' : 'Proof of Presence',
    presenceDesc: language === 'fr'
      ? `Gagne ${REWARDS.PRESENCE_PER_MINUTE} VIBE/min en restant connecté`
      : `Earn ${REWARDS.PRESENCE_PER_MINUTE} VIBE/min by staying connected`,
    activeBonus: language === 'fr'
      ? `+${REWARDS.PRESENCE_ACTIVE_BONUS} bonus si onglet actif`
      : `+${REWARDS.PRESENCE_ACTIVE_BONUS} bonus if tab is active`,
    dailyLimit: language === 'fr'
      ? `Limite: ${REWARDS.MAX_DAILY_PRESENCE} VIBE/jour`
      : `Limit: ${REWARDS.MAX_DAILY_PRESENCE} VIBE/day`,
    streak: language === 'fr' ? 'Streak journalier' : 'Daily Streak',
    streakDays: (n: number) => language === 'fr' ? `${n} jour${n > 1 ? 's' : ''}` : `${n} day${n > 1 ? 's' : ''}`,
    streakBonus: language === 'fr' ? 'Bonus streak' : 'Streak bonus',
    missions: language === 'fr' ? 'Missions quotidiennes' : 'Daily Missions',
    claim: language === 'fr' ? 'Réclamer' : 'Claim',
    claimed: language === 'fr' ? 'Réclamé' : 'Claimed',
    completed: language === 'fr' ? 'Complété' : 'Completed',
    social: language === 'fr' ? 'Partage Social' : 'Social Sharing',
    shareTwitter: language === 'fr' ? 'Partager sur Twitter/X' : 'Share on Twitter/X',
    shareReward: language === 'fr'
      ? `Gagne ${REWARDS.TWITTER_SHARE} VIBE en partageant !`
      : `Earn ${REWARDS.TWITTER_SHARE} VIBE by sharing!`,
    cooldown: (min: number) => language === 'fr'
      ? `Disponible dans ${min} min`
      : `Available in ${min} min`,
    pending: language === 'fr' ? 'Récompenses en attente' : 'Pending Rewards',
    totalEarned: language === 'fr' ? 'Total gagné' : 'Total Earned',
    noWallet: language === 'fr'
      ? 'Crée un wallet pour débloquer les récompenses !'
      : 'Create a wallet to unlock rewards!',
    connectedFor: language === 'fr' ? 'Connecté depuis' : 'Connected for',
    minutes: language === 'fr' ? 'min' : 'min',
    earnedToday: language === 'fr' ? 'Gagné aujourd\'hui' : 'Earned today',
  };

  // Initialize states
  useEffect(() => {
    if (walletAddress) {
      const rewards = initRewardsState();
      const streak = initStreakState();
      const missions = initMissionsState();

      setRewardsState(rewards);
      setStreakState(streak);
      setMissionsState(missions);

      // Check streak on load
      const { state: newStreak, bonus, isNewStreak } = updateStreak(streak);
      setStreakState(newStreak);

      if (isNewStreak && bonus > 0) {
        onRewardEarned(bonus, language === 'fr'
          ? `Bonus streak ${newStreak.currentStreak} jours !`
          : `${newStreak.currentStreak} day streak bonus!`);
      }
    }
  }, [walletAddress, language, onRewardEarned]);

  // Track tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabActive(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Presence timer - earn VIBE every minute
  useEffect(() => {
    if (!walletAddress || !rewardsState) return;

    const interval = setInterval(() => {
      setPresenceTime(prev => prev + 1);

      // Every minute, calculate reward
      const { state: newState, earned } = calculatePresenceReward(
        rewardsState,
        1,
        isTabActive
      );

      if (earned > 0) {
        setRewardsState(newState);
        // Update presence mission
        if (missionsState) {
          const { state: newMissions } = updateMissionProgress(missionsState, 'presence', 1);
          setMissionsState(newMissions);
        }
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [walletAddress, rewardsState, isTabActive, missionsState]);

  // Twitter cooldown timer
  useEffect(() => {
    const checkCooldown = () => {
      setTwitterCooldown(getTwitterShareCooldown());
    };
    checkCooldown();
    const interval = setInterval(checkCooldown, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle mission completion tracking
  const trackMissionAction = useCallback((action: string) => {
    if (!missionsState) return;
    const { state: newState, completed } = updateMissionProgress(missionsState, action);
    setMissionsState(newState);

    if (completed) {
      // Mission completed notification could go here
    }
  }, [missionsState]);

  // Handle claim mission reward
  const handleClaimMission = (missionId: string) => {
    if (!missionsState || !rewardsState) return;

    const { missionsState: newMissions, reward } = claimMissionReward(missionsState, missionId);
    setMissionsState(newMissions);

    if (reward > 0) {
      const mission = newMissions.daily.find(m => m.id === missionId);
      const missionTitle = language === 'fr' ? mission?.titleFr : mission?.title;
      onRewardEarned(reward, missionTitle || 'Mission');

      // Update pending rewards
      const newRewards = { ...rewardsState, pendingRewards: rewardsState.pendingRewards + reward };
      setRewardsState(newRewards);
      saveRewardsState(newRewards);
    }
  };

  // Handle Twitter share
  const handleTwitterShare = () => {
    if (!walletAddress || !canShareOnTwitter()) return;

    const url = generateTwitterShareUrl(walletAddress, language);
    window.open(url, '_blank', 'width=600,height=400');

    // Record share and award points
    const reward = recordTwitterShare();
    onRewardEarned(reward, language === 'fr' ? 'Partage Twitter' : 'Twitter Share');

    // Update cooldown
    setTwitterCooldown(getTwitterShareCooldown());

    // Update mission
    if (missionsState) {
      const { state: newMissions } = updateMissionProgress(missionsState, 'twitter');
      setMissionsState(newMissions);
    }
  };

  // Export track function for parent component
  useEffect(() => {
    (window as any).trackMissionAction = trackMissionAction;
    return () => {
      delete (window as any).trackMissionAction;
    };
  }, [trackMissionAction]);

  if (!isVisible) return null;

  return (
    <div className="rewards-overlay" onClick={onClose}>
      <div className="rewards-panel" onClick={e => e.stopPropagation()}>
        <div className="rewards-header">
          <h2>🎁 {t.title}</h2>
          <button className="rewards-close" onClick={onClose}>×</button>
        </div>

        {!walletAddress ? (
          <div className="rewards-no-wallet">
            <span className="rewards-lock">🔒</span>
            <p>{t.noWallet}</p>
          </div>
        ) : (
          <div className="rewards-content">
            {/* Presence Section */}
            <div className="rewards-section">
              <h3>⏱️ {t.presence}</h3>
              <p className="rewards-desc">{t.presenceDesc}</p>
              <p className="rewards-desc small">{t.activeBonus}</p>
              <div className="rewards-stats">
                <div className="stat">
                  <span className="stat-label">{t.connectedFor}</span>
                  <span className="stat-value">{presenceTime} {t.minutes}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">{t.earnedToday}</span>
                  <span className="stat-value">{rewardsState?.dailyPresenceEarned.toFixed(2) || 0} VIBE</span>
                </div>
              </div>
              <div className="rewards-progress">
                <div
                  className="rewards-progress-bar"
                  style={{ width: `${Math.min(100, ((rewardsState?.dailyPresenceEarned || 0) / REWARDS.MAX_DAILY_PRESENCE) * 100)}%` }}
                />
              </div>
              <p className="rewards-limit">{t.dailyLimit}</p>
            </div>

            {/* Streak Section */}
            <div className="rewards-section">
              <h3>🔥 {t.streak}</h3>
              <div className="streak-display">
                <span className="streak-number">{streakState?.currentStreak || 0}</span>
                <span className="streak-label">{t.streakDays(streakState?.currentStreak || 0)}</span>
              </div>
              <div className="streak-bonuses">
                {[2, 3, 7, 14, 30].map(day => (
                  <div
                    key={day}
                    className={`streak-bonus ${(streakState?.currentStreak || 0) >= day ? 'achieved' : ''}`}
                  >
                    <span className="streak-day">{day}</span>
                    <span className="streak-reward">
                      +{day === 2 ? REWARDS.STREAK_DAY_2 :
                        day === 3 ? REWARDS.STREAK_DAY_3 :
                        day === 7 ? REWARDS.STREAK_DAY_7 :
                        day === 14 ? REWARDS.STREAK_DAY_14 : REWARDS.STREAK_DAY_30}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Missions Section */}
            <div className="rewards-section">
              <h3>📋 {t.missions}</h3>
              <div className="missions-list">
                {missionsState?.daily.map(mission => (
                  <div key={mission.id} className={`mission-item ${mission.completed ? 'completed' : ''}`}>
                    <div className="mission-info">
                      <span className={`mission-type ${mission.type}`}>
                        {mission.type === 'easy' ? '⭐' : mission.type === 'medium' ? '⭐⭐' : '⭐⭐⭐'}
                      </span>
                      <div className="mission-text">
                        <span className="mission-title">
                          {language === 'fr' ? mission.titleFr : mission.title}
                        </span>
                        <span className="mission-progress">
                          {mission.progress}/{mission.target}
                        </span>
                      </div>
                    </div>
                    <div className="mission-reward">
                      <span className="mission-vibe">+{mission.reward} VIBE</span>
                      {mission.completed && !mission.claimed && (
                        <button
                          className="mission-claim-btn"
                          onClick={() => handleClaimMission(mission.id)}
                        >
                          {t.claim}
                        </button>
                      )}
                      {mission.claimed && (
                        <span className="mission-claimed">✓ {t.claimed}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Section */}
            <div className="rewards-section">
              <h3>📣 {t.social}</h3>
              <p className="rewards-desc">{t.shareReward}</p>
              <button
                className="twitter-share-btn"
                onClick={handleTwitterShare}
                disabled={twitterCooldown > 0}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                {twitterCooldown > 0 ? t.cooldown(twitterCooldown) : t.shareTwitter}
              </button>
            </div>

            {/* Stats Section */}
            <div className="rewards-section stats">
              <div className="rewards-total">
                <span className="total-label">{t.pending}</span>
                <span className="total-value">{rewardsState?.pendingRewards.toFixed(2) || 0} VIBE</span>
              </div>
              <div className="rewards-total">
                <span className="total-label">{t.totalEarned}</span>
                <span className="total-value">{rewardsState?.totalEarned.toFixed(2) || 0} VIBE</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RewardsPanel;
