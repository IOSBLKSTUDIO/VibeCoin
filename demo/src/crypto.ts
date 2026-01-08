/**
 * Wallet encryption/decryption utilities using Web Crypto API
 * Uses AES-GCM for secure encryption with password-derived key
 */

// Derive a key from password using PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES key from password
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt).buffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt wallet data with password
export async function encryptWallet(
  walletData: object,
  password: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(walletData));

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Encrypt data
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

// Decrypt wallet data with password
export async function decryptWallet(
  encryptedString: string,
  password: string
): Promise<object> {
  // Decode base64
  const combined = new Uint8Array(
    atob(encryptedString).split('').map(c => c.charCodeAt(0))
  );

  // Extract salt, iv, and encrypted data
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encryptedData = combined.slice(28);

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Decrypt data
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  );

  // Decode and parse JSON
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decryptedData));
}

// Export wallet to encrypted file
export async function exportWalletToFile(
  walletData: object,
  password: string
): Promise<void> {
  const encrypted = await encryptWallet(walletData, password);

  const exportData = {
    version: 1,
    type: 'vibecoin-wallet',
    encrypted,
    createdAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  });

  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vibecoin-wallet-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import wallet from encrypted file
export async function importWalletFromFile(
  file: File,
  password: string
): Promise<object> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const fileData = JSON.parse(content);

        if (fileData.type !== 'vibecoin-wallet') {
          throw new Error('Invalid wallet file');
        }

        const walletData = await decryptWallet(fileData.encrypted, password);
        resolve(walletData);
      } catch (error) {
        reject(new Error('Failed to decrypt wallet. Wrong password or corrupted file.'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
