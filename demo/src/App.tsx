import { useState } from 'react';
import './App.css';

type View = 'home' | 'whitepaper' | 'roadmap' | 'wallet-preview';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  const renderHome = () => (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-gradient"></div>
          <div className="hero-grid"></div>
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            Testnet Coming Soon
          </div>

          <h1 className="hero-title">
            <span className="title-line">Code with Feeling.</span>
            <span className="title-line">Build with Passion.</span>
            <span className="title-line gradient-text">Create with Vibes.</span>
          </h1>

          <p className="hero-description">
            VibeCoin is the first cryptocurrency born from the <strong>VibeCoding</strong> movement.
            A revolutionary digital asset where creativity, community, and code converge.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => setCurrentView('whitepaper')}>
              <span>Read Whitepaper</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <a href="https://github.com/IOSBLKSTUDIO/VibeCoin" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span>View on GitHub</span>
            </a>
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

      {/* Testnet Status Section */}
      <section className="status-section">
        <div className="container">
          <div className="status-card">
            <div className="status-header">
              <h2>Testnet Status</h2>
              <span className="status-badge preparing">Preparing Launch</span>
            </div>

            <div className="status-grid">
              <div className="status-item">
                <div className="status-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18"/>
                  </svg>
                </div>
                <div className="status-info">
                  <span className="status-label">Blocks</span>
                  <span className="status-value coming-soon">--</span>
                </div>
              </div>

              <div className="status-item">
                <div className="status-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div className="status-info">
                  <span className="status-label">Validators</span>
                  <span className="status-value coming-soon">--</span>
                </div>
              </div>

              <div className="status-item">
                <div className="status-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <div className="status-info">
                  <span className="status-label">Total Staked</span>
                  <span className="status-value coming-soon">--</span>
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

            <p className="status-note">
              The VibeCoin testnet is currently in development. Join the waitlist to be notified when we launch.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>Built Different</h2>
            <p>VibeCoin reimagines what a cryptocurrency can be</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <span>🎯</span>
              </div>
              <h3>Proof of Vibe</h3>
              <p>
                Our unique consensus mechanism rewards creators, not just capital.
                Stake, vote, and contribute to earn.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span>🗳️</span>
              </div>
              <h3>Democratic Governance</h3>
              <p>
                Community-driven validator selection. Your voice matters.
                Vote for validators you trust.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span>⚡</span>
              </div>
              <h3>Fast & Efficient</h3>
              <p>
                10-second block times. Low fees. No energy-intensive mining.
                Built for the future.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span>🌱</span>
              </div>
              <h3>Sustainable</h3>
              <p>
                Eco-friendly by design. No proof-of-work mining means minimal
                environmental impact.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span>🔓</span>
              </div>
              <h3>Open Source</h3>
              <p>
                Fully transparent. Review the code, contribute, and help shape
                the future of VibeCoin.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span>🎨</span>
              </div>
              <h3>Creator Economy</h3>
              <p>
                Reward developers, artists, and educators.
                Contribution is valued and incentivized.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tokenomics Section */}
      <section className="tokenomics-section">
        <div className="container">
          <div className="section-header">
            <h2>Tokenomics</h2>
            <p>Designed for sustainability and fair distribution</p>
          </div>

          <div className="tokenomics-grid">
            <div className="token-stat">
              <span className="token-value">VIBE</span>
              <span className="token-label">Symbol</span>
            </div>
            <div className="token-stat">
              <span className="token-value">21M</span>
              <span className="token-label">Max Supply</span>
            </div>
            <div className="token-stat">
              <span className="token-value">~10s</span>
              <span className="token-label">Block Time</span>
            </div>
            <div className="token-stat">
              <span className="token-value">8</span>
              <span className="token-label">Decimals</span>
            </div>
          </div>

          <div className="distribution-card">
            <h3>Initial Distribution</h3>
            <div className="distribution-bars">
              <div className="distribution-item">
                <div className="distribution-header">
                  <span>Community Rewards</span>
                  <span>60%</span>
                </div>
                <div className="distribution-bar">
                  <div className="distribution-fill" style={{width: '60%'}}></div>
                </div>
              </div>
              <div className="distribution-item">
                <div className="distribution-header">
                  <span>Development Fund</span>
                  <span>15%</span>
                </div>
                <div className="distribution-bar">
                  <div className="distribution-fill" style={{width: '15%'}}></div>
                </div>
              </div>
              <div className="distribution-item">
                <div className="distribution-header">
                  <span>Team & Founders</span>
                  <span>15%</span>
                </div>
                <div className="distribution-bar">
                  <div className="distribution-fill" style={{width: '15%'}}></div>
                </div>
              </div>
              <div className="distribution-item">
                <div className="distribution-header">
                  <span>Reserve</span>
                  <span>10%</span>
                </div>
                <div className="distribution-bar">
                  <div className="distribution-fill" style={{width: '10%'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Preview */}
      <section className="roadmap-section">
        <div className="container">
          <div className="section-header">
            <h2>Roadmap</h2>
            <p>Our journey to revolutionize crypto</p>
          </div>

          <div className="roadmap-timeline">
            <div className="roadmap-item active">
              <div className="roadmap-marker"></div>
              <div className="roadmap-content">
                <span className="roadmap-phase">Phase 1</span>
                <h4>Foundation</h4>
                <p>Core blockchain development, wallet implementation, testnet preparation</p>
                <span className="roadmap-status">In Progress</span>
              </div>
            </div>

            <div className="roadmap-item">
              <div className="roadmap-marker"></div>
              <div className="roadmap-content">
                <span className="roadmap-phase">Phase 2</span>
                <h4>Growth</h4>
                <p>Testnet launch, smart contracts, web & mobile wallets</p>
                <span className="roadmap-status upcoming">Upcoming</span>
              </div>
            </div>

            <div className="roadmap-item">
              <div className="roadmap-marker"></div>
              <div className="roadmap-content">
                <span className="roadmap-phase">Phase 3</span>
                <h4>Ecosystem</h4>
                <p>DAO governance, creator rewards program, partnerships</p>
                <span className="roadmap-status upcoming">Upcoming</span>
              </div>
            </div>

            <div className="roadmap-item">
              <div className="roadmap-marker"></div>
              <div className="roadmap-content">
                <span className="roadmap-phase">Phase 4</span>
                <h4>Mainstream</h4>
                <p>Mainnet launch, exchange listings, NFT marketplace</p>
                <span className="roadmap-status upcoming">Upcoming</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <h2>Be Part of the Vibe</h2>
            <p>Join the waitlist to get notified when the testnet launches and receive early access.</p>

            {subscribed ? (
              <div className="subscribed-message">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>You're on the list! We'll notify you when we launch.</span>
              </div>
            ) : (
              <form className="subscribe-form" onSubmit={handleSubscribe}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary">
                  Join Waitlist
                </button>
              </form>
            )}

            <div className="social-links">
              <a href="https://github.com/IOSBLKSTUDIO/VibeCoin" target="_blank" rel="noopener noreferrer" className="social-link">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );

  const renderWhitepaper = () => (
    <section className="page-section">
      <div className="container">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Home
        </button>

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
                <tr><td>Symbol</td><td>VIBE</td></tr>
                <tr><td>Total Supply</td><td>21,000,000</td></tr>
                <tr><td>Block Time</td><td>~10 seconds</td></tr>
                <tr><td>Consensus</td><td>Proof of Vibe (PoV)</td></tr>
                <tr><td>Max Validators</td><td>21</td></tr>
                <tr><td>Minimum Stake</td><td>100 VIBE</td></tr>
                <tr><td>Decimals</td><td>8</td></tr>
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

  return (
    <div className="app">
      <header className="header">
        <div className="container header-content">
          <div className="logo" onClick={() => setCurrentView('home')}>
            <div className="logo-icon">
              <span>⚡</span>
            </div>
            <span className="logo-text">VibeCoin</span>
          </div>

          <nav className="nav">
            <button className="nav-link" onClick={() => setCurrentView('whitepaper')}>Whitepaper</button>
            <a href="https://github.com/IOSBLKSTUDIO/VibeCoin" target="_blank" rel="noopener noreferrer" className="nav-link">GitHub</a>
            <span className="nav-badge">Testnet Soon</span>
          </nav>
        </div>
      </header>

      <main className="main">
        {currentView === 'home' && renderHome()}
        {currentView === 'whitepaper' && renderWhitepaper()}
      </main>

      <footer className="footer">
        <div className="container footer-content">
          <div className="footer-logo">
            <span>⚡</span>
            <span>VibeCoin</span>
          </div>
          <p className="footer-tagline">Code with feeling. Build with passion. Create with vibes.</p>
          <div className="footer-links">
            <a href="https://github.com/IOSBLKSTUDIO/VibeCoin" target="_blank" rel="noopener noreferrer">GitHub</a>
            <span className="divider">•</span>
            <span>MIT License</span>
            <span className="divider">•</span>
            <span>Built by BLKSTUDIO</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
