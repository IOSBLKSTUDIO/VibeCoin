import { useState, useEffect, useCallback } from 'react';
import { api, WalletData, Balance, NodeInfo, Block, Transaction } from './api';
import { API_URL, TOKEN, FAUCET } from './config';
import './App.css';

type View = 'home' | 'wallet' | 'faucet' | 'send' | 'explorer' | 'whitepaper';

// Storage keys
const STORAGE_KEY = 'vibecoin_wallet';
const FAUCET_KEY = 'vibecoin_faucet_time';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [importKey, setImportKey] = useState('');
  const [faucetCooldown, setFaucetCooldown] = useState<number>(0);

  // Load wallet from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setWallet(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load wallet:', e);
      }
    }
  }, []);

  // Check faucet cooldown
  useEffect(() => {
    const checkCooldown = () => {
      const lastClaim = localStorage.getItem(FAUCET_KEY);
      if (lastClaim) {
        const elapsed = Date.now() - parseInt(lastClaim);
        const remaining = FAUCET.cooldownMinutes * 60 * 1000 - elapsed;
        setFaucetCooldown(remaining > 0 ? Math.ceil(remaining / 60000) : 0);
      }
    };
    checkCooldown();
    const interval = setInterval(checkCooldown, 60000);
    return () => clearInterval(interval);
  }, []);

  // Check if node is online
  const checkNode = useCallback(async () => {
    try {
      const online = await api.isOnline();
      setIsOnline(online);
      if (online) {
        const info = await api.getInfo();
        setNodeInfo(info);
      }
    } catch {
      setIsOnline(false);
    }
  }, []);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!wallet || !isOnline) return;
    try {
      const bal = await api.getBalance(wallet.publicKey);
      setBalance(bal);
    } catch (e) {
      console.error('Failed to get balance:', e);
    }
  }, [wallet, isOnline]);

  // Check node on mount
  useEffect(() => {
    checkNode();
    const interval = setInterval(checkNode, 30000);
    return () => clearInterval(interval);
  }, [checkNode]);

  // Refresh balance when wallet changes
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  // Save wallet to localStorage
  const saveWallet = (w: WalletData | null) => {
    if (w) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setWallet(w);
  };

  // Create new wallet
  const createWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const newWallet = await api.createWallet();
      saveWallet(newWallet);
      setSuccess('Wallet created! Save your private key securely.');
      setCurrentView('wallet');
    } catch (e: any) {
      setError(e.message || 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  // Import wallet
  const handleImportWallet = async () => {
    if (!importKey) return;
    setLoading(true);
    setError(null);
    try {
      const imported = await api.importWallet(importKey);
      saveWallet({ ...imported, privateKey: importKey });
      setSuccess('Wallet imported successfully!');
      setImportKey('');
      setCurrentView('wallet');
    } catch (e: any) {
      setError(e.message || 'Invalid private key');
    } finally {
      setLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    saveWallet(null);
    setBalance(null);
    setSuccess('Wallet disconnected');
    setCurrentView('home');
  };

  // Claim faucet
  const claimFaucet = async () => {
    if (!wallet || faucetCooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.claimFaucet(wallet.publicKey);
      if (result.success) {
        localStorage.setItem(FAUCET_KEY, Date.now().toString());
        setFaucetCooldown(FAUCET.cooldownMinutes);
        setSuccess(`Claimed ${FAUCET.amount} ${TOKEN.symbol}! Mining next block...`);
        // Mine a block to confirm the transaction
        await api.mine(wallet.publicKey);
        await refreshBalance();
        setSuccess(`${FAUCET.amount} ${TOKEN.symbol} added to your wallet!`);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to claim faucet');
    } finally {
      setLoading(false);
    }
  };

  // Send transaction
  const handleSend = async () => {
    if (!wallet?.privateKey || !sendTo || !sendAmount) return;
    setLoading(true);
    setError(null);
    try {
      const amount = parseFloat(sendAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount');
      }
      const result = await api.sendTransaction(
        wallet.privateKey,
        wallet.publicKey,
        sendTo,
        amount,
        'VibeCoin transfer'
      );
      if (result.success) {
        setSuccess(`Sent ${amount} ${TOKEN.symbol}!`);
        setSendTo('');
        setSendAmount('');
        await refreshBalance();
        setCurrentView('wallet');
      }
    } catch (e: any) {
      setError(e.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  // Load blocks for explorer
  const loadBlocks = async () => {
    try {
      const result = await api.getBlocks(20);
      setBlocks(result.blocks.reverse());
    } catch (e) {
      console.error('Failed to load blocks:', e);
    }
  };

  // Clear messages after delay
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Short address helper
  const shortAddr = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-8)}`;

  // ==================== RENDER FUNCTIONS ====================

  const renderHome = () => (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-gradient"></div>
          <div className="hero-grid"></div>
        </div>

        <div className="hero-content">
          <div className={`hero-badge ${isOnline ? 'online' : 'offline'}`}>
            <span className="badge-dot"></span>
            {isOnline ? 'Testnet Live' : 'Connecting...'}
          </div>

          <h1 className="hero-title">
            <span className="title-line">Code with Feeling.</span>
            <span className="title-line">Build with Passion.</span>
            <span className="title-line gradient-text">Create with Vibes.</span>
          </h1>

          <p className="hero-description">
            VibeCoin is the first cryptocurrency born from the <strong>VibeCoding</strong> movement.
            Join the testnet and start earning VIBE tokens today.
          </p>

          <div className="hero-actions">
            {!wallet ? (
              <button className="btn btn-primary btn-lg" onClick={createWallet} disabled={loading || !isOnline}>
                {loading ? 'Creating...' : 'Create Wallet'}
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={() => setCurrentView('wallet')}>
                Open Wallet
              </button>
            )}
            <button className="btn btn-secondary btn-lg" onClick={() => { setCurrentView('explorer'); loadBlocks(); }}>
              Explore Blockchain
            </button>
          </div>
        </div>

        <div className="hero-visual">
          <div className="coin-container">
            <div className="coin">
              <div className="coin-face coin-front">
                <span className="coin-symbol">V</span>
              </div>
              <div className="coin-face coin-back">
                <span className="coin-symbol">VIBE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Network Status */}
      <section className="status-section">
        <div className="container">
          <div className="status-card">
            <div className="status-header">
              <h2>Network Status</h2>
              <span className={`status-badge ${isOnline ? 'live' : 'offline'}`}>
                {isOnline ? 'Live' : 'Offline'}
              </span>
            </div>

            <div className="status-grid">
              <div className="status-item">
                <div className="status-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>
                  </svg>
                </div>
                <div className="status-info">
                  <span className="status-label">Blocks</span>
                  <span className="status-value">{nodeInfo?.blocks || '--'}</span>
                </div>
              </div>

              <div className="status-item">
                <div className="status-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <div className="status-info">
                  <span className="status-label">Circulating</span>
                  <span className="status-value">{nodeInfo?.circulatingSupply?.toFixed(0) || '--'}</span>
                </div>
              </div>

              <div className="status-item">
                <div className="status-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M9 12l2 2 4-4"/>
                  </svg>
                </div>
                <div className="status-info">
                  <span className="status-label">Transactions</span>
                  <span className="status-value">{nodeInfo?.transactions || '--'}</span>
                </div>
              </div>

              <div className="status-item">
                <div className="status-icon pov">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <div className="status-info">
                  <span className="status-label">Consensus</span>
                  <span className="status-value gradient-text">Proof of Vibe</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="actions-section">
        <div className="container">
          <div className="section-header">
            <h2>Quick Actions</h2>
            <p>Get started with VibeCoin testnet</p>
          </div>

          <div className="actions-grid">
            <div className="action-card" onClick={() => wallet ? setCurrentView('wallet') : createWallet()}>
              <div className="action-icon">
                <span>👛</span>
              </div>
              <h3>{wallet ? 'My Wallet' : 'Create Wallet'}</h3>
              <p>{wallet ? `Balance: ${balance?.balance?.toFixed(4) || '0'} VIBE` : 'Generate a new wallet'}</p>
            </div>

            <div className="action-card" onClick={() => setCurrentView('faucet')}>
              <div className="action-icon">
                <span>🚿</span>
              </div>
              <h3>Faucet</h3>
              <p>{faucetCooldown > 0 ? `Cooldown: ${faucetCooldown}min` : `Get ${FAUCET.amount} free VIBE`}</p>
            </div>

            <div className="action-card" onClick={() => setCurrentView('send')}>
              <div className="action-icon">
                <span>📤</span>
              </div>
              <h3>Send VIBE</h3>
              <p>Transfer to another address</p>
            </div>

            <div className="action-card" onClick={() => { setCurrentView('explorer'); loadBlocks(); }}>
              <div className="action-icon">
                <span>🔍</span>
              </div>
              <h3>Explorer</h3>
              <p>View blocks & transactions</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );

  const renderWallet = () => (
    <section className="page-section">
      <div className="container">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          ← Back
        </button>

        <h1>👛 My Wallet</h1>

        {!wallet ? (
          <div className="wallet-create-card">
            <div className="create-section">
              <h3>Create New Wallet</h3>
              <p>Generate a new secure wallet</p>
              <button className="btn btn-primary btn-lg" onClick={createWallet} disabled={loading || !isOnline}>
                {loading ? 'Creating...' : 'Create Wallet'}
              </button>
            </div>

            <div className="divider">or</div>

            <div className="import-section">
              <h3>Import Wallet</h3>
              <p>Enter your private key</p>
              <input
                type="password"
                placeholder="Private key..."
                value={importKey}
                onChange={(e) => setImportKey(e.target.value)}
                className="input-field"
              />
              <button className="btn btn-secondary" onClick={handleImportWallet} disabled={loading || !importKey}>
                Import
              </button>
            </div>
          </div>
        ) : (
          <div className="wallet-card">
            <div className="balance-display">
              <span className="balance-amount">{balance?.balance?.toFixed(4) || '0.0000'}</span>
              <span className="balance-currency">{TOKEN.symbol}</span>
            </div>

            <div className="wallet-details">
              <div className="detail-row">
                <span className="detail-label">Address</span>
                <div className="detail-value">
                  <code>{shortAddr(wallet.publicKey)}</code>
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText(wallet.publicKey)}>
                    Copy
                  </button>
                </div>
              </div>

              {wallet.privateKey && (
                <div className="detail-row">
                  <span className="detail-label">Private Key</span>
                  <div className="detail-value">
                    <code className="blur-text">{shortAddr(wallet.privateKey)}</code>
                    <button className="copy-btn" onClick={() => navigator.clipboard.writeText(wallet.privateKey!)}>
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="wallet-actions">
              <button className="btn btn-primary" onClick={() => setCurrentView('faucet')}>
                Get VIBE
              </button>
              <button className="btn btn-secondary" onClick={() => setCurrentView('send')}>
                Send
              </button>
              <button className="btn btn-danger" onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  const renderFaucet = () => (
    <section className="page-section">
      <div className="container">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          ← Back
        </button>

        <div className="faucet-card">
          <div className="faucet-icon">🚿</div>
          <h1>Testnet Faucet</h1>
          <p>Get free {TOKEN.symbol} tokens for testing</p>

          <div className="faucet-amount">
            <span className="amount">{FAUCET.amount}</span>
            <span className="currency">{TOKEN.symbol}</span>
          </div>

          {!wallet ? (
            <>
              <p className="faucet-note">Create a wallet first to claim tokens</p>
              <button className="btn btn-primary btn-lg" onClick={createWallet} disabled={loading}>
                Create Wallet
              </button>
            </>
          ) : faucetCooldown > 0 ? (
            <>
              <p className="faucet-note">Next claim available in {faucetCooldown} minutes</p>
              <button className="btn btn-secondary btn-lg" disabled>
                Cooldown Active
              </button>
            </>
          ) : (
            <>
              <p className="faucet-note">Your address: {shortAddr(wallet.publicKey)}</p>
              <button className="btn btn-primary btn-lg" onClick={claimFaucet} disabled={loading || !isOnline}>
                {loading ? 'Claiming...' : `Claim ${FAUCET.amount} ${TOKEN.symbol}`}
              </button>
            </>
          )}

          <p className="faucet-disclaimer">
            Testnet tokens have no real value
          </p>
        </div>
      </div>
    </section>
  );

  const renderSend = () => (
    <section className="page-section">
      <div className="container">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          ← Back
        </button>

        <h1>📤 Send {TOKEN.symbol}</h1>

        {!wallet ? (
          <div className="send-card">
            <p>Create a wallet first to send tokens</p>
            <button className="btn btn-primary btn-lg" onClick={createWallet}>
              Create Wallet
            </button>
          </div>
        ) : (
          <div className="send-card">
            <div className="balance-banner">
              Available: <strong>{balance?.available?.toFixed(4) || '0'} {TOKEN.symbol}</strong>
            </div>

            <div className="form-group">
              <label>Recipient Address</label>
              <input
                type="text"
                placeholder="Enter recipient address..."
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label>Amount ({TOKEN.symbol})</label>
              <input
                type="number"
                placeholder="0.00"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="input-field"
                min="0"
                step="0.0001"
              />
            </div>

            <button
              className="btn btn-primary btn-lg"
              onClick={handleSend}
              disabled={loading || !sendTo || !sendAmount || !isOnline}
            >
              {loading ? 'Sending...' : 'Send Transaction'}
            </button>
          </div>
        )}
      </div>
    </section>
  );

  const renderExplorer = () => (
    <section className="page-section">
      <div className="container">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          ← Back
        </button>

        <h1>🔍 Blockchain Explorer</h1>

        <div className="explorer-stats">
          <div className="stat-card">
            <span className="stat-value">{nodeInfo?.blocks || 0}</span>
            <span className="stat-label">Blocks</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{nodeInfo?.transactions || 0}</span>
            <span className="stat-label">Transactions</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{nodeInfo?.circulatingSupply?.toFixed(0) || 0}</span>
            <span className="stat-label">Circulating</span>
          </div>
        </div>

        <h2>Recent Blocks</h2>
        <div className="blocks-list">
          {blocks.length === 0 ? (
            <p className="empty-state">No blocks yet or node is offline</p>
          ) : (
            blocks.map((block) => (
              <div key={block.index} className="block-item">
                <div className="block-header">
                  <span className="block-number">Block #{block.index}</span>
                  <span className="block-time">
                    {new Date(block.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="block-details">
                  <div className="detail">
                    <span className="label">Hash</span>
                    <code>{block.hash.substring(0, 16)}...</code>
                  </div>
                  <div className="detail">
                    <span className="label">Transactions</span>
                    <span>{block.transactions.length}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <button className="btn btn-secondary" onClick={loadBlocks} style={{ marginTop: '1rem' }}>
          Refresh
        </button>
      </div>
    </section>
  );

  return (
    <div className="app">
      {/* Toast Messages */}
      {(error || success) && (
        <div className={`toast ${error ? 'error' : 'success'}`}>
          {error || success}
        </div>
      )}

      <header className="header">
        <div className="container header-content">
          <div className="logo" onClick={() => setCurrentView('home')}>
            <div className="logo-icon">
              <span>⚡</span>
            </div>
            <span className="logo-text">VibeCoin</span>
          </div>

          <nav className="nav">
            <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
            <span className="nav-status">{isOnline ? 'Connected' : 'Offline'}</span>
            {wallet && (
              <span className="nav-balance">{balance?.balance?.toFixed(2) || '0'} VIBE</span>
            )}
          </nav>
        </div>
      </header>

      <main className="main">
        {currentView === 'home' && renderHome()}
        {currentView === 'wallet' && renderWallet()}
        {currentView === 'faucet' && renderFaucet()}
        {currentView === 'send' && renderSend()}
        {currentView === 'explorer' && renderExplorer()}
      </main>

      <footer className="footer">
        <div className="container footer-content">
          <div className="footer-logo">
            <span>⚡</span>
            <span>VibeCoin</span>
          </div>
          <p className="footer-tagline">Code with feeling. Build with passion. Create with vibes.</p>
          <div className="footer-links">
            <span>API: {API_URL}</span>
            <span className="divider">•</span>
            <a href="https://github.com/IOSBLKSTUDIO/VibeCoin" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
