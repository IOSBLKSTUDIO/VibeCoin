/**
 * VibeCoin Rewards System
 * Gamification module for earning VIBE through activities
 */

// Storage keys
const REWARDS_STORAGE_KEY = 'vibecoin_rewards';
const STREAK_STORAGE_KEY = 'vibecoin_streak';
const MISSIONS_STORAGE_KEY = 'vibecoin_missions';

// Reward rates
export const REWARDS = {
  // Proof of Presence
  PRESENCE_PER_MINUTE: 0.1,        // 0.1 VIBE per minute connected
  PRESENCE_ACTIVE_BONUS: 0.05,    // +0.05 if tab is active
  MAX_DAILY_PRESENCE: 100,        // Max 100 VIBE per day from presence

  // Streak bonuses
  STREAK_DAY_2: 5,
  STREAK_DAY_3: 10,
  STREAK_DAY_7: 25,
  STREAK_DAY_14: 50,
  STREAK_DAY_30: 100,

  // Social rewards
  TWITTER_SHARE: 10,              // Share on Twitter
  TWITTER_SHARE_COOLDOWN: 3600000, // 1 hour cooldown

  // Mission rewards
  MISSION_EASY: 5,
  MISSION_MEDIUM: 15,
  MISSION_HARD: 30,
};

export interface RewardsState {
  totalEarned: number;
  pendingRewards: number;
  lastClaimTime: number;
  presenceMinutes: number;
  dailyPresenceEarned: number;
  lastPresenceDay: string;
}

export interface StreakState {
  currentStreak: number;
  lastLoginDate: string;
  longestStreak: number;
  streakBonusClaimed: boolean;
}

export interface Mission {
  id: string;
  title: string;
  titleFr: string;
  description: string;
  descriptionFr: string;
  reward: number;
  type: 'easy' | 'medium' | 'hard';
  action: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
}

export interface MissionsState {
  daily: Mission[];
  lastResetDate: string;
  completedToday: number;
}

export interface SocialState {
  lastTwitterShare: number;
  totalShares: number;
}

// Get today's date string
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Initialize rewards state
export function initRewardsState(): RewardsState {
  const stored = localStorage.getItem(REWARDS_STORAGE_KEY);
  if (stored) {
    const state = JSON.parse(stored) as RewardsState;
    // Reset daily presence if new day
    if (state.lastPresenceDay !== getTodayString()) {
      state.dailyPresenceEarned = 0;
      state.lastPresenceDay = getTodayString();
      saveRewardsState(state);
    }
    return state;
  }

  const initial: RewardsState = {
    totalEarned: 0,
    pendingRewards: 0,
    lastClaimTime: Date.now(),
    presenceMinutes: 0,
    dailyPresenceEarned: 0,
    lastPresenceDay: getTodayString(),
  };
  saveRewardsState(initial);
  return initial;
}

export function saveRewardsState(state: RewardsState): void {
  localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(state));
}

// Initialize streak state
export function initStreakState(): StreakState {
  const stored = localStorage.getItem(STREAK_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored) as StreakState;
  }

  const initial: StreakState = {
    currentStreak: 0,
    lastLoginDate: '',
    longestStreak: 0,
    streakBonusClaimed: false,
  };
  saveStreakState(initial);
  return initial;
}

export function saveStreakState(state: StreakState): void {
  localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(state));
}

// Check and update streak on login
export function updateStreak(state: StreakState): { state: StreakState; bonus: number; isNewStreak: boolean } {
  const today = getTodayString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let bonus = 0;
  let isNewStreak = false;

  if (state.lastLoginDate === today) {
    // Already logged in today
    return { state, bonus: 0, isNewStreak: false };
  }

  if (state.lastLoginDate === yesterday) {
    // Consecutive day - increase streak
    state.currentStreak += 1;
    isNewStreak = true;
  } else if (state.lastLoginDate !== today) {
    // Streak broken - reset to 1
    state.currentStreak = 1;
    isNewStreak = true;
  }

  state.lastLoginDate = today;
  state.streakBonusClaimed = false;

  // Update longest streak
  if (state.currentStreak > state.longestStreak) {
    state.longestStreak = state.currentStreak;
  }

  // Calculate streak bonus
  if (state.currentStreak >= 30) bonus = REWARDS.STREAK_DAY_30;
  else if (state.currentStreak >= 14) bonus = REWARDS.STREAK_DAY_14;
  else if (state.currentStreak >= 7) bonus = REWARDS.STREAK_DAY_7;
  else if (state.currentStreak >= 3) bonus = REWARDS.STREAK_DAY_3;
  else if (state.currentStreak >= 2) bonus = REWARDS.STREAK_DAY_2;

  saveStreakState(state);
  return { state, bonus, isNewStreak };
}

// Generate daily missions
export function generateDailyMissions(): Mission[] {
  const missions: Mission[] = [
    {
      id: 'check_balance',
      title: 'Check your balance',
      titleFr: 'Vérifier ton solde',
      description: 'View your wallet balance',
      descriptionFr: 'Consulte le solde de ton wallet',
      reward: REWARDS.MISSION_EASY,
      type: 'easy',
      action: 'balance',
      progress: 0,
      target: 1,
      completed: false,
      claimed: false,
    },
    {
      id: 'view_blocks',
      title: 'Explore the blockchain',
      titleFr: 'Explorer la blockchain',
      description: 'View the latest blocks',
      descriptionFr: 'Consulte les derniers blocs',
      reward: REWARDS.MISSION_EASY,
      type: 'easy',
      action: 'blocks',
      progress: 0,
      target: 1,
      completed: false,
      claimed: false,
    },
    {
      id: 'claim_faucet',
      title: 'Claim from faucet',
      titleFr: 'Réclamer au faucet',
      description: 'Get free VIBE from the faucet',
      descriptionFr: 'Obtiens des VIBE gratuits au faucet',
      reward: REWARDS.MISSION_EASY,
      type: 'easy',
      action: 'faucet',
      progress: 0,
      target: 1,
      completed: false,
      claimed: false,
    },
    {
      id: 'send_transaction',
      title: 'Make a transaction',
      titleFr: 'Effectuer une transaction',
      description: 'Send VIBE to another address',
      descriptionFr: 'Envoie des VIBE à une autre adresse',
      reward: REWARDS.MISSION_MEDIUM,
      type: 'medium',
      action: 'send',
      progress: 0,
      target: 1,
      completed: false,
      claimed: false,
    },
    {
      id: 'share_twitter',
      title: 'Share on Twitter/X',
      titleFr: 'Partager sur Twitter/X',
      description: 'Share VibeCoin on social media',
      descriptionFr: 'Partage VibeCoin sur les réseaux sociaux',
      reward: REWARDS.MISSION_MEDIUM,
      type: 'medium',
      action: 'twitter',
      progress: 0,
      target: 1,
      completed: false,
      claimed: false,
    },
    {
      id: 'stay_connected',
      title: 'Stay connected 10 min',
      titleFr: 'Rester connecté 10 min',
      description: 'Keep the app open for 10 minutes',
      descriptionFr: 'Garde l\'app ouverte pendant 10 minutes',
      reward: REWARDS.MISSION_HARD,
      type: 'hard',
      action: 'presence',
      progress: 0,
      target: 10,
      completed: false,
      claimed: false,
    },
  ];

  return missions;
}

// Initialize missions state
export function initMissionsState(): MissionsState {
  const stored = localStorage.getItem(MISSIONS_STORAGE_KEY);
  const today = getTodayString();

  if (stored) {
    const state = JSON.parse(stored) as MissionsState;
    // Reset missions if new day
    if (state.lastResetDate !== today) {
      state.daily = generateDailyMissions();
      state.lastResetDate = today;
      state.completedToday = 0;
      saveMissionsState(state);
    }
    return state;
  }

  const initial: MissionsState = {
    daily: generateDailyMissions(),
    lastResetDate: today,
    completedToday: 0,
  };
  saveMissionsState(initial);
  return initial;
}

export function saveMissionsState(state: MissionsState): void {
  localStorage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(state));
}

// Update mission progress
export function updateMissionProgress(
  state: MissionsState,
  action: string,
  increment: number = 1
): { state: MissionsState; completed: Mission | null } {
  let completedMission: Mission | null = null;

  state.daily = state.daily.map(mission => {
    if (mission.action === action && !mission.completed) {
      mission.progress = Math.min(mission.progress + increment, mission.target);
      if (mission.progress >= mission.target) {
        mission.completed = true;
        completedMission = mission;
        state.completedToday += 1;
      }
    }
    return mission;
  });

  saveMissionsState(state);
  return { state, completed: completedMission };
}

// Claim mission reward
export function claimMissionReward(
  missionsState: MissionsState,
  missionId: string
): { missionsState: MissionsState; reward: number } {
  let reward = 0;

  missionsState.daily = missionsState.daily.map(mission => {
    if (mission.id === missionId && mission.completed && !mission.claimed) {
      mission.claimed = true;
      reward = mission.reward;
    }
    return mission;
  });

  saveMissionsState(missionsState);
  return { missionsState, reward };
}

// Calculate presence rewards
export function calculatePresenceReward(
  state: RewardsState,
  minutesElapsed: number,
  isTabActive: boolean
): { state: RewardsState; earned: number } {
  // Check if we've hit daily limit
  if (state.dailyPresenceEarned >= REWARDS.MAX_DAILY_PRESENCE) {
    return { state, earned: 0 };
  }

  let rate = REWARDS.PRESENCE_PER_MINUTE;
  if (isTabActive) {
    rate += REWARDS.PRESENCE_ACTIVE_BONUS;
  }

  let earned = minutesElapsed * rate;

  // Cap at daily limit
  if (state.dailyPresenceEarned + earned > REWARDS.MAX_DAILY_PRESENCE) {
    earned = REWARDS.MAX_DAILY_PRESENCE - state.dailyPresenceEarned;
  }

  state.presenceMinutes += minutesElapsed;
  state.dailyPresenceEarned += earned;
  state.pendingRewards += earned;

  saveRewardsState(state);
  return { state, earned };
}

// Generate Twitter share URL
export function generateTwitterShareUrl(address: string, language: 'en' | 'fr'): string {
  const text = language === 'fr'
    ? `Je viens de découvrir VibeCoin ! La crypto qui récompense la créativité et les bonnes vibes. Rejoins-moi sur le testnet ! Mon adresse: ${address.substring(0, 20)}...`
    : `Just discovered VibeCoin! The crypto that rewards creativity and good vibes. Join me on testnet! My address: ${address.substring(0, 20)}...`;

  const url = 'https://iosblkstudio.github.io/VibeCoin/';
  const hashtags = 'VibeCoin,Crypto,Web3,Testnet';

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;
}

// Check if Twitter share is available
export function canShareOnTwitter(): boolean {
  const lastShare = localStorage.getItem('vibecoin_last_twitter_share');
  if (!lastShare) return true;

  const elapsed = Date.now() - parseInt(lastShare);
  return elapsed >= REWARDS.TWITTER_SHARE_COOLDOWN;
}

// Record Twitter share
export function recordTwitterShare(): number {
  localStorage.setItem('vibecoin_last_twitter_share', Date.now().toString());
  return REWARDS.TWITTER_SHARE;
}

// Get time until next Twitter share
export function getTwitterShareCooldown(): number {
  const lastShare = localStorage.getItem('vibecoin_last_twitter_share');
  if (!lastShare) return 0;

  const elapsed = Date.now() - parseInt(lastShare);
  const remaining = REWARDS.TWITTER_SHARE_COOLDOWN - elapsed;
  return Math.max(0, Math.ceil(remaining / 60000)); // Return minutes
}
