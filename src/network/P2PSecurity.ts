/**
 * VibeCoin P2P Security - Protection against network attacks
 *
 * This module provides:
 * - Rate limiting (prevent DDoS)
 * - Peer banning (punish bad actors)
 * - Connection limits per IP
 * - Message validation
 */

/**
 * Security configuration
 */
export const SECURITY_CONFIG = {
  // Rate limiting
  MAX_MESSAGES_PER_SECOND: 10,      // Max messages per peer per second
  MAX_CONNECTIONS_PER_IP: 3,         // Max connections from same IP
  MAX_CONNECTION_ATTEMPTS_PER_MIN: 5, // Max connection attempts per minute

  // Message limits
  MAX_MESSAGE_SIZE: 1024 * 1024,     // 1MB max message size
  MAX_BLOCKS_PER_REQUEST: 100,       // Max blocks in one sync request
  MAX_TRANSACTIONS_PER_BLOCK: 1000,  // Max transactions per block

  // Banning
  BAN_DURATION_MS: 24 * 60 * 60 * 1000,  // 24 hours
  BAN_THRESHOLD_SCORE: -10,              // Ban when score drops below this

  // Scoring (negative = bad behavior)
  SCORE_INVALID_BLOCK: -5,
  SCORE_INVALID_TRANSACTION: -2,
  SCORE_SPAM_MESSAGE: -1,
  SCORE_PROTOCOL_VIOLATION: -3,
  SCORE_VALID_BLOCK: +1,
  SCORE_VALID_TRANSACTION: +0.5,

  // Timeouts
  HANDSHAKE_TIMEOUT_MS: 10000,       // 10 seconds to complete handshake
  PING_TIMEOUT_MS: 30000,            // 30 seconds ping timeout
};

/**
 * Banned peer information
 */
interface BannedPeer {
  ip: string;
  reason: string;
  bannedAt: number;
  expiresAt: number;
}

/**
 * Rate limit tracker for a peer
 */
interface RateLimitTracker {
  messageCount: number;
  windowStart: number;
  connectionAttempts: number;
  connectionWindowStart: number;
}

/**
 * P2P Security Manager
 */
export class P2PSecurity {
  private bannedPeers: Map<string, BannedPeer> = new Map();
  private peerScores: Map<string, number> = new Map();
  private rateLimiters: Map<string, RateLimitTracker> = new Map();
  private connectionsPerIP: Map<string, number> = new Map();

  /**
   * Check if an IP is banned
   */
  isBanned(ip: string): boolean {
    const ban = this.bannedPeers.get(ip);
    if (!ban) return false;

    // Check if ban expired
    if (Date.now() > ban.expiresAt) {
      this.bannedPeers.delete(ip);
      console.log(`🔓 Ban expired for ${ip}`);
      return false;
    }

    return true;
  }

  /**
   * Ban a peer
   */
  banPeer(ip: string, reason: string): void {
    const now = Date.now();
    this.bannedPeers.set(ip, {
      ip,
      reason,
      bannedAt: now,
      expiresAt: now + SECURITY_CONFIG.BAN_DURATION_MS,
    });
    console.log(`🚫 Banned ${ip}: ${reason}`);
  }

  /**
   * Check if a new connection from this IP is allowed
   */
  canConnect(ip: string): { allowed: boolean; reason?: string } {
    // Check ban
    if (this.isBanned(ip)) {
      return { allowed: false, reason: 'IP is banned' };
    }

    // Check connections per IP
    const currentConnections = this.connectionsPerIP.get(ip) || 0;
    if (currentConnections >= SECURITY_CONFIG.MAX_CONNECTIONS_PER_IP) {
      return { allowed: false, reason: 'Too many connections from this IP' };
    }

    // Check connection rate
    const tracker = this.getOrCreateRateLimiter(ip);
    const now = Date.now();

    // Reset window if expired (1 minute)
    if (now - tracker.connectionWindowStart > 60000) {
      tracker.connectionAttempts = 0;
      tracker.connectionWindowStart = now;
    }

    if (tracker.connectionAttempts >= SECURITY_CONFIG.MAX_CONNECTION_ATTEMPTS_PER_MIN) {
      return { allowed: false, reason: 'Too many connection attempts' };
    }

    tracker.connectionAttempts++;
    return { allowed: true };
  }

  /**
   * Track a new connection
   */
  trackConnection(ip: string): void {
    const current = this.connectionsPerIP.get(ip) || 0;
    this.connectionsPerIP.set(ip, current + 1);
  }

  /**
   * Track a disconnection
   */
  trackDisconnection(ip: string): void {
    const current = this.connectionsPerIP.get(ip) || 0;
    if (current > 0) {
      this.connectionsPerIP.set(ip, current - 1);
    }
  }

  /**
   * Check if a message should be rate limited
   */
  checkRateLimit(ip: string): { allowed: boolean; reason?: string } {
    const tracker = this.getOrCreateRateLimiter(ip);
    const now = Date.now();

    // Reset window if expired (1 second)
    if (now - tracker.windowStart > 1000) {
      tracker.messageCount = 0;
      tracker.windowStart = now;
    }

    if (tracker.messageCount >= SECURITY_CONFIG.MAX_MESSAGES_PER_SECOND) {
      this.adjustScore(ip, SECURITY_CONFIG.SCORE_SPAM_MESSAGE);
      return { allowed: false, reason: 'Rate limit exceeded' };
    }

    tracker.messageCount++;
    return { allowed: true };
  }

  /**
   * Validate message size
   */
  validateMessageSize(message: string): { valid: boolean; reason?: string } {
    if (message.length > SECURITY_CONFIG.MAX_MESSAGE_SIZE) {
      return { valid: false, reason: 'Message too large' };
    }
    return { valid: true };
  }

  /**
   * Adjust peer score
   */
  adjustScore(ip: string, delta: number): number {
    const currentScore = this.peerScores.get(ip) || 0;
    const newScore = currentScore + delta;
    this.peerScores.set(ip, newScore);

    // Auto-ban if score too low
    if (newScore <= SECURITY_CONFIG.BAN_THRESHOLD_SCORE) {
      this.banPeer(ip, `Score dropped to ${newScore}`);
    }

    return newScore;
  }

  /**
   * Report invalid block from peer
   */
  reportInvalidBlock(ip: string): void {
    this.adjustScore(ip, SECURITY_CONFIG.SCORE_INVALID_BLOCK);
    console.log(`⚠️ Invalid block from ${ip}, score adjusted`);
  }

  /**
   * Report invalid transaction from peer
   */
  reportInvalidTransaction(ip: string): void {
    this.adjustScore(ip, SECURITY_CONFIG.SCORE_INVALID_TRANSACTION);
  }

  /**
   * Report protocol violation
   */
  reportProtocolViolation(ip: string, reason: string): void {
    this.adjustScore(ip, SECURITY_CONFIG.SCORE_PROTOCOL_VIOLATION);
    console.log(`⚠️ Protocol violation from ${ip}: ${reason}`);
  }

  /**
   * Report valid block (reward good behavior)
   */
  reportValidBlock(ip: string): void {
    this.adjustScore(ip, SECURITY_CONFIG.SCORE_VALID_BLOCK);
  }

  /**
   * Report valid transaction (reward good behavior)
   */
  reportValidTransaction(ip: string): void {
    this.adjustScore(ip, SECURITY_CONFIG.SCORE_VALID_TRANSACTION);
  }

  /**
   * Get peer score
   */
  getPeerScore(ip: string): number {
    return this.peerScores.get(ip) || 0;
  }

  /**
   * Get list of banned peers
   */
  getBannedPeers(): BannedPeer[] {
    // Clean expired bans first
    const now = Date.now();
    for (const [ip, ban] of this.bannedPeers) {
      if (now > ban.expiresAt) {
        this.bannedPeers.delete(ip);
      }
    }
    return Array.from(this.bannedPeers.values());
  }

  /**
   * Manually unban a peer
   */
  unbanPeer(ip: string): boolean {
    if (this.bannedPeers.has(ip)) {
      this.bannedPeers.delete(ip);
      this.peerScores.set(ip, 0); // Reset score
      console.log(`🔓 Manually unbanned ${ip}`);
      return true;
    }
    return false;
  }

  /**
   * Get security statistics
   */
  getStats(): object {
    return {
      bannedPeers: this.bannedPeers.size,
      trackedPeers: this.peerScores.size,
      activeConnections: Array.from(this.connectionsPerIP.values()).reduce((a, b) => a + b, 0),
    };
  }

  /**
   * Get or create rate limiter for IP
   */
  private getOrCreateRateLimiter(ip: string): RateLimitTracker {
    let tracker = this.rateLimiters.get(ip);
    if (!tracker) {
      tracker = {
        messageCount: 0,
        windowStart: Date.now(),
        connectionAttempts: 0,
        connectionWindowStart: Date.now(),
      };
      this.rateLimiters.set(ip, tracker);
    }
    return tracker;
  }

  /**
   * Clean up old rate limiters (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [ip, tracker] of this.rateLimiters) {
      if (now - tracker.windowStart > maxAge) {
        this.rateLimiters.delete(ip);
      }
    }
  }
}

// Singleton instance
export const p2pSecurity = new P2PSecurity();
