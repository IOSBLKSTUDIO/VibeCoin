import { useState } from 'react';
import { Blockchain, Wallet } from './lib/blockchain';
import { ActionCard } from './components/ActionCard';
import { ValidatorCard } from './components/ValidatorCard';
import './App.css';

// Simulated Proof of Vibe data (would connect to real API in production)
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

function App() {
  const [blockchain] = useState(() => new Blockchain());
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [currentView, setCurrentView] = useState<View>('home');
  const [logs, setLogs] = useState<string[]>(['Welcome to VibeCoin!', 'What would you like to do today?']);
  const [, forceUpdate] = useState({});

  // Form states
  const [validatorName, setValidatorName] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [faucetAddress, setFaucetAddress] = useState('');

  // Simulated validators
  const [validators, setValidators] = useState<Validator[]>([
    {
      address: '04abc123def456789...',
      name: 'VibeNode_Genesis',
      stake: 10000,
      votes: 5000,
      vibeScore: 95.5,
      isActive: true,
      blocksProduced: 1247,
      contributionScore: 85
    },
    {
      address: '04def789abc123456...',
      name: 'CryptoVibe_EU',
      stake: 7500,
      votes: 3200,
      vibeScore: 82.3,
      isActive: true,
      blocksProduced: 893,
      contributionScore: 72
    },
    {
      address: '04ghi321jkl654987...',
      name: 'VibeMaster_Asia',
      stake: 5000,
      votes: 2800,
      vibeScore: 76.8,
      isActive: true,
      blocksProduced: 654,
      contributionScore: 68
    }
  ]);

  const [votedValidators, setVotedValidators] = useState<Set<string>>(new Set());

  const refresh = () => forceUpdate({});

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-20), `${msg}`]);
  };

  // ==================== WALLET ACTIONS ====================

  const createWallet = () => {
    const newWallet = new Wallet();
    setWallet(newWallet);
    addLog(`Wallet created: ${newWallet.getShortAddress()}`);
    addLog(`Your private key has been generated securely.`);
    addLog(`Balance: 0 VIBE - Use the faucet to get free testnet VIBE!`);
    setCurrentView('home');
  };

  const importWallet = (privateKey: string) => {
    try {
      const importedWallet = new Wallet(privateKey);
      setWallet(importedWallet);
      addLog(`Wallet imported: ${importedWallet.getShortAddress()}`);
      setCurrentView('home');
    } catch {
      addLog(`Error: Invalid private key`);
    }
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
    addLog(`Name: ${validatorName}`);
    addLog(`Stake: ${stake} VIBE`);
    addLog(`Gather votes from the community to become an active validator.`);
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

    // Simulate vote
    const votePower = Math.min(wallet.getBalance(blockchain) || 100, 1000);

    setValidators(prev => prev.map(v => {
      if (v.address === validatorAddress) {
        const newVotes = v.votes + votePower;
        const newVibeScore = (v.stake * 0.4 + newVotes * 0.3 + v.contributionScore * 0.3) / 100;
        return { ...v, votes: newVotes, vibeScore: newVibeScore };
      }
      return v;
    }));

    setVotedValidators(prev => new Set([...prev, validatorAddress]));
    addLog(`You voted for ${validator.name}!`);
    addLog(`Vote power: ${votePower} VIBE`);
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
      addLog(`Transaction sent!`);
      addLog(`Amount: ${amount} VIBE`);
      addLog(`To: ${sendRecipient.substring(0, 16)}...`);
      addLog(`Fee: 0.001 VIBE`);
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
    const address = faucetAddress || wallet?.publicKey;
    if (!address) {
      addLog('Please enter an address or create a wallet');
      return;
    }

    // Mine a block to simulate faucet (gives mining reward)
    if (wallet) {
      blockchain.minePendingTransactions(wallet.publicKey);
      addLog(`Faucet claimed! +${blockchain.miningReward} VIBE`);
      addLog(`New balance: ${wallet.getBalance(blockchain).toFixed(4)} VIBE`);
      setFaucetAddress('');
      setCurrentView('home');
      refresh();
    } else {
      addLog('Create a wallet first to receive VIBE');
    }
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderHome = () => (
    <div className="home-view">
      <div className="greeting">
        <h2>What would you like to do?</h2>
        <p className="subtitle">Choose an action below or tell us what you need</p>
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
          description="Get free VIBE for testing"
          onClick={() => setCurrentView('faucet')}
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
              <label>Private Key</label>
              <div className="address-field">
                <code>••••••••••••••••••••••••••••••••</code>
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
        You can vote for up to 10 validators.
      </p>

      <div className="validators-list">
        {validators
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
          ))}
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
                  <span className="consensus-badge">{(block as { consensusType?: string }).consensusType || 'PoW'}</span>
                </div>
              </div>
              {block.transactions.length > 0 && (
                <div className="block-transactions">
                  {block.transactions.map((tx, i) => (
                    <div key={i} className="tx-item">
                      <span className="tx-from">
                        {tx.from === 'MINING_REWARD' ? '⛏️ Mining' :
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
        Get free VIBE tokens for testing on the testnet.
        {wallet ? ' Click below to claim your tokens!' : ' Create a wallet first to receive tokens.'}
      </p>

      <div className="faucet-container">
        <div className="faucet-icon">💧</div>

        {wallet ? (
          <>
            <div className="faucet-address">
              <label>Your Address</label>
              <code>{wallet.getShortAddress()}</code>
            </div>
            <button className="btn primary large" onClick={claimFaucet}>
              Claim {blockchain.miningReward} VIBE
            </button>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>Enter Address</label>
              <input
                type="text"
                placeholder="Your VibeCoin address"
                value={faucetAddress}
                onChange={(e) => setFaucetAddress(e.target.value)}
                className="input-field"
              />
            </div>
            <button className="btn secondary" onClick={() => setCurrentView('wallet')}>
              Create Wallet First
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
        <h4>Activity</h4>
        <div className="log-entries">
          {logs.map((log, i) => (
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
