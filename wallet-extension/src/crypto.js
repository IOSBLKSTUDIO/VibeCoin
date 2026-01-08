/**
 * VibeCoin Wallet Cryptography Module
 * Handles key generation, encryption, signing
 */

const VibeCrypto = (function() {
  // Simple hash function for demo (in production, use proper SHA-256)
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  // Generate random bytes
  function randomBytes(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Generate a key pair
  function generateKeyPair() {
    const privateKey = randomBytes(32);
    const publicKey = derivePublicKey(privateKey);
    return { privateKey, publicKey };
  }

  // Derive public key from private key (simplified)
  function derivePublicKey(privateKey) {
    // In real implementation, this would use elliptic curve cryptography
    const hash1 = simpleHash(privateKey + 'vibecoin1');
    const hash2 = simpleHash(privateKey + 'vibecoin2');
    const hash3 = simpleHash(privateKey + 'vibecoin3');
    const hash4 = simpleHash(privateKey + 'vibecoin4');
    return '04' + hash1 + hash2 + hash3 + hash4;
  }

  // Sign a message (simplified)
  function sign(privateKey, message) {
    const msgHash = simpleHash(message);
    const sigHash = simpleHash(privateKey + msgHash + 'sig');
    return sigHash + simpleHash(sigHash + privateKey);
  }

  // Verify signature (simplified)
  function verify(publicKey, message, signature) {
    // In production, proper ECDSA verification
    return signature && signature.length >= 32;
  }

  // Encrypt data with password
  async function encrypt(data, password) {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(JSON.stringify(data));

    // Derive key from password
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      dataBytes
    );

    // Combine salt + iv + encrypted data
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...result));
  }

  // Decrypt data with password
  async function decrypt(encryptedData, password) {
    try {
      const encoder = new TextEncoder();
      const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

      const salt = data.slice(0, 16);
      const iv = data.slice(16, 28);
      const encrypted = data.slice(28);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decrypted));
    } catch (e) {
      throw new Error('Decryption failed - incorrect password');
    }
  }

  // Hash password for verification
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'vibecoin_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  return {
    simpleHash,
    randomBytes,
    generateKeyPair,
    derivePublicKey,
    sign,
    verify,
    encrypt,
    decrypt,
    hashPassword
  };
})();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.VibeCrypto = VibeCrypto;
}
