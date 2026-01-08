import { useState, useEffect, useCallback } from 'react';
import { Blockchain, Wallet, Block } from './lib/blockchain';
import { ActionCard } from './components/ActionCard';
import { ValidatorCard } from './components/ValidatorCard';
import './App.css';

// Storage keys
const STORAGE_KEYS = {
  WALLET: 'vibecoin_wallet',
  BLOCKCHAIN: 'vibecoin_blockchain',
  VALIDATORS: 'vibecoin_validators',
  VOTED: 'vibecoin_voted',
  FAUCET_LAST_CLAIM: 'vibecoin_faucet_last',
  LOGS: 'vibecoin_logs'
};

// Simulated Proof of Vibe data
interface Validator {
  address: string;
  name: string;
  stake: number;
  votes: number;
  vibeScore: number;
  isActive: boolean;
  blocksProduced: number;
  contributionScore: number;
}

type View = 'home' | 'wallet' | 'validator' | 'vote' | 'explorer' | 'faucet' | 'send';

// Empty validators list - real testnet starts clean
const DEFAULT_VALIDATORS: Validator[] = [];

function App() {
  // Initialize blockchain with localStorage data
  const [blockchain] = useState<Blockchain>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.BLOCKCHAIN);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const bc = new Blockchain();
        // Restore chain from stored data
        if (data.chain && data.chain.length > 1) {
          bc.chain = data.chain.map((blockData: ReturnType<Block['toJSON']>) => Block.fromJSON(blockData));
        }
        return bc;
      } catch (e) {
        console.warn('Failed to restore blockchain:', e);
      }
    }
    return new Blockchain();
  });

  // Initialize wallet from localStorage
  const [wallet, setWallet] = useState<Wallet | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.WALLET);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        return new Wallet(data.privateKey);
      } catch (e) {
        console.warn('Failed to restore wallet:', e);
      }
    }
    return null;
  });

  const [currentView, setCurrentView] = useState<View>('home');

  // Initialize logs from localStorage
  const [logs, setLogs] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return ['Welcome back to VibeCoin!'];
      }
    }
    return ['Welcome to VibeCoin Testnet!', 'Create a wallet and claim free VIBE from the faucet to get started.'];
  });

  const [, forceUpdate] = useState({});

  // Form states
  const [validatorName, setValidatorName] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [faucetCooldown, setFaucetCooldown] = useState<string | null>(null);

  // Initialize validators from localStorage
  const [validators, setValidators] = useState<Validator[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.VALIDATORS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_VALIDATORS;
      }
    }
    return DEFAULT_VALIDATORS;
  });

  // Initialize voted validators from localStorage
  const [votedValidators, setVotedValidators] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.VOTED);
    if (stored) {
      try {
        return new Set(JSON.parse(stored));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  // Save blockchain to localStorage whenever it changes
  const saveBlockchain = useCallback(() => {
    const data = {
      chain: blockchain.chain.map(b => b.toJSON()),
      difficulty: blockchain.difficulty,
      miningReward: blockchain.miningReward
    };
    localStorage.setItem(STORAGE_KEYS.BLOCKCHAIN, JSON.stringify(data));
  }, [blockchain]);

  // Save wallet to localStorage
  const saveWallet = useCallback((w: Wallet | null) => {
    if (w) {
      localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify({
        privateKey: w.privateKey,
        publicKey: w.publicKey
      }));
    } else {
      localStorage.removeItem(STORAGE_KEYS.WALLET);
    }
  }, []);

  // Save validators to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VALIDATORS, JSON.stringify(validators));
  }, [validators]);

  // Save voted validators to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VOTED, JSON.stringify([...votedValidators]));
  }, [votedValidators]);

  // Save logs to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.slice(-50)));
  }, [logs]);

  // Check faucet cooldown on mount
  useEffect(() => {
    checkFaucetCooldown();
    const interval = setInterval(checkFaucetCooldown, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const checkFaucetCooldown = () => {
    const lastClaim = localStorage.getItem(STORAGE_KEYS.FAUCET_LAST_CLAIM);
    if (lastClaim) {
      const lastTime = parseInt(lastClaim, 10);
      const now = Date.now();
      const cooldown = 60 * 60 * 1000; // 1 hour for demo (would be 24h in production)
      const remaining = cooldown - (now - lastTime);

      if (remaining > 0) {
        const minutes = Math.ceil(remaining / 60000);
        setFaucetCooldown(`${minutes} min`);
      } else {
        setFaucetCooldown(null);
      }
    } else {
      setFaucetCooldown(null);
    }
  };

  const refresh = () => {
    forceUpdate({});
    saveBlockchain();
  };

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), `[${timestamp}] ${msg}`]);
  };

  // ==================== WALLET ACTIONS ====================

  const createWallet = () => {
    const newWallet = new Wallet();
    setWallet(newWallet);
    saveWallet(newWallet);
    addLog(`Wallet created: ${newWallet.getShortAddress()}`);
    addLog(`Your wallet is saved locally. Use the faucet to get free VIBE!`);
    setCurrentView('home');
  };

  const importWallet = (privateKey: string) => {
    try {
      const importedWallet = new Wallet(privateKey);
      setWallet(importedWallet);
      saveWallet(importedWallet);
      const balance = importedWallet.getBalance(blockchain);
      addLog(`Wallet imported: ${importedWallet.getShortAddress()}`);
      addLog(`Balance: ${balance.toFixed(4)} VIBE`);
      setCurrentView('home');
    } catch {
      addLog(`Error: Invalid private key`);
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    saveWallet(null);
    addLog('Wallet disconnected');
    setCurrentView('home');
  };

  // ==================== VALIDATOR ACTIONS ====================

  const registerValidator = () => {
    if (!wallet) {
      addLog('Please create a wallet first!');
      return;
    }

    if (!validatorName || validatorName.length < 3) {
      addLog('Validator name must be at least 3 characters');
      return;
    }

    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake < 100) {
      addLog('Minimum stake is 100 VIBE');
      return;
    }

    const balance = wallet.getBalance(blockchain);
    if (balance < stake) {
      addLog(`Insufficient balance. You have ${balance.toFixed(4)} VIBE`);
      return;
    }

    const newValidator: Validator = {
      address: wallet.publicKey,
      name: validatorName,
      stake: stake,
      votes: 0,
      vibeScore: stake * 0.4 / 100,
      isActive: false,
      blocksProduced: 0,
      contributionScore: 0
    };

    setValidators(prev => [...prev, newValidator]);
    addLog(`Congratulations! You are now a validator candidate!`);
    addLog(`Name: ${validatorName} | Stake: ${stake} VIBE`);
    setValidatorName('');
    setStakeAmount('');
    setCurrentView('home');
  };

  // ==================== VOTING ACTIONS ====================

  const voteForValidator = (validatorAddress: string) => {
    if (!wallet) {
      addLog('Please create a wallet first!');
      return;
    }

    if (votedValidators.has(validatorAddress)) {
      addLog('You have already voted for this validator');
      return;
    }

    const validator = validators.find(v => v.address === validatorAddress);
    if (!validator) return;

    const balance = wallet.getBalance(blockchain);
    const votePower = Math.min(balance || 100, 10000);

    setValidators(prev => prev.map(v => {
      if (v.address === validatorAddress) {
        const newVotes = v.votes + votePower;
        const newVibeScore = (v.stake * 0.4 + newVotes * 0.3 + v.contributionScore * 0.3) / 100;
        return { ...v, votes: newVotes, vibeScore: newVibeScore };
      }
      return v;
    }));

    setVotedValidators(prev => new Set([...prev, validatorAddress]));
    addLog(`Voted for ${validator.name}! Vote power: ${votePower.toFixed(0)} VIBE`);
  };

  // ==================== TRANSACTION ACTIONS ====================

  const sendVibe = () => {
    if (!wallet) {
      addLog('Please create a wallet first!');
      return;
    }

    if (!sendRecipient || !sendAmount) {
      addLog('Please enter recipient and amount');
      return;
    }

    const amount = parseFloat(sendAmount);
    const balance = wallet.getBalance(blockchain);

    if (balance < amount + 0.001) {
      addLog(`Insufficient balance. You have ${balance.toFixed(4)} VIBE`);
      return;
    }

    const success = wallet.send(blockchain, sendRecipient, amount, 'VibeCoin transfer');

    if (success) {
      // Mine the transaction immediately for demo
      blockchain.minePendingTransactions(sendRecipient);
      saveBlockchain();

      addLog(`Sent ${amount} VIBE to ${sendRecipient.substring(0, 12)}...`);
      setSendRecipient('');
      setSendAmount('');
      setCurrentView('home');
      refresh();
    } else {
      addLog(`Transaction failed: insufficient balance or invalid address`);
    }
  };

  // ==================== FAUCET ====================

  const claimFaucet = () => {
    if (!wallet) {
      addLog('Please create a wallet first!');
      return;
    }

    // Check cooldown
    const lastClaim = localStorage.getItem(STORAGE_KEYS.FAUCET_LAST_CLAIM);
    if (lastClaim) {
      const lastTime = parseInt(lastClaim, 10);
      const now = Date.now();
      const cooldown = 60 * 60 * 1000; // 1 hour cooldown for demo
      if (now - lastTime < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastTime)) / 60000);
        addLog(`Faucet cooldown: please wait ${remaining} minutes`);
        return;
      }
    }

    // Mine a block to give tokens
    blockchain.minePendingTransactions(wallet.publicKey);
    saveBlockchain();

    // Record claim time
    localStorage.setItem(STORAGE_KEYS.FAUCET_LAST_CLAIM, Date.now().toString());
    checkFaucetCooldown();

    const newBalance = wallet.getBalance(blockchain);
    addLog(`Faucet claimed! +${blockchain.miningReward} VIBE`);
    addLog(`New balance: ${newBalance.toFixed(4)} VIBE`);
    setCurrentView('home');
    refresh();
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderHome = () => (
    <div className="home-view">
      <div className="greeting">
        <h2>What would you like to do?</h2>
        <p className="subtitle">Your data is saved locally in your browser</p>
      </div>

      <div className="action-grid">
        {!wallet ? (
          <ActionCard
            icon="👛"
            title="Create My Wallet"
            description="Generate a new VibeCoin wallet instantly"
            onClick={() => setCurrentView('wallet')}
            highlight
          />
        ) : (
          <ActionCard
            icon="💰"
            title="My Wallet"
            description={`Balance: ${wallet.getBalance(blockchain).toFixed(4)} VIBE`}
            onClick={() => setCurrentView('wallet')}
          />
        )}

        <ActionCard
          icon="🔐"
          title="Become a Validator"
          description="Stake VIBE and secure the network"
          onClick={() => setCurrentView('validator')}
          disabled={!wallet}
        />

        <ActionCard
          icon="🗳️"
          title="Vote for Validators"
          description="Support your favorite validators"
          onClick={() => setCurrentView('vote')}
        />

        <ActionCard
          icon="📊"
          title="Explore Blockchain"
          description="View blocks, transactions, and stats"
          onClick={() => setCurrentView('explorer')}
        />

        <ActionCard
          icon="🚿"
          title="Testnet Faucet"
          description={faucetCooldown ? `Cooldown: ${faucetCooldown}` : "Get free VIBE for testing"}
          onClick={() => setCurrentView('faucet')}
          highlight={!faucetCooldown && !!wallet}
        />

        <ActionCard
          icon="📤"
          title="Send VIBE"
          description="Transfer VIBE to another address"
          onClick={() => setCurrentView('send')}
          disabled={!wallet}
        />
      </div>

      <div className="network-stats">
        <h3>Network Status</h3>
        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-value">{blockchain.chain.length}</span>
            <span className="stat-label">Blocks</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{validators.filter(v => v.isActive).length}</span>
            <span className="stat-label">Active Validators</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{validators.reduce((sum, v) => sum + v.stake, 0).toLocaleString()}</span>
            <span className="stat-label">Total Staked</span>
          </div>
          <div className="stat-box consensus">
            <span className="stat-value">PoV</span>
            <span className="stat-label">Consensus</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWalletView = () => (
    <div className="view-container">
      <button className="back-btn" onClick={() => setCurrentView('home')}>← Back</button>

      <h2>👛 Your Wallet</h2>

      {!wallet ? (
        <div className="wallet-create">
          <div className="create-option">
            <h3>Create New Wallet</h3>
            <p>Generate a new secure wallet with a fresh key pair</p>
            <button className="btn primary large" onClick={createWallet}>
              Generate New Wallet
            </button>
          </div>

          <div className="divider">or</div>

          <div className="import-option">
            <h3>Import Existing Wallet</h3>
            <p>Enter your private key to restore your wallet</p>
            <input
              type="password"
              placeholder="Enter your private key"
              className="input-field"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  importWallet((e.target as HTMLInputElement).value);
                }
              }}
            />
            <button
              className="btn secondary"
              onClick={(e) => {
                const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                if (input?.value) importWallet(input.value);
              }}
            >
              Import Wallet
            </button>
          </div>
        </div>
      ) : (
        <div className="wallet-info">
          <div className="balance-display">
            <span className="balance-amount">{wallet.getBalance(blockchain).toFixed(4)}</span>
            <span className="balance-currency">VIBE</span>
          </div>

          <div className="wallet-details">
            <div className="detail-item">
              <label>Address</label>
              <div className="address-field">
                <code>{wallet.publicKey.substring(0, 20)}...{wallet.publicKey.substring(wallet.publicKey.length - 20)}</code>
                <button
                  className="copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(wallet.publicKey);
                    addLog('Address copied to clipboard!');
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="detail-item">
              <label>Private Key (click to reveal)</label>
              <div className="address-field">
                <code
                  className="private-key-hidden"
                  onClick={(e) => {
                    const el = e.target as HTMLElement;
                    if (el.classList.contains('private-key-hidden')) {
                      el.textContent = wallet.privateKey;
                      el.classList.remove('private-key-hidden');
                    } else {
                      el.textContent = '••••••••••••••••••••••••••••••••';
                      el.classList.add('private-key-hidden');
                    }
                  }}
                >••••••••••••••••••••••••••••••••</code>
                <button
                  className="copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(wallet.privateKey);
                    addLog('Private key copied - keep it safe!');
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          <div className="wallet-actions">
            <button className="btn primary" onClick={() => setCurrentView('send')}>
              Send VIBE
            </button>
            <button className="btn secondary" onClick={() => setCurrentView('faucet')}>
              Get Free VIBE
            </button>
            <button className="btn danger" onClick={disconnectWallet}>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderValidatorView = () => (
    <div className="view-container">
      <button className="back-btn" onClick={() => setCurrentView('home')}>← Back</button>

      <h2>🔐 Become a Validator</h2>
      <p className="view-description">
        Stake your VIBE to become a validator and earn rewards by securing the network.
        Top 21 validators by VibeScore are selected each epoch.
      </p>

      <div className="form-container">
        <div className="form-group">
          <label>Validator Name</label>
          <input
            type="text"
            placeholder="e.g., MyVibeNode"
            value={validatorName}
            onChange={(e) => setValidatorName(e.target.value)}
            className="input-field"
            maxLength={32}
          />
          <span className="hint">3-32 characters, must be unique</span>
        </div>

        <div className="form-group">
          <label>Stake Amount (VIBE)</label>
          <input
            type="number"
            placeholder="Minimum 100 VIBE"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            className="input-field"
            min="100"
          />
          <span className="hint">
            Your balance: {wallet?.getBalance(blockchain).toFixed(4) || 0} VIBE
          </span>
        </div>

        <div className="info-box">
          <h4>VibeScore Formula</h4>
          <p>Your ranking is determined by:</p>
          <ul>
            <li><strong>40%</strong> - Your staked VIBE</li>
            <li><strong>30%</strong> - Community votes received</li>
            <li><strong>30%</strong> - Contribution score (code, community help)</li>
          </ul>
        </div>

        <button
          className="btn primary large"
          onClick={registerValidator}
          disabled={!wallet || !validatorName || !stakeAmount}
        >
          Register as Validator
        </button>
      </div>
    </div>
  );

  const renderVoteView = () => (
    <div className="view-container">
      <button className="back-btn" onClick={() => setCurrentView('home')}>← Back</button>

      <h2>🗳️ Vote for Validators</h2>
      <p className="view-description">
        Support validators you trust. Your vote power is based on your VIBE balance (max 10,000).
        {wallet && ` Your vote power: ${Math.min(wallet.getBalance(blockchain), 10000).toFixed(0)} VIBE`}
      </p>

      <div className="validators-list">
        {validators.length === 0 ? (
          <div className="empty-state">
            <p>No validators yet on the testnet.</p>
            <p>Be the first to register as a validator!</p>
            <button className="btn primary" onClick={() => setCurrentView('validator')}>
              Become a Validator
            </button>
          </div>
        ) : (
          validators
            .sort((a, b) => b.vibeScore - a.vibeScore)
            .map((validator, index) => (
              <ValidatorCard
                key={validator.address}
                rank={index + 1}
                name={validator.name}
                address={validator.address}
                stake={validator.stake}
                votes={validator.votes}
                vibeScore={validator.vibeScore}
                isActive={index < 21}
                blocksProduced={validator.blocksProduced}
                onVote={() => voteForValidator(validator.address)}
                hasVoted={votedValidators.has(validator.address)}
              />
            ))
        )}
      </div>
    </div>
  );

  const renderExplorerView = () => {
    const stats = blockchain.getStats();
    return (
      <div className="view-container">
        <button className="back-btn" onClick={() => setCurrentView('home')}>← Back</button>

        <h2>📊 Blockchain Explorer</h2>

        <div className="explorer-stats">
          <div className="stat-card">
            <span className="stat-icon">📦</span>
            <span className="stat-value">{stats.blocks}</span>
            <span className="stat-label">Total Blocks</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💎</span>
            <span className="stat-value">{stats.circulatingSupply.toFixed(2)}</span>
            <span className="stat-label">Circulating Supply</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⏳</span>
            <span className="stat-value">{stats.pendingTransactions}</span>
            <span className="stat-label">Pending TX</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <span className="stat-value">{stats.isValid ? 'Valid' : 'Invalid'}</span>
            <span className="stat-label">Chain Status</span>
          </div>
        </div>

        <h3>Recent Blocks</h3>
        <div className="blocks-list">
          {[...blockchain.chain].reverse().slice(0, 10).map((block) => (
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
                  <code>{block.hash.substring(0, 24)}...</code>
                </div>
                <div className="detail">
                  <span className="label">Transactions</span>
                  <span>{block.transactions.length}</span>
                </div>
                <div className="detail">
                  <span className="label">Consensus</span>
                  <span className="consensus-badge">PoV</span>
                </div>
              </div>
              {block.transactions.length > 0 && (
                <div className="block-transactions">
                  {block.transactions.map((tx, i) => (
                    <div key={i} className="tx-item">
                      <span className="tx-from">
                        {tx.from === 'MINING_REWARD' ? '⛏️ Faucet' :
                         tx.from === 'GENESIS' ? '🌟 Genesis' :
                         tx.from.substring(0, 8) + '...'}
                      </span>
                      <span className="tx-arrow">→</span>
                      <span className="tx-to">{tx.to.substring(0, 8)}...</span>
                      <span className="tx-amount">{tx.amount} VIBE</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFaucetView = () => (
    <div className="view-container">
      <button className="back-btn" onClick={() => setCurrentView('home')}>← Back</button>

      <h2>🚿 Testnet Faucet</h2>
      <p className="view-description">
        Get free VIBE tokens for testing. Claim {blockchain.miningReward} VIBE every hour!
      </p>

      <div className="faucet-container">
        <div className="faucet-icon">💧</div>

        {wallet ? (
          <>
            <div className="faucet-address">
              <label>Your Address</label>
              <code>{wallet.getShortAddress()}</code>
            </div>

            <div className="faucet-amount">
              <span className="amount">{blockchain.miningReward}</span>
              <span className="currency">VIBE</span>
            </div>

            {faucetCooldown ? (
              <div className="faucet-cooldown">
                <p>Next claim available in: <strong>{faucetCooldown}</strong></p>
                <button className="btn secondary large" disabled>
                  Cooldown Active
                </button>
              </div>
            ) : (
              <button className="btn primary large" onClick={claimFaucet}>
                Claim {blockchain.miningReward} VIBE
              </button>
            )}

            <p className="current-balance">
              Current balance: <strong>{wallet.getBalance(blockchain).toFixed(4)} VIBE</strong>
            </p>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>Create a wallet first</label>
              <p>You need a wallet to receive VIBE tokens</p>
            </div>
            <button className="btn primary large" onClick={() => setCurrentView('wallet')}>
              Create Wallet
            </button>
          </>
        )}

        <div className="faucet-info">
          <p>Testnet VIBE has no real value and is for testing purposes only.</p>
        </div>
      </div>
    </div>
  );

  const renderSendView = () => (
    <div className="view-container">
      <button className="back-btn" onClick={() => setCurrentView('home')}>← Back</button>

      <h2>📤 Send VIBE</h2>
      <p className="view-description">
        Transfer VIBE to another address. Transaction fee: 0.001 VIBE
      </p>

      <div className="form-container">
        <div className="balance-banner">
          Available: <strong>{wallet?.getBalance(blockchain).toFixed(4) || 0} VIBE</strong>
        </div>

        <div className="form-group">
          <label>Recipient Address</label>
          <input
            type="text"
            placeholder="Enter recipient's address"
            value={sendRecipient}
            onChange={(e) => setSendRecipient(e.target.value)}
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label>Amount (VIBE)</label>
          <input
            type="number"
            placeholder="0.00"
            value={sendAmount}
            onChange={(e) => setSendAmount(e.target.value)}
            className="input-field"
            min="0"
            step="0.001"
          />
        </div>

        <div className="fee-info">
          <span>Network Fee</span>
          <span>0.001 VIBE</span>
        </div>

        <button
          className="btn primary large"
          onClick={sendVibe}
          disabled={!sendRecipient || !sendAmount}
        >
          Send Transaction
        </button>
      </div>
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'wallet': return renderWalletView();
      case 'validator': return renderValidatorView();
      case 'vote': return renderVoteView();
      case 'explorer': return renderExplorerView();
      case 'faucet': return renderFaucetView();
      case 'send': return renderSendView();
      default: return renderHome();
    }
  };

  return (
    <div className="app vibecoding">
      <header className="header">
        <div className="logo" onClick={() => setCurrentView('home')}>
          <span className="logo-icon">⚡</span>
          <span className="logo-text">VibeCoin</span>
        </div>
        <div className="header-info">
          <span className="consensus-tag">Proof of Vibe</span>
          <span className="network-tag">Testnet</span>
        </div>
      </header>

      <main className="main-content">
        {renderCurrentView()}
      </main>

      <aside className="activity-log">
        <h4>Activity Log</h4>
        <div className="log-entries">
          {logs.slice(-15).map((log, i) => (
            <div key={i} className="log-entry">{log}</div>
          ))}
        </div>
      </aside>

      <footer className="footer">
        <p>
          VibeCoin — Code with Vibes |
          <a href="https://github.com/IOSBLKSTUDIO/VibeCoin" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
