// VibeCoin Demo Configuration

// API URL - Change this to your Render.com URL after deployment
// For local development: http://localhost:3000
// For production: https://vibecoin-testnet.onrender.com (example)
export const API_URL = import.meta.env.VITE_API_URL || 'https://vibecoin-testnet.onrender.com';

// Network configuration
export const NETWORK = 'testnet';

// Token configuration
export const TOKEN = {
  symbol: 'VIBE',
  name: 'VibeCoin',
  decimals: 8,
  maxSupply: 21_000_000
};

// Faucet configuration
export const FAUCET = {
  amount: 100,
  cooldownMinutes: 60
};
