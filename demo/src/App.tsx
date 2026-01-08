import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import type { NodeInfo, Block } from './api';
import { API_URL, TOKEN, REFRESH_INTERVAL } from './config';
import './App.css';

type View = 'explorer' | 'wallet' | 'whitepaper';

// Storage key for wallet
const WALLET_STORAGE_KEY = 'vibecoin_wallet';

interface StoredWallet {
  address: string;
  publicKey: string;
  privateKey: string;
}

function App() {
  const [currentView, setCurrentView] = useState<View>('explorer');
  const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

  // Wallet state
  const [wallet, setWallet] = useState<StoredWallet | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [walletLoading, setWalletLoading] = useState<boolean>(false);
  const [faucetMessage, setFaucetMessage] = useState<string>('');

  // Load wallet from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY);
    if (stored) {
      try {
        setWallet(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load wallet:', e);
      }
    }
  }, []);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      const [info, blocksData] = await Promise.all([
        api.getInfo(),
        api.getBlocks(20, 0)
      ]);

      setNodeInfo(info);
      setBlocks(blocksData.blocks.reverse()); // Latest first
      setIsOnline(true);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setIsOnline(false);
      setLoading(false);
    }
  }, []);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    if (!wallet) return;
    try {
      const balanceData = await api.getBalance(wallet.publicKey);
      setBalance(balanceData.balance);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }, [wallet]);

  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch balance when wallet changes
  useEffect(() => {
    if (wallet) {
      fetchBalance();
      const interval = setInterval(fetchBalance, REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [wallet, fetchBalance]);

  // Create new wallet
  const createWallet = async () => {
    setWalletLoading(true);
    try {
      const newWallet = await api.createWallet();
      const walletData: StoredWallet = {
        address: newWallet.address,
        publicKey: newWallet.publicKey,
        privateKey: newWallet.privateKey || ''
      };
      setWallet(walletData);
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(walletData));
      setFaucetMessage('');
    } catch (error) {
      console.error('Failed to create wallet:', error);
    }
    setWalletLoading(false);
  };

  // Claim faucet
  const claimFaucet = async () => {
    if (!wallet) return;
    setWalletLoading(true);
    try {
      const result = await api.claimFaucet(wallet.publicKey);
      setFaucetMessage(result.message);
      // Refresh balance after a delay (wait for mining)
      setTimeout(fetchBalance, 2000);
    } catch (error: any) {
      setFaucetMessage(error.message || 'Failed to claim faucet');
    }
    setWalletLoading(false);
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format hash for display
  const shortHash = (hash: string) => {
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  };

  // Format address
  const shortAddress = (addr: string) => {
    if (!addr || addr === 'coinbase') return 'COINBASE';
    return `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}`;
  };

  const renderExplorer = () => (
    <div className="explorer">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blocks-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18"/>
              <path d="M3 15h18"/>
              <path d="M9 3v18"/>
              <path d="M15 3v18"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{nodeInfo?.blocks || 0}</span>
            <span className="stat-label">Blocks</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon supply-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v12"/>
              <path d="M15 9.5c-.5-1-1.5-1.5-3-1.5s-2.5.5-3 1.5c-.5 1 0 2 1.5 2.5s3 1 3 2.5c0 1-1 2-2.5 2s-2.5-.5-3-1.5"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{nodeInfo?.circulatingSupply?.toFixed(0) || 0}</span>
            <span className="stat-label">VIBE Minted</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon tx-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{nodeInfo?.pendingTransactions || 0}</span>
            <span className="stat-label">Pending TX</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon difficulty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{nodeInfo?.difficulty || 0}</span>
            <span className="stat-label">Difficulty</span>
          </div>
        </div>
      </div>

      {/* Blocks List */}
      <div className="blocks-section">
        <div className="section-header">
          <h2>Recent Blocks</h2>
          <span className="live-badge">
            <span className="live-dot"></span>
            Live
          </span>
        </div>

        <div className="blocks-list">
          {blocks.map((block) => (
            <div
              key={block.index}
              className={`block-card ${selectedBlock?.index === block.index ? 'selected' : ''}`}
              onClick={() => setSelectedBlock(selectedBlock?.index === block.index ? null : block)}
            >
              <div className="block-header">
                <div className="block-number">
                  <span className="block-label">Block</span>
                  <span className="block-index">#{block.index}</span>
                </div>
                <div className="block-time">{formatTime(block.timestamp)}</div>
              </div>

              <div className="block-details">
                <div className="block-hash">
                  <span className="hash-label">Hash</span>
                  <code className="hash-value">{shortHash(block.hash)}</code>
                </div>
                <div className="block-meta">
                  <span className="meta-item">
                    <strong>{block.transactions.length}</strong> tx
                  </span>
                  <span className="meta-item">
                    nonce: <strong>{block.nonce.toLocaleString()}</strong>
                  </span>
                </div>
              </div>

              {/* Expanded block details */}
              {selectedBlock?.index === block.index && (
                <div className="block-expanded">
                  <div className="expanded-row">
                    <span className="expanded-label">Full Hash</span>
                    <code className="expanded-value">{block.hash}</code>
                  </div>
                  <div className="expanded-row">
                    <span className="expanded-label">Previous Hash</span>
                    <code className="expanded-value">{block.previousHash}</code>
                  </div>

                  {block.transactions.length > 0 && (
                    <div className="block-transactions">
                      <h4>Transactions</h4>
                      {block.transactions.map((tx) => (
                        <div key={tx.id} className="tx-item">
                          <div className="tx-parties">
                            <span className="tx-from">{shortAddress(tx.from)}</span>
                            <span className="tx-arrow">→</span>
                            <span className="tx-to">{shortAddress(tx.to)}</span>
                          </div>
                          <span className="tx-amount">{tx.amount} VIBE</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderWallet = () => (
    <div className="wallet-page">
      {!wallet ? (
        <div className="wallet-create">
          <div className="wallet-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M22 10H18a2 2 0 0 0 0 4h4"/>
              <circle cx="18" cy="12" r="1"/>
            </svg>
          </div>
          <h2>Create Your Wallet</h2>
          <p>Get started with VibeCoin by creating a new testnet wallet.</p>
          <button
            className="btn btn-primary btn-lg"
            onClick={createWallet}
            disabled={walletLoading || !isOnline}
          >
            {walletLoading ? 'Creating...' : 'Create Wallet'}
          </button>
          {!isOnline && (
            <p className="offline-warning">Node is offline. Please wait...</p>
          )}
        </div>
      ) : (
        <div className="wallet-dashboard">
          <div className="wallet-balance-card">
            <span className="balance-label">Your Balance</span>
            <div className="balance-amount">
              <span className="balance-value">{balance.toFixed(2)}</span>
              <span className="balance-symbol">VIBE</span>
            </div>
          </div>

          <div className="wallet-address-card">
            <span className="address-label">Your Address</span>
            <code className="address-value">{wallet.publicKey}</code>
            <button
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(wallet.publicKey);
              }}
            >
              Copy
            </button>
          </div>

          <div className="wallet-actions">
            <div className="faucet-card">
              <h3>Testnet Faucet</h3>
              <p>Get free testnet VIBE to try the network.</p>
              <button
                className="btn btn-secondary"
                onClick={claimFaucet}
                disabled={walletLoading || !isOnline}
              >
                {walletLoading ? 'Claiming...' : 'Claim 100 VIBE'}
              </button>
              {faucetMessage && (
                <p className="faucet-message">{faucetMessage}</p>
              )}
            </div>
          </div>

          <button
            className="btn btn-danger btn-sm"
            onClick={() => {
              if (confirm('Are you sure? This will delete your wallet.')) {
                localStorage.removeItem(WALLET_STORAGE_KEY);
                setWallet(null);
                setBalance(0);
              }
            }}
          >
            Delete Wallet
          </button>
        </div>
      )}
    </div>
  );

  const renderWhitepaper = () => (
    <section className="page-section">
      <div className="container">
        <article className="whitepaper-content">
          <h1>VibeCoin Whitepaper</h1>
          <p className="subtitle">The Cryptocurrency Born from VibeCoding</p>

          <section className="wp-section">
            <h2>Abstract</h2>
            <p>
              VibeCoin (VIBE) represents a paradigm shift in cryptocurrency design,
              embedding the philosophy of VibeCoding into its core architecture.
              Unlike traditional cryptocurrencies that prioritize computational power
              or capital accumulation, VibeCoin introduces "Proof of Vibe" (PoV) —
              a novel consensus mechanism that rewards creativity, community contribution,
              and sustainable development practices.
            </p>
          </section>

          <section className="wp-section">
            <h2>The VibeCoding Philosophy</h2>
            <p>
              VibeCoding emerged as a counter-movement to the industrialization of software development.
              It advocates for:
            </p>
            <ul>
              <li><strong>Flow Over Force:</strong> Writing code when inspiration strikes</li>
              <li><strong>Intuition-Driven Development:</strong> Trusting developer instincts</li>
              <li><strong>Creative Expression:</strong> Every line of code as art</li>
              <li><strong>Community Harmony:</strong> Building together, growing together</li>
            </ul>
          </section>

          <section className="wp-section">
            <h2>Proof of Vibe (PoV)</h2>
            <p>
              Our consensus mechanism combines elements of Proof of Stake (PoS),
              Delegated Proof of Stake (DPoS), and a novel reputation system:
            </p>
            <div className="formula-box">
              <strong>VibeScore = (Stake × 0.4) + (Votes × 0.3) + (Contribution × 0.3)</strong>
            </div>
            <p>
              Validators are selected based on their VibeScore, ensuring that
              those who contribute most to the ecosystem have the greatest influence.
            </p>
          </section>

          <section className="wp-section">
            <h2>Technical Specifications</h2>
            <table className="specs-table">
              <tbody>
                <tr><td>Symbol</td><td>{TOKEN.symbol}</td></tr>
                <tr><td>Total Supply</td><td>{TOKEN.maxSupply.toLocaleString()}</td></tr>
                <tr><td>Block Time</td><td>~10 seconds</td></tr>
                <tr><td>Consensus</td><td>Proof of Vibe (PoV)</td></tr>
                <tr><td>Max Validators</td><td>21</td></tr>
                <tr><td>Minimum Stake</td><td>100 VIBE</td></tr>
                <tr><td>Decimals</td><td>{TOKEN.decimals}</td></tr>
              </tbody>
            </table>
          </section>

          <section className="wp-section">
            <h2>Conclusion</h2>
            <p>
              VibeCoin is more than a cryptocurrency — it's a movement. By aligning
              economic incentives with creative contribution and community building,
              we create a sustainable ecosystem where developers, artists, and
              educators can thrive.
            </p>
            <p className="quote">
              "Code with feeling. Build with passion. Create with vibes."
            </p>
          </section>
        </article>
      </div>
    </section>
  );

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Connecting to VibeCoin Testnet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="container header-content">
          <div className="logo" onClick={() => setCurrentView('explorer')}>
            <div className="logo-icon">
              <span>⚡</span>
            </div>
            <span className="logo-text">VibeCoin</span>
            <span className="network-badge">Testnet</span>
          </div>

          <nav className="nav">
            <button
              className={`nav-link ${currentView === 'explorer' ? 'active' : ''}`}
              onClick={() => setCurrentView('explorer')}
            >
              Explorer
            </button>
            <button
              className={`nav-link ${currentView === 'wallet' ? 'active' : ''}`}
              onClick={() => setCurrentView('wallet')}
            >
              Wallet
            </button>
            <button
              className={`nav-link ${currentView === 'whitepaper' ? 'active' : ''}`}
              onClick={() => setCurrentView('whitepaper')}
            >
              Whitepaper
            </button>
            <a
              href="https://github.com/IOSBLKSTUDIO/VibeCoin"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
            >
              GitHub
            </a>
          </nav>

          <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            <span className="status-text">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {currentView === 'explorer' && renderExplorer()}
          {currentView === 'wallet' && renderWallet()}
          {currentView === 'whitepaper' && renderWhitepaper()}
        </div>
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
            <span className="divider">•</span>
            <span>Built by BLKSTUDIO</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
