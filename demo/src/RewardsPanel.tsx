/**
 * VibeCoin Rewards Panel Component
 * On-Chain Gamification UI for earning VIBE through activities
 * All rewards are verified and distributed via blockchain transactions
 */
import { useState, useEffect, useCallback } from 'react';
import { api, type RewardsStatus } from './api';

interface RewardsPanelProps {
  language: 'en' | 'fr';
  walletAddress: string | null;
  onRewardEarned: (amount: number, reason: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

// Mission display data
const MISSIONS_DATA = [
  { id: 'check_balance', action: 'balanceChecked', title: 'Check your balance', titleFr: 'Vérifier ton solde', type: 'easy' as const, reward: 5, target: 1 },
  { id: 'view_blocks', action: 'blocksViewed', title: 'Explore the blockchain', titleFr: 'Explorer la blockchain', type: 'easy' as const, reward: 5, target: 1 },
  { id: 'claim_faucet', action: 'faucetClaimed', title: 'Claim from faucet', titleFr: 'Réclamer au faucet', type: 'easy' as const, reward: 5, target: 1 },
  { id: 'send_transaction', action: 'transactionSent', title: 'Make a transaction', titleFr: 'Effectuer une transaction', type: 'medium' as const, reward: 15, target: 1 },
  { id: 'share_twitter', action: 'twitterShared', title: 'Share on Twitter/X', titleFr: 'Partager sur Twitter/X', type: 'medium' as const, reward: 15, target: 1 },
  { id: 'stay_connected', action: 'presenceMinutes', title: 'Stay connected 10 min', titleFr: 'Rester connecté 10 min', type: 'hard' as const, reward: 30, target: 10 },
];

export function RewardsPanel({
  language,
  walletAddress,
  onRewardEarned,
  isVisible,
  onClose,
}: RewardsPanelProps) {
  const [rewardsStatus, setRewardsStatus] = useState<RewardsStatus | null>(null);
  const [presenceTime, setPresenceTime] = useState(0);
  const [isTabActive, setIsTabActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get config values (with fallbacks)
  const config = rewardsStatus?.config || {
    PRESENCE_PER_MINUTE: 0.1,
    PRESENCE_ACTIVE_BONUS: 0.05,
    MAX_DAILY_PRESENCE: 100,
    STREAK_DAY_2: 5,
    STREAK_DAY_3: 10,
    STREAK_DAY_7: 25,
    STREAK_DAY_14: 50,
    STREAK_DAY_30: 100,
    TWITTER_SHARE: 10,
    TWITTER_SHARE_COOLDOWN: 3600000,
    MISSION_EASY: 5,
    MISSION_MEDIUM: 15,
    MISSION_HARD: 30,
  };

  // Translations
  const t = {
    title: language === 'fr' ? 'Récompenses' : 'Rewards',
    onChain: language === 'fr' ? '🔗 On-Chain' : '🔗 On-Chain',
    presence: language === 'fr' ? 'Proof of Presence' : 'Proof of Presence',
    presenceDesc: language === 'fr'
      ? `Gagne ${config.PRESENCE_PER_MINUTE} VIBE/min en restant connecté`
      : `Earn ${config.PRESENCE_PER_MINUTE} VIBE/min by staying connected`,
    activeBonus: language === 'fr'
      ? `+${config.PRESENCE_ACTIVE_BONUS} bonus si onglet actif`
      : `+${config.PRESENCE_ACTIVE_BONUS} bonus if tab is active`,
    dailyLimit: language === 'fr'
      ? `Limite: ${config.MAX_DAILY_PRESENCE} VIBE/jour`
      : `Limit: ${config.MAX_DAILY_PRESENCE} VIBE/day`,
    streak: language === 'fr' ? 'Streak journalier' : 'Daily Streak',
    streakDays: (n: number) => language === 'fr' ? `${n} jour${n > 1 ? 's' : ''}` : `${n} day${n > 1 ? 's' : ''}`,
    missions: language === 'fr' ? 'Missions quotidiennes' : 'Daily Missions',
    claim: language === 'fr' ? 'Réclamer' : 'Claim',
    claimed: language === 'fr' ? 'Réclamé' : 'Claimed',
    social: language === 'fr' ? 'Partage Social' : 'Social Sharing',
    shareTwitter: language === 'fr' ? 'Partager sur Twitter/X' : 'Share on Twitter/X',
    shareReward: language === 'fr'
      ? `Gagne ${config.TWITTER_SHARE} VIBE en partageant !`
      : `Earn ${config.TWITTER_SHARE} VIBE by sharing!`,
    cooldown: (min: number) => language === 'fr'
      ? `Disponible dans ${min} min`
      : `Available in ${min} min`,
    totalEarned: language === 'fr' ? 'Total gagné (on-chain)' : 'Total Earned (on-chain)',
    noWallet: language === 'fr'
      ? 'Crée un wallet pour débloquer les récompenses !'
      : 'Create a wallet to unlock rewards!',
    connectedFor: language === 'fr' ? 'Connecté depuis' : 'Connected for',
    minutes: language === 'fr' ? 'min' : 'min',
    earnedToday: language === 'fr' ? 'Gagné aujourd\'hui' : 'Earned today',
    loading: language === 'fr' ? 'Chargement...' : 'Loading...',
    error: language === 'fr' ? 'Erreur de connexion' : 'Connection error',
    verified: language === 'fr' ? 'Vérifié sur blockchain' : 'Verified on blockchain',
  };

  // Fetch rewards status from API
  const fetchRewardsStatus = useCallback(async () => {
    if (!walletAddress) return;

    try {
      setError(null);
      const status = await api.getRewardsStatus(walletAddress);
      setRewardsStatus(status);
      setPresenceTime(status.presence.minutesToday);
    } catch (err) {
      console.error('Failed to fetch rewards status:', err);
      setError(t.error);
    }
  }, [walletAddress, t.error]);

  // Initialize - fetch status and update streak
  useEffect(() => {
    if (walletAddress && isVisible) {
      fetchRewardsStatus();

      // Update streak on first load
      api.updateStreak(walletAddress).then(response => {
        if (response.isNewDay && response.bonus > 0) {
          onRewardEarned(response.bonus, language === 'fr'
            ? `Bonus streak ${response.streak} jours !`
            : `${response.streak} day streak bonus!`);
          fetchRewardsStatus();
        }
      }).catch(console.error);
    }
  }, [walletAddress, isVisible, language, onRewardEarned, fetchRewardsStatus]);

  // Track tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabActive(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Presence heartbeat - send to server every minute
  useEffect(() => {
    if (!walletAddress) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.recordPresence(walletAddress, isTabActive);
        if (response.success && response.earnedNow > 0) {
          setPresenceTime(response.minutesToday || presenceTime + 1);
          // Refresh full status to get updated missions
          fetchRewardsStatus();
        }
      } catch (err) {
        console.error('Failed to record presence:', err);
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [walletAddress, isTabActive, presenceTime, fetchRewardsStatus]);

  // Handle claim mission reward
  const handleClaimMission = async (missionId: string) => {
    if (!walletAddress || isLoading) return;

    setIsLoading(true);
    try {
      const response = await api.claimMission(walletAddress, missionId);
      if (response.success) {
        const mission = MISSIONS_DATA.find(m => m.id === missionId);
        const missionTitle = language === 'fr' ? mission?.titleFr : mission?.title;
        onRewardEarned(response.reward, missionTitle || 'Mission');
        await fetchRewardsStatus();
      }
    } catch (err: any) {
      console.error('Failed to claim mission:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Twitter share
  const handleTwitterShare = async () => {
    if (!walletAddress || isLoading) return;

    // Open Twitter share window
    const text = language === 'fr'
      ? `Je viens de découvrir VibeCoin ! La crypto qui récompense la créativité et les bonnes vibes. Rejoins-moi sur le testnet ! Mon adresse: ${walletAddress.substring(0, 20)}...`
      : `Just discovered VibeCoin! The crypto that rewards creativity and good vibes. Join me on testnet! My address: ${walletAddress.substring(0, 20)}...`;

    const url = 'https://iosblkstudio.github.io/VibeCoin/';
    const hashtags = 'VibeCoin,Crypto,Web3,Testnet';
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;

    window.open(shareUrl, '_blank', 'width=600,height=400');

    // Claim reward from server
    setIsLoading(true);
    try {
      const response = await api.claimTwitterReward(walletAddress);
      if (response.success) {
        onRewardEarned(response.reward, language === 'fr' ? 'Partage Twitter' : 'Twitter Share');
        await fetchRewardsStatus();
      }
    } catch (err: any) {
      // Cooldown error is expected, don't show as error
      if (!err.message.includes('cooldown')) {
        console.error('Failed to claim Twitter reward:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check if mission is completed
  const isMissionCompleted = (action: string): boolean => {
    if (!rewardsStatus) return false;
    const missions = rewardsStatus.missions;
    if (action === 'presenceMinutes') {
      return missions.presenceMinutes >= 10;
    }
    return (missions as any)[action] === true;
  };

  // Get mission progress
  const getMissionProgress = (action: string, target: number): number => {
    if (!rewardsStatus) return 0;
    const missions = rewardsStatus.missions;
    if (action === 'presenceMinutes') {
      return Math.min(missions.presenceMinutes, target);
    }
    return (missions as any)[action] ? 1 : 0;
  };

  // Check if mission is claimed
  const isMissionClaimed = (missionId: string): boolean => {
    if (!rewardsStatus) return false;
    return rewardsStatus.missions.claimed.includes(missionId);
  };

  if (!isVisible) return null;

  return (
    <div className="rewards-overlay" onClick={onClose}>
      <div className="rewards-panel" onClick={e => e.stopPropagation()}>
        <div className="rewards-header">
          <h2>🎁 {t.title} <span style={{ fontSize: '12px', opacity: 0.7 }}>{t.onChain}</span></h2>
          <button className="rewards-close" onClick={onClose}>×</button>
        </div>

        {!walletAddress ? (
          <div className="rewards-no-wallet">
            <span className="rewards-lock">🔒</span>
            <p>{t.noWallet}</p>
          </div>
        ) : error ? (
          <div className="rewards-no-wallet">
            <span className="rewards-lock">⚠️</span>
            <p>{error}</p>
            <button
              onClick={fetchRewardsStatus}
              style={{ marginTop: '10px', padding: '8px 16px', cursor: 'pointer' }}
            >
              {language === 'fr' ? 'Réessayer' : 'Retry'}
            </button>
          </div>
        ) : !rewardsStatus ? (
          <div className="rewards-no-wallet">
            <p>{t.loading}</p>
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
                  <span className="stat-value">{rewardsStatus.presence.earnedToday.toFixed(2)} VIBE</span>
                </div>
              </div>
              <div className="rewards-progress">
                <div
                  className="rewards-progress-bar"
                  style={{ width: `${Math.min(100, (rewardsStatus.presence.earnedToday / config.MAX_DAILY_PRESENCE) * 100)}%` }}
                />
              </div>
              <p className="rewards-limit">{t.dailyLimit}</p>
            </div>

            {/* Streak Section */}
            <div className="rewards-section">
              <h3>🔥 {t.streak}</h3>
              <div className="streak-display">
                <span className="streak-number">{rewardsStatus.streak.current}</span>
                <span className="streak-label">{t.streakDays(rewardsStatus.streak.current)}</span>
              </div>
              <div className="streak-bonuses">
                {[2, 3, 7, 14, 30].map(day => (
                  <div
                    key={day}
                    className={`streak-bonus ${rewardsStatus.streak.current >= day ? 'achieved' : ''}`}
                  >
                    <span className="streak-day">{day}</span>
                    <span className="streak-reward">
                      +{day === 2 ? config.STREAK_DAY_2 :
                        day === 3 ? config.STREAK_DAY_3 :
                        day === 7 ? config.STREAK_DAY_7 :
                        day === 14 ? config.STREAK_DAY_14 : config.STREAK_DAY_30}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Missions Section */}
            <div className="rewards-section">
              <h3>📋 {t.missions}</h3>
              <div className="missions-list">
                {MISSIONS_DATA.map(mission => {
                  const completed = isMissionCompleted(mission.action);
                  const claimed = isMissionClaimed(mission.id);
                  const progress = getMissionProgress(mission.action, mission.target);

                  return (
                    <div key={mission.id} className={`mission-item ${completed ? 'completed' : ''}`}>
                      <div className="mission-info">
                        <span className={`mission-type ${mission.type}`}>
                          {mission.type === 'easy' ? '⭐' : mission.type === 'medium' ? '⭐⭐' : '⭐⭐⭐'}
                        </span>
                        <div className="mission-text">
                          <span className="mission-title">
                            {language === 'fr' ? mission.titleFr : mission.title}
                          </span>
                          <span className="mission-progress">
                            {progress}/{mission.target}
                          </span>
                        </div>
                      </div>
                      <div className="mission-reward">
                        <span className="mission-vibe">+{mission.reward} VIBE</span>
                        {completed && !claimed && (
                          <button
                            className="mission-claim-btn"
                            onClick={() => handleClaimMission(mission.id)}
                            disabled={isLoading}
                          >
                            {t.claim}
                          </button>
                        )}
                        {claimed && (
                          <span className="mission-claimed">✓ {t.claimed}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Social Section */}
            <div className="rewards-section">
              <h3>📣 {t.social}</h3>
              <p className="rewards-desc">{t.shareReward}</p>
              <button
                className="twitter-share-btn"
                onClick={handleTwitterShare}
                disabled={!rewardsStatus.twitter.canShare || isLoading}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                {!rewardsStatus.twitter.canShare ? t.cooldown(rewardsStatus.twitter.cooldownMinutes) : t.shareTwitter}
              </button>
            </div>

            {/* Stats Section */}
            <div className="rewards-section stats">
              <div className="rewards-total">
                <span className="total-label">{t.totalEarned}</span>
                <span className="total-value">{rewardsStatus.totalEarned.toFixed(2)} VIBE</span>
              </div>
              <div className="rewards-total">
                <span className="total-label">{t.verified}</span>
                <span className="total-value" style={{ fontSize: '14px' }}>✓</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RewardsPanel;
