/**
 * VibeCoin API Module
 * Handles communication with VibeCoin node
 */

const VibeAPI = (function() {
  let baseUrl = 'http://localhost:3000';

  // Set base URL
  function setBaseUrl(url) {
    baseUrl = url.replace(/\/$/, '');
  }

  // Get base URL
  function getBaseUrl() {
    return baseUrl;
  }

  // Generic fetch wrapper
  async function request(endpoint, options = {}) {
    try {
      const url = `${baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Cannot connect to VibeCoin node. Make sure the node is running.');
      }
      throw error;
    }
  }

  // Get wallet balance
  async function getBalance(address) {
    try {
      const data = await request(`/wallet/${address}/balance`);
      return data.balance || 0;
    } catch (error) {
      console.warn('Failed to fetch balance:', error);
      // Return simulated balance for demo
      return getSimulatedBalance(address);
    }
  }

  // Get transaction history
  async function getTransactions(address) {
    try {
      const data = await request(`/wallet/${address}/transactions`);
      return data.transactions || [];
    } catch (error) {
      console.warn('Failed to fetch transactions:', error);
      return getSimulatedTransactions(address);
    }
  }

  // Send transaction
  async function sendTransaction(signedTx) {
    try {
      const data = await request('/transaction', {
        method: 'POST',
        body: JSON.stringify(signedTx)
      });
      return data;
    } catch (error) {
      // For demo, simulate success
      if (error.message.includes('Cannot connect')) {
        return simulateSendTransaction(signedTx);
      }
      throw error;
    }
  }

  // Claim faucet
  async function claimFaucet(address) {
    try {
      const data = await request('/faucet', {
        method: 'POST',
        body: JSON.stringify({ address })
      });
      return data;
    } catch (error) {
      // For demo, simulate faucet
      if (error.message.includes('Cannot connect')) {
        return simulateFaucet(address);
      }
      throw error;
    }
  }

  // Get blockchain info
  async function getBlockchainInfo() {
    try {
      const data = await request('/blockchain/info');
      return data;
    } catch (error) {
      return {
        blocks: 1,
        difficulty: 2,
        pendingTransactions: 0,
        isValid: true,
        network: 'testnet'
      };
    }
  }

  // Get validators
  async function getValidators() {
    try {
      const data = await request('/validators');
      return data.validators || [];
    } catch (error) {
      return [];
    }
  }

  // ===== SIMULATION FUNCTIONS =====
  // Used when node is not available (for demo purposes)

  const simulatedBalances = {};
  const simulatedTransactions = {};

  function getSimulatedBalance(address) {
    if (!simulatedBalances[address]) {
      simulatedBalances[address] = 0;
    }
    return simulatedBalances[address];
  }

  function addSimulatedBalance(address, amount) {
    if (!simulatedBalances[address]) {
      simulatedBalances[address] = 0;
    }
    simulatedBalances[address] += amount;
  }

  function getSimulatedTransactions(address) {
    return simulatedTransactions[address] || [];
  }

  function addSimulatedTransaction(address, tx) {
    if (!simulatedTransactions[address]) {
      simulatedTransactions[address] = [];
    }
    simulatedTransactions[address].unshift(tx);
    // Keep only last 50 transactions
    if (simulatedTransactions[address].length > 50) {
      simulatedTransactions[address] = simulatedTransactions[address].slice(0, 50);
    }
  }

  function simulateFaucet(address) {
    const faucetKey = `faucet_${address}`;
    const lastClaim = parseInt(localStorage.getItem(faucetKey) || '0', 10);
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours

    if (now - lastClaim < cooldown) {
      const remainingTime = Math.ceil((cooldown - (now - lastClaim)) / (60 * 60 * 1000));
      throw new Error(`Please wait ${remainingTime} hours before claiming again`);
    }

    const amount = 100;
    addSimulatedBalance(address, amount);
    localStorage.setItem(faucetKey, now.toString());

    const tx = {
      id: VibeCrypto.randomBytes(16),
      from: 'FAUCET',
      to: address,
      amount,
      timestamp: now,
      type: 'receive',
      status: 'confirmed'
    };
    addSimulatedTransaction(address, tx);

    // Persist balances
    localStorage.setItem('vibecoin_balances', JSON.stringify(simulatedBalances));
    localStorage.setItem('vibecoin_transactions', JSON.stringify(simulatedTransactions));

    return {
      success: true,
      amount,
      txId: tx.id,
      message: `Claimed ${amount} VIBE from faucet`
    };
  }

  function simulateSendTransaction(signedTx) {
    const { from, to, amount, fee } = signedTx;
    const totalCost = amount + fee;

    const balance = getSimulatedBalance(from);
    if (balance < totalCost) {
      throw new Error(`Insufficient balance. You have ${balance} VIBE`);
    }

    // Deduct from sender
    simulatedBalances[from] -= totalCost;

    // Add to receiver
    addSimulatedBalance(to, amount);

    const txId = signedTx.id || VibeCrypto.randomBytes(16);
    const timestamp = Date.now();

    // Add transaction for sender
    addSimulatedTransaction(from, {
      id: txId,
      from,
      to,
      amount,
      fee,
      timestamp,
      type: 'send',
      status: 'confirmed'
    });

    // Add transaction for receiver
    addSimulatedTransaction(to, {
      id: txId,
      from,
      to,
      amount,
      fee: 0,
      timestamp,
      type: 'receive',
      status: 'confirmed'
    });

    // Persist
    localStorage.setItem('vibecoin_balances', JSON.stringify(simulatedBalances));
    localStorage.setItem('vibecoin_transactions', JSON.stringify(simulatedTransactions));

    return {
      success: true,
      txId,
      message: `Sent ${amount} VIBE to ${to.substring(0, 12)}...`
    };
  }

  // Load persisted simulation data
  function loadSimulationData() {
    try {
      const balances = localStorage.getItem('vibecoin_balances');
      const transactions = localStorage.getItem('vibecoin_transactions');

      if (balances) {
        Object.assign(simulatedBalances, JSON.parse(balances));
      }
      if (transactions) {
        Object.assign(simulatedTransactions, JSON.parse(transactions));
      }
    } catch (e) {
      console.warn('Failed to load simulation data:', e);
    }
  }

  // Initialize
  loadSimulationData();

  return {
    setBaseUrl,
    getBaseUrl,
    getBalance,
    getTransactions,
    sendTransaction,
    claimFaucet,
    getBlockchainInfo,
    getValidators,
    // Simulation helpers
    getSimulatedBalance,
    addSimulatedBalance
  };
})();

if (typeof window !== 'undefined') {
  window.VibeAPI = VibeAPI;
}
