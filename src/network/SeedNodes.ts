/**
 * VibeCoin Seed Nodes - Public nodes for initial peer discovery
 *
 * Seed nodes are well-known, always-online nodes that help new nodes
 * discover the network. They are the entry points to the P2P network.
 */

export interface SeedNode {
  address: string;
  name: string;
  region: string;
  isPublic: boolean;
}

/**
 * Official VibeCoin seed nodes by network
 */
export const SEED_NODES: Record<string, SeedNode[]> = {
  mainnet: [
    // Future mainnet nodes
    { address: 'seed1.vibecoin.network:6001', name: 'VibeSeed EU', region: 'europe', isPublic: true },
    { address: 'seed2.vibecoin.network:6001', name: 'VibeSeed US', region: 'us-east', isPublic: true },
    { address: 'seed3.vibecoin.network:6001', name: 'VibeSeed Asia', region: 'asia', isPublic: true },
  ],
  testnet: [
    // Testnet nodes - more permissive
    { address: 'testnet1.vibecoin.network:6001', name: 'Testnet EU', region: 'europe', isPublic: true },
    { address: 'testnet2.vibecoin.network:6001', name: 'Testnet US', region: 'us-east', isPublic: true },
    // Local/dev seed for testing
    { address: 'localhost:6001', name: 'Local Dev', region: 'local', isPublic: false },
  ],
  local: [
    // Local development only
    { address: 'localhost:6001', name: 'Local Primary', region: 'local', isPublic: false },
    { address: 'localhost:6002', name: 'Local Secondary', region: 'local', isPublic: false },
  ]
};

/**
 * Bootstrap DNS seeds (future implementation)
 * These DNS records return lists of seed node IPs
 */
export const DNS_SEEDS: Record<string, string[]> = {
  mainnet: [
    'dnsseed.vibecoin.network',
    'seed.vibe.community',
  ],
  testnet: [
    'testnet-seed.vibecoin.network',
  ],
  local: []
};

/**
 * Configuration for peer discovery
 */
export const DISCOVERY_CONFIG = {
  // How often to request peer lists from connected nodes
  PEER_EXCHANGE_INTERVAL: 60000, // 1 minute

  // Minimum peers before actively seeking more
  MIN_PEERS: 3,

  // Maximum peers to connect to
  MAX_PEERS: 25,

  // How often to try reconnecting to seed nodes if low on peers
  SEED_RECONNECT_INTERVAL: 300000, // 5 minutes

  // Timeout for connection attempts
  CONNECTION_TIMEOUT: 10000, // 10 seconds

  // How long to wait before retrying a failed peer
  PEER_RETRY_DELAY: 60000, // 1 minute

  // Maximum age of peer info before considered stale
  PEER_MAX_AGE: 3600000, // 1 hour
};

/**
 * Get seed nodes for a specific network
 */
export function getSeedNodes(network: string): string[] {
  const nodes = SEED_NODES[network] || SEED_NODES.testnet;
  return nodes.map(n => n.address);
}

/**
 * Get public seed nodes only (for initial bootstrap)
 */
export function getPublicSeedNodes(network: string): string[] {
  const nodes = SEED_NODES[network] || SEED_NODES.testnet;
  return nodes.filter(n => n.isPublic).map(n => n.address);
}

/**
 * Community-contributed nodes registry
 * Users can register their nodes here for better decentralization
 */
export interface CommunityNode {
  address: string;
  publicKey: string;
  registeredAt: number;
  lastSeen: number;
  uptime: number;
  version: string;
}

/**
 * Peer scoring - nodes that are more reliable get higher scores
 */
export interface PeerScore {
  address: string;
  score: number;
  successfulConnections: number;
  failedConnections: number;
  blocksReceived: number;
  invalidBlocks: number;
  latency: number;
  lastUpdated: number;
}

/**
 * Calculate peer score based on reliability metrics
 */
export function calculatePeerScore(peer: PeerScore): number {
  const successRate = peer.successfulConnections /
    (peer.successfulConnections + peer.failedConnections + 1);

  const validBlockRate = peer.blocksReceived /
    (peer.blocksReceived + peer.invalidBlocks + 1);

  // Lower latency = better score
  const latencyScore = Math.max(0, 1 - (peer.latency / 5000));

  // Combine factors
  return (successRate * 0.4) + (validBlockRate * 0.4) + (latencyScore * 0.2);
}

/**
 * Node capabilities - what a node can do
 */
export enum NodeCapability {
  FULL_NODE = 'FULL_NODE',           // Stores complete blockchain
  LIGHT_NODE = 'LIGHT_NODE',         // Only stores headers
  MINER = 'MINER',                   // Can mine blocks
  VALIDATOR = 'VALIDATOR',           // Can validate with PoV
  RELAY = 'RELAY',                   // Fast relay node
  ARCHIVE = 'ARCHIVE',               // Stores all historical data
}

/**
 * Node advertisement - what a node broadcasts about itself
 */
export interface NodeAdvertisement {
  nodeId: string;
  version: string;
  network: string;
  capabilities: NodeCapability[];
  blockHeight: number;
  address: string;
  port: number;
  timestamp: number;
}
