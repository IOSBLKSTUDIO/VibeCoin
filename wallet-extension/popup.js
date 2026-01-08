/**
 * VibeCoin Wallet Extension - Main UI Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // View elements
  const views = {
    loading: document.getElementById('loading'),
    welcome: document.getElementById('welcome'),
    import: document.getElementById('import-view'),
    password: document.getElementById('password-view'),
    unlock: document.getElementById('unlock-view'),
    main: document.getElementById('main-view'),
    send: document.getElementById('send-view'),
    receive: document.getElementById('receive-view'),
    faucet: document.getElementById('faucet-view'),
    settings: document.getElementById('settings-view')
  };

  // State
  let pendingAction = null; // 'create' or 'import'
  let importedKey = null;

  // ===== VIEW MANAGEMENT =====

  function showView(viewName) {
    Object.values(views).forEach(view => view.classList.add('hidden'));
    if (views[viewName]) {
      views[viewName].classList.remove('hidden');
    }
  }

  function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 300);
    }, duration);
  }

  // ===== INITIALIZATION =====

  async function init() {
    showView('loading');

    // Load settings
    const settings = await VibeWallet.getSettings();
    VibeAPI.setBaseUrl(settings.nodeUrl);

    // Check if wallet exists
    const walletExists = await VibeWallet.exists();

    if (!walletExists) {
      showView('welcome');
    } else if (VibeWallet.isWalletUnlocked()) {
      await showMainView();
    } else {
      showView('unlock');
    }
  }

  // ===== MAIN VIEW =====

  async function showMainView() {
    showView('main');
    await updateBalanceDisplay();
    await updateTransactionsList();

    const address = await VibeWallet.getAddress();
    document.getElementById('address').textContent = VibeWallet.getShortAddress(address);
  }

  async function updateBalanceDisplay() {
    const address = await VibeWallet.getAddress();
    const balance = await VibeAPI.getBalance(address);

    document.getElementById('balance').textContent = balance.toFixed(4);
    document.getElementById('balance-usd').textContent = `≈ $${(balance * 0.01).toFixed(2)} USD`;

    // Update send view balance too
    const sendBalance = document.getElementById('send-balance');
    if (sendBalance) {
      sendBalance.textContent = balance.toFixed(4);
    }
  }

  async function updateTransactionsList() {
    const address = await VibeWallet.getAddress();
    const transactions = await VibeAPI.getTransactions(address);
    const txList = document.getElementById('transactions');

    if (transactions.length === 0) {
      txList.innerHTML = '<p class="empty-state">No transactions yet</p>';
      return;
    }

    txList.innerHTML = transactions.slice(0, 10).map(tx => {
      const isSend = tx.type === 'send' || tx.from === address;
      const icon = isSend ? '↑' : '↓';
      const amountClass = isSend ? 'negative' : 'positive';
      const amountPrefix = isSend ? '-' : '+';
      const otherAddress = isSend ? tx.to : tx.from;
      const shortAddress = VibeWallet.getShortAddress(otherAddress);
      const timeAgo = getTimeAgo(tx.timestamp);

      return `
        <div class="tx-item">
          <div class="tx-icon">${icon}</div>
          <div class="tx-info">
            <p>${isSend ? 'Sent' : 'Received'}</p>
            <p>${shortAddress} · ${timeAgo}</p>
          </div>
          <span class="tx-amount ${amountClass}">${amountPrefix}${tx.amount} VIBE</span>
        </div>
      `;
    }).join('');
  }

  function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  // ===== WALLET CREATION =====

  document.getElementById('btn-create').addEventListener('click', () => {
    pendingAction = 'create';
    showView('password');
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    showView('import');
  });

  document.getElementById('btn-back-import').addEventListener('click', () => {
    showView('welcome');
  });

  document.getElementById('btn-do-import').addEventListener('click', () => {
    const key = document.getElementById('import-key').value.trim();
    if (!key) {
      showToast('Please enter your private key');
      return;
    }
    importedKey = key;
    pendingAction = 'import';
    showView('password');
  });

  document.getElementById('btn-set-password').addEventListener('click', async () => {
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('password-confirm').value;

    if (password.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }

    if (password !== confirm) {
      showToast('Passwords do not match');
      return;
    }

    try {
      if (pendingAction === 'create') {
        await VibeWallet.create(password);
        showToast('Wallet created successfully!');
      } else if (pendingAction === 'import') {
        await VibeWallet.importFromKey(importedKey, password);
        showToast('Wallet imported successfully!');
      }

      pendingAction = null;
      importedKey = null;
      document.getElementById('password').value = '';
      document.getElementById('password-confirm').value = '';

      await showMainView();
    } catch (error) {
      showToast(error.message);
    }
  });

  // ===== WALLET UNLOCK =====

  document.getElementById('btn-unlock').addEventListener('click', async () => {
    const password = document.getElementById('unlock-password').value;
    const errorEl = document.getElementById('unlock-error');

    try {
      await VibeWallet.unlock(password);
      errorEl.classList.add('hidden');
      document.getElementById('unlock-password').value = '';
      await showMainView();
    } catch (error) {
      errorEl.classList.remove('hidden');
      errorEl.textContent = error.message;
    }
  });

  document.getElementById('unlock-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-unlock').click();
    }
  });

  // ===== MAIN VIEW ACTIONS =====

  document.getElementById('btn-copy').addEventListener('click', async () => {
    const address = await VibeWallet.getAddress();
    await navigator.clipboard.writeText(address);
    showToast('Address copied!');
  });

  document.getElementById('btn-send').addEventListener('click', async () => {
    await updateBalanceDisplay();
    showView('send');
  });

  document.getElementById('btn-receive').addEventListener('click', async () => {
    const address = await VibeWallet.getAddress();
    document.getElementById('receive-address').textContent = address;
    showView('receive');
  });

  document.getElementById('btn-faucet').addEventListener('click', () => {
    document.getElementById('faucet-status').textContent = '';
    document.getElementById('faucet-status').className = 'status-message';
    showView('faucet');
  });

  document.getElementById('btn-stake').addEventListener('click', () => {
    showToast('Staking coming soon!');
  });

  document.getElementById('btn-settings').addEventListener('click', async () => {
    const settings = await VibeWallet.getSettings();
    document.getElementById('node-url').value = settings.nodeUrl;
    showView('settings');
  });

  // ===== SEND VIEW =====

  document.getElementById('btn-back-send').addEventListener('click', async () => {
    await showMainView();
  });

  document.getElementById('btn-max').addEventListener('click', async () => {
    const address = await VibeWallet.getAddress();
    const balance = await VibeAPI.getBalance(address);
    const maxAmount = Math.max(0, balance - 0.001); // Subtract fee
    document.getElementById('send-amount').value = maxAmount.toFixed(4);
  });

  document.getElementById('btn-confirm-send').addEventListener('click', async () => {
    const to = document.getElementById('send-to').value.trim();
    const amount = parseFloat(document.getElementById('send-amount').value);

    if (!to) {
      showToast('Please enter recipient address');
      return;
    }

    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount');
      return;
    }

    try {
      const tx = VibeWallet.createTransaction(to, amount);
      const result = await VibeAPI.sendTransaction(tx);

      showToast(result.message || 'Transaction sent!');

      document.getElementById('send-to').value = '';
      document.getElementById('send-amount').value = '';

      await showMainView();
    } catch (error) {
      showToast(error.message);
    }
  });

  // ===== RECEIVE VIEW =====

  document.getElementById('btn-back-receive').addEventListener('click', async () => {
    await showMainView();
  });

  document.getElementById('btn-copy-receive').addEventListener('click', async () => {
    const address = await VibeWallet.getAddress();
    await navigator.clipboard.writeText(address);
    showToast('Address copied!');
  });

  // ===== FAUCET VIEW =====

  document.getElementById('btn-back-faucet').addEventListener('click', async () => {
    await showMainView();
  });

  document.getElementById('btn-claim-faucet').addEventListener('click', async () => {
    const btn = document.getElementById('btn-claim-faucet');
    const status = document.getElementById('faucet-status');

    btn.disabled = true;
    btn.textContent = 'Claiming...';
    status.textContent = '';
    status.className = 'status-message';

    try {
      const address = await VibeWallet.getAddress();
      const result = await VibeAPI.claimFaucet(address);

      status.textContent = result.message || `Claimed ${result.amount} VIBE!`;
      status.classList.add('success');

      await updateBalanceDisplay();

      setTimeout(async () => {
        await showMainView();
      }, 2000);
    } catch (error) {
      status.textContent = error.message;
      status.classList.add('error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Claim Tokens';
    }
  });

  // ===== SETTINGS VIEW =====

  document.getElementById('btn-back-settings').addEventListener('click', async () => {
    // Save settings
    const nodeUrl = document.getElementById('node-url').value.trim();
    await VibeWallet.saveSettings({ nodeUrl, network: 'testnet' });
    VibeAPI.setBaseUrl(nodeUrl);

    await showMainView();
  });

  document.getElementById('btn-export-key').addEventListener('click', async () => {
    try {
      const privateKey = VibeWallet.getPrivateKey();
      await navigator.clipboard.writeText(privateKey);
      showToast('Private key copied - keep it safe!');
    } catch (error) {
      showToast(error.message);
    }
  });

  document.getElementById('btn-lock').addEventListener('click', () => {
    VibeWallet.lock();
    showView('unlock');
  });

  document.getElementById('btn-reset').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset your wallet? This will delete all data!')) {
      await VibeWallet.reset();
      showToast('Wallet reset');
      showView('welcome');
    }
  });

  // ===== START =====

  await init();
});
