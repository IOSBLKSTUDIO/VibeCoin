/**
 * VibeCoin Wallet Module
 * Manages wallet state, storage, and transactions
 */

const VibeWallet = (function() {
  const STORAGE_KEY = 'vibecoin_wallet';
  const SETTINGS_KEY = 'vibecoin_settings';

  let currentWallet = null;
  let isUnlocked = false;

  // Initialize wallet from storage
  async function init() {
    const stored = await getStorage(STORAGE_KEY);
    return !!stored;
  }

  // Check if wallet exists
  async function exists() {
    const stored = await getStorage(STORAGE_KEY);
    return !!stored;
  }

  // Check if wallet is unlocked
  function isWalletUnlocked() {
    return isUnlocked && currentWallet !== null;
  }

  // Create new wallet
  async function create(password) {
    const keys = VibeCrypto.generateKeyPair();

    const walletData = {
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      address: keys.publicKey,
      createdAt: Date.now()
    };

    // Encrypt wallet data
    const encrypted = await VibeCrypto.encrypt(walletData, password);
    const passwordHash = await VibeCrypto.hashPassword(password);

    await setStorage(STORAGE_KEY, {
      encrypted,
      passwordHash,
      address: walletData.address
    });

    currentWallet = walletData;
    isUnlocked = true;

    return walletData;
  }

  // Import wallet from private key
  async function importFromKey(privateKey, password) {
    const publicKey = VibeCrypto.derivePublicKey(privateKey);

    const walletData = {
      privateKey,
      publicKey,
      address: publicKey,
      createdAt: Date.now(),
      imported: true
    };

    const encrypted = await VibeCrypto.encrypt(walletData, password);
    const passwordHash = await VibeCrypto.hashPassword(password);

    await setStorage(STORAGE_KEY, {
      encrypted,
      passwordHash,
      address: walletData.address
    });

    currentWallet = walletData;
    isUnlocked = true;

    return walletData;
  }

  // Unlock wallet with password
  async function unlock(password) {
    const stored = await getStorage(STORAGE_KEY);
    if (!stored) {
      throw new Error('No wallet found');
    }

    const passwordHash = await VibeCrypto.hashPassword(password);
    if (passwordHash !== stored.passwordHash) {
      throw new Error('Incorrect password');
    }

    currentWallet = await VibeCrypto.decrypt(stored.encrypted, password);
    isUnlocked = true;

    return currentWallet;
  }

  // Lock wallet
  function lock() {
    currentWallet = null;
    isUnlocked = false;
  }

  // Get wallet address
  async function getAddress() {
    if (currentWallet) {
      return currentWallet.address;
    }
    const stored = await getStorage(STORAGE_KEY);
    return stored ? stored.address : null;
  }

  // Get short address
  function getShortAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  }

  // Get private key (requires unlocked wallet)
  function getPrivateKey() {
    if (!isUnlocked || !currentWallet) {
      throw new Error('Wallet is locked');
    }
    return currentWallet.privateKey;
  }

  // Sign transaction
  function signTransaction(txData) {
    if (!isUnlocked || !currentWallet) {
      throw new Error('Wallet is locked');
    }

    const txHash = VibeCrypto.simpleHash(JSON.stringify(txData));
    const signature = VibeCrypto.sign(currentWallet.privateKey, txHash);

    return {
      ...txData,
      signature
    };
  }

  // Create and sign a transaction
  function createTransaction(to, amount, data = '') {
    if (!isUnlocked || !currentWallet) {
      throw new Error('Wallet is locked');
    }

    const tx = {
      from: currentWallet.address,
      to,
      amount: parseFloat(amount),
      fee: 0.001,
      timestamp: Date.now(),
      data,
      id: VibeCrypto.randomBytes(16)
    };

    return signTransaction(tx);
  }

  // Reset wallet (delete all data)
  async function reset() {
    await removeStorage(STORAGE_KEY);
    await removeStorage(SETTINGS_KEY);
    currentWallet = null;
    isUnlocked = false;
  }

  // Get settings
  async function getSettings() {
    const settings = await getStorage(SETTINGS_KEY);
    return settings || {
      nodeUrl: 'http://localhost:3000',
      network: 'testnet'
    };
  }

  // Save settings
  async function saveSettings(settings) {
    await setStorage(SETTINGS_KEY, settings);
  }

  // Storage helpers using Chrome storage API
  function getStorage(key) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key] || null);
        });
      } else {
        // Fallback for testing outside extension
        const data = localStorage.getItem(key);
        resolve(data ? JSON.parse(data) : null);
      }
    });
  }

  function setStorage(key, value) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ [key]: value }, resolve);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
      }
    });
  }

  function removeStorage(key) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove([key], resolve);
      } else {
        localStorage.removeItem(key);
        resolve();
      }
    });
  }

  return {
    init,
    exists,
    isWalletUnlocked,
    create,
    importFromKey,
    unlock,
    lock,
    getAddress,
    getShortAddress,
    getPrivateKey,
    signTransaction,
    createTransaction,
    reset,
    getSettings,
    saveSettings
  };
})();

if (typeof window !== 'undefined') {
  window.VibeWallet = VibeWallet;
}
