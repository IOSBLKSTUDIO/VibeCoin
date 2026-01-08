import { useState } from 'react';
import { Blockchain, Wallet } from './lib/blockchain';
import './App.css';

function App() {
  const [blockchain] = useState(() => new Blockchain());
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<number>(0);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [mining, setMining] = useState(false);
  const [miningProgress, setMiningProgress] = useState({ nonce: 0, hash: '' });
  const [logs, setLogs] = useState<string[]>(['Welcome to VibeCoin Demo!']);
  const [, forceUpdate] = useState({});

  const refresh = () => forceUpdate({});

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const createWallet = () => {
    const wallet = new Wallet();
    setWallets(prev => [...prev, wallet]);
    addLog(`New wallet created: ${wallet.getShortAddress()}`);
    refresh();
  };

  const mine = async () => {
    if (wallets.length === 0) {
      addLog('Create a wallet first!');
      return;
    }

    setMining(true);
    addLog(`Mining block ${blockchain.chain.length}...`);

    setTimeout(() => {
      const miner = wallets[selectedWallet];
      const block = blockchain.minePendingTransactions(
        miner.publicKey,
        (nonce, hash) => setMiningProgress({ nonce, hash })
      );

      addLog(`Block ${block.index} mined! Hash: ${block.hash.substring(0, 16)}...`);
      addLog(`Reward: ${blockchain.miningReward} VIBE to ${miner.getShortAddress()}`);
      setMining(false);
      refresh();
    }, 100);
  };

  const sendTransaction = () => {
    if (wallets.length === 0) {
      addLog('Create a wallet first!');
      return;
    }

    if (!recipient || !amount) {
      addLog('Enter recipient and amount!');
      return;
    }

    const sender = wallets[selectedWallet];
    const amountNum = parseFloat(amount);

    if (sender.getBalance(blockchain) < amountNum + 0.001) {
      addLog('Insufficient balance!');
      return;
    }

    const success = sender.send(blockchain, recipient, amountNum, 'VibeCoin transfer');

    if (success) {
      addLog(`Transaction sent: ${amountNum} VIBE to ${recipient.substring(0, 8)}...`);
      setRecipient('');
      setAmount('');
    } else {
      addLog('Transaction failed!');
    }
    refresh();
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    addLog('Address copied to clipboard!');
  };

  const stats = blockchain.getStats();

  return (
    <div className="app">
      <header className="header">
        <h1>VibeCoin</h1>
        <p>The Cryptocurrency Born from VibeCoding</p>
      </header>

      <div className="container">
        <section className="card stats">
          <h2>Blockchain Stats</h2>
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-value">{stats.blocks}</span>
              <span className="stat-label">Blocks</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.circulatingSupply.toFixed(2)}</span>
              <span className="stat-label">Supply (VIBE)</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.difficulty}</span>
              <span className="stat-label">Difficulty</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.pendingTransactions}</span>
              <span className="stat-label">Pending TX</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.isValid ? '✓' : '✗'}</span>
              <span className="stat-label">Chain Valid</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.miningReward}</span>
              <span className="stat-label">Block Reward</span>
            </div>
          </div>
        </section>

        <div className="two-columns">
          <section className="card">
            <h2>Wallets</h2>
            <button className="btn primary" onClick={createWallet}>
              + Create New Wallet
            </button>

            <div className="wallet-list">
              {wallets.map((wallet, index) => (
                <div
                  key={index}
                  className={`wallet-item ${selectedWallet === index ? 'selected' : ''}`}
                  onClick={() => setSelectedWallet(index)}
                >
                  <div className="wallet-header">
                    <span className="wallet-name">Wallet {index + 1}</span>
                    <span className="wallet-balance">
                      {wallet.getBalance(blockchain).toFixed(4)} VIBE
                    </span>
                  </div>
                  <div className="wallet-address" onClick={(e) => { e.stopPropagation(); copyAddress(wallet.publicKey); }}>
                    {wallet.getShortAddress()}
                    <span className="copy-hint">Click to copy</span>
                  </div>
                </div>
              ))}
              {wallets.length === 0 && (
                <p className="empty">No wallets yet. Create one to start!</p>
              )}
            </div>
          </section>

          <section className="card">
            <h2>Actions</h2>

            <div className="action-group">
              <h3>Mine Block</h3>
              <button
                className="btn success"
                onClick={mine}
                disabled={mining || wallets.length === 0}
              >
                {mining ? `Mining... (Nonce: ${miningProgress.nonce})` : '⛏️ Mine Block'}
              </button>
              {mining && (
                <div className="mining-progress">
                  <code>{miningProgress.hash.substring(0, 32)}...</code>
                </div>
              )}
            </div>

            <div className="action-group">
              <h3>Send VIBE</h3>
              <input
                type="text"
                placeholder="Recipient address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
              <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.001"
                min="0"
              />
              <button
                className="btn primary"
                onClick={sendTransaction}
                disabled={wallets.length === 0}
              >
                Send Transaction
              </button>
            </div>

            {wallets.length >= 2 && (
              <div className="quick-send">
                <p>Quick send to:</p>
                {wallets.map((w, i) => i !== selectedWallet && (
                  <button
                    key={i}
                    className="btn small"
                    onClick={() => setRecipient(w.publicKey)}
                  >
                    Wallet {i + 1}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="card">
          <h2>Blockchain Explorer</h2>
          <div className="blockchain-viz">
            {blockchain.chain.map((block, index) => (
              <div key={index} className="block-card">
                <div className="block-header">
                  <span className="block-index">Block #{block.index}</span>
                  <span className="block-time">
                    {new Date(block.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="block-hash">
                  <strong>Hash:</strong> {block.hash.substring(0, 20)}...
                </div>
                <div className="block-prev">
                  <strong>Prev:</strong> {block.previousHash.substring(0, 20)}...
                </div>
                <div className="block-info">
                  <span>Nonce: {block.nonce}</span>
                  <span>TX: {block.transactions.length}</span>
                </div>
                <div className="block-transactions">
                  {block.transactions.map((tx, txIndex) => (
                    <div key={txIndex} className="tx-mini">
                      <span className="tx-from">
                        {tx.from === 'MINING_REWARD' ? 'Reward' :
                         tx.from === 'GENESIS' ? 'Genesis' :
                         tx.from.substring(0, 6) + '...'}
                      </span>
                      <span className="tx-arrow">→</span>
                      <span className="tx-to">{tx.to.substring(0, 6)}...</span>
                      <span className="tx-amount">{tx.amount} VIBE</span>
                    </div>
                  ))}
                </div>
                {index < blockchain.chain.length - 1 && (
                  <div className="chain-link">🔗</div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="card logs">
          <h2>Activity Log</h2>
          <div className="log-container">
            {logs.map((log, i) => (
              <div key={i} className="log-entry">{log}</div>
            ))}
          </div>
        </section>
      </div>

      <footer className="footer">
        <p>VibeCoin Demo - Built with vibes by <a href="https://github.com/IOSBLKSTUDIO">BLKSTUDIO</a></p>
        <p><a href="https://github.com/IOSBLKSTUDIO/VibeCoin">View on GitHub</a></p>
      </footer>
    </div>
  );
}

export default App;
