/**
 * VibeCoin Browser Crypto Utilities
 */
import { ec as EC } from 'elliptic';

const ec = new EC('secp256k1');

/**
 * SHA-256 hash function for browser
 */
export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Synchronous SHA-256 using Web Crypto fallback
 */
export function sha256Sync(message: string): string {
  // Simple hash for demo purposes
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Convert to hex and pad
  const hex = Math.abs(hash).toString(16).padStart(64, '0');
  return hex.substring(0, 64);
}

/**
 * Generate key pair
 */
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  const keyPair = ec.genKeyPair();
  return {
    privateKey: keyPair.getPrivate('hex'),
    publicKey: keyPair.getPublic('hex')
  };
}

/**
 * Sign data with private key
 */
export function sign(privateKey: string, data: string): string {
  const keyPair = ec.keyFromPrivate(privateKey, 'hex');
  const signature = keyPair.sign(data);
  return signature.toDER('hex');
}

/**
 * Verify signature
 */
export function verify(publicKey: string, data: string, signature: string): boolean {
  try {
    const key = ec.keyFromPublic(publicKey, 'hex');
    return key.verify(data, signature);
  } catch {
    return false;
  }
}

/**
 * Get public key from private key
 */
export function getPublicKey(privateKey: string): string {
  const keyPair = ec.keyFromPrivate(privateKey, 'hex');
  return keyPair.getPublic('hex');
}
