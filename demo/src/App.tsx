import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';
import type { NodeInfo, Block } from './api';
import { API_URL, TOKEN, REFRESH_INTERVAL } from './config';
import './App.css';

type View = 'chat' | 'explorer' | 'wallet' | 'whitepaper';

// Storage keys
const WALLET_STORAGE_KEY = 'vibecoin_wallet';
const CHAT_HISTORY_KEY = 'vibecoin_chat_history';
const LANGUAGE_KEY = 'vibecoin_language';

type Language = 'en' | 'fr';

// Translations
const translations = {
  en: {
    welcome: `Welcome to VibeCoin! I'm your VibeChat assistant.

You can talk to me naturally, for example:
• "Create a wallet for me"
• "Give me some VIBE" or "I need tokens"
• "What's my balance?"
• "Send 50 VIBE to 04abc..."
• "Show me the latest blocks"

What would you like to do?`,
    walletExists: (address: string, balance: number) => `You already have a wallet! Your address is:\n\n\`${address}...\`\n\nBalance: ${balance.toFixed(2)} VIBE`,
    walletCreated: (publicKey: string) => `Wallet created successfully!\n\nYour address:\n\`${publicKey}\`\n\nNow you can ask me for some free testnet VIBE!`,
    walletCreateFailed: `Failed to create wallet. The network might be offline.`,
    noWallet: `You don't have a wallet yet! Say "create a wallet" first.`,
    faucetSuccess: (message: string, remaining: number, nextIn: number) => `${message}\n\n📦 ${remaining} claims remaining today\n⏱️ Next claim available in ${nextIn} minutes`,
    faucetCooldown: (error: string) => `⏱️ ${error}`,
    balance: (balance: number, address: string) => `Your balance: **${balance.toFixed(2)} VIBE**\n\nAddress: \`${address}...\``,
    sendAmountMissing: `Please specify an amount. Example: "Send 50 VIBE to 04abc..."`,
    sendAddressMissing: `Please provide a valid address. Example: "Send 50 VIBE to 04abc..."`,
    sendInsufficientBalance: (balance: number, amount: number) => `Insufficient balance! You have ${balance.toFixed(2)} VIBE but tried to send ${amount} VIBE.`,
    sendAmountZero: `Amount must be greater than 0.`,
    sendSuccess: (amount: number, address: string) => `Transaction sent!\n\n💸 Amount: ${amount} VIBE\n📬 To: \`${address}...\`\n\nTransaction will be confirmed in ~10 seconds.`,
    sendFailed: (error: string) => `Transaction failed: ${error}`,
    blockchainStatus: (blocks: number, supply: number, pending: number) => `📦 **Blockchain Status**\n\n• Blocks: ${blocks}\n• Supply: ${supply} VIBE\n• Pending TX: ${pending}\n\n**Latest Blocks:**\n`,
    networkOffline: `Network is offline. Try again later.`,
    yourAddress: (publicKey: string) => `Your VibeCoin address:\n\n\`${publicKey}\`\n\nShare this address to receive VIBE!`,
    networkStatus: (online: boolean, blocks: number, supply: number, difficulty: number, pending: number) => `🌐 **Network Status**\n\n• Status: ${online ? '🟢 Online' : '🔴 Offline'}\n• Blocks: ${blocks}\n• Supply: ${supply} VIBE\n• Difficulty: ${difficulty}\n• Pending TX: ${pending}`,
    help: `Here's what I can do:\n\n**Wallet:**\n• "Create a wallet"\n• "What's my address?"\n• "What's my balance?"\n\n**Tokens:**\n• "Give me some VIBE"\n• "Send 50 VIBE to 04abc..."\n\n**Explorer:**\n• "Show me the latest blocks"\n• "What's the network status?"\n\nJust talk naturally - I'll understand!`,
    chatCleared: `Chat cleared! How can I help you?`,
    noWalletToDelete: `You don't have a wallet to delete.`,
    walletDeleted: `Wallet deleted. Your funds are lost forever (it's testnet, don't worry!). Say "create a wallet" to start fresh.`,
    greeting: (hasWallet: boolean, balance: number) => `Hey there! Welcome to VibeCoin. ${hasWallet ? `Your balance is ${balance.toFixed(2)} VIBE.` : `Say "create a wallet" to get started!`}`,
    notUnderstood: `I didn't quite understand that. Try saying:\n• "Create a wallet"\n• "Give me some VIBE"\n• "What's my balance?"\n• "Show me the blocks"\n\nOr just say "help" for more options!`,
    error: `Something went wrong. Please try again.`,
    placeholder: `Type a message... (e.g., 'give me some VIBE')`,
    langChanged: `Language changed to English! How can I help you?`
  },
  fr: {
    welcome: `Bienvenue sur VibeCoin ! Je suis votre assistant VibeChat.

Vous pouvez me parler naturellement, par exemple :
• "Crée-moi un wallet"
• "Donne-moi des VIBE" ou "J'ai besoin de tokens"
• "Quel est mon solde ?"
• "Envoie 50 VIBE à 04abc..."
• "Montre-moi les derniers blocs"

Que souhaitez-vous faire ?`,
    walletExists: (address: string, balance: number) => `Vous avez déjà un wallet ! Votre adresse est :\n\n\`${address}...\`\n\nSolde : ${balance.toFixed(2)} VIBE`,
    walletCreated: (publicKey: string) => `Wallet créé avec succès !\n\nVotre adresse :\n\`${publicKey}\`\n\nMaintenant vous pouvez me demander des VIBE gratuits pour le testnet !`,
    walletCreateFailed: `Échec de la création du wallet. Le réseau est peut-être hors ligne.`,
    noWallet: `Vous n'avez pas encore de wallet ! Dites "crée un wallet" d'abord.`,
    faucetSuccess: (message: string, remaining: number, nextIn: number) => `${message}\n\n📦 ${remaining} demandes restantes aujourd'hui\n⏱️ Prochaine demande disponible dans ${nextIn} minutes`,
    faucetCooldown: (error: string) => `⏱️ ${error}`,
    balance: (balance: number, address: string) => `Votre solde : **${balance.toFixed(2)} VIBE**\n\nAdresse : \`${address}...\``,
    sendAmountMissing: `Veuillez préciser un montant. Exemple : "Envoie 50 VIBE à 04abc..."`,
    sendAddressMissing: `Veuillez fournir une adresse valide. Exemple : "Envoie 50 VIBE à 04abc..."`,
    sendInsufficientBalance: (balance: number, amount: number) => `Solde insuffisant ! Vous avez ${balance.toFixed(2)} VIBE mais avez essayé d'envoyer ${amount} VIBE.`,
    sendAmountZero: `Le montant doit être supérieur à 0.`,
    sendSuccess: (amount: number, address: string) => `Transaction envoyée !\n\n💸 Montant : ${amount} VIBE\n📬 À : \`${address}...\`\n\nLa transaction sera confirmée dans ~10 secondes.`,
    sendFailed: (error: string) => `Transaction échouée : ${error}`,
    blockchainStatus: (blocks: number, supply: number, pending: number) => `📦 **État de la Blockchain**\n\n• Blocs : ${blocks}\n• Supply : ${supply} VIBE\n• TX en attente : ${pending}\n\n**Derniers Blocs :**\n`,
    networkOffline: `Le réseau est hors ligne. Réessayez plus tard.`,
    yourAddress: (publicKey: string) => `Votre adresse VibeCoin :\n\n\`${publicKey}\`\n\nPartagez cette adresse pour recevoir des VIBE !`,
    networkStatus: (online: boolean, blocks: number, supply: number, difficulty: number, pending: number) => `🌐 **État du Réseau**\n\n• Statut : ${online ? '🟢 En ligne' : '🔴 Hors ligne'}\n• Blocs : ${blocks}\n• Supply : ${supply} VIBE\n• Difficulté : ${difficulty}\n• TX en attente : ${pending}`,
    help: `Voici ce que je peux faire :\n\n**Wallet :**\n• "Crée un wallet"\n• "Quelle est mon adresse ?"\n• "Quel est mon solde ?"\n\n**Tokens :**\n• "Donne-moi des VIBE"\n• "Envoie 50 VIBE à 04abc..."\n\n**Explorateur :**\n• "Montre-moi les derniers blocs"\n• "Quel est l'état du réseau ?"\n\nParlez naturellement - je comprendrai !`,
    chatCleared: `Chat effacé ! Comment puis-je vous aider ?`,
    noWalletToDelete: `Vous n'avez pas de wallet à supprimer.`,
    walletDeleted: `Wallet supprimé. Vos fonds sont perdus à jamais (c'est le testnet, pas de souci !). Dites "crée un wallet" pour recommencer.`,
    greeting: (hasWallet: boolean, balance: number) => `Salut ! Bienvenue sur VibeCoin. ${hasWallet ? `Votre solde est de ${balance.toFixed(2)} VIBE.` : `Dites "crée un wallet" pour commencer !`}`,
    notUnderstood: `Je n'ai pas bien compris. Essayez de dire :\n• "Crée un wallet"\n• "Donne-moi des VIBE"\n• "Quel est mon solde ?"\n• "Montre les blocs"\n\nOu dites "aide" pour plus d'options !`,
    error: `Une erreur s'est produite. Veuillez réessayer.`,
    placeholder: `Tapez un message... (ex: 'donne-moi des VIBE')`,
    langChanged: `Langue changée en français ! Comment puis-je vous aider ?`
  }
};

interface StoredWallet {
  address: string;
  publicKey: string;
  privateKey: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  content: string;
  timestamp: number;
}

function App() {
  const [currentView, setCurrentView] = useState<View>('chat');
  const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

  // Wallet state
  const [wallet, setWallet] = useState<StoredWallet | null>(null);
  const [balance, setBalance] = useState<number>(0);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Language state
  const [language, setLanguage] = useState<Language | null>(null);
  const t = language ? translations[language] : translations.en;

  // Load wallet, language and chat history from localStorage
  useEffect(() => {
    const storedWallet = localStorage.getItem(WALLET_STORAGE_KEY);
    if (storedWallet) {
      try {
        setWallet(JSON.parse(storedWallet));
      } catch (e) {
        console.error('Failed to load wallet:', e);
      }
    }

    // Load language preference
    const storedLang = localStorage.getItem(LANGUAGE_KEY) as Language | null;
    if (storedLang && (storedLang === 'en' || storedLang === 'fr')) {
      setLanguage(storedLang);

      // Load chat history only if language is set
      const storedChat = localStorage.getItem(CHAT_HISTORY_KEY);
      if (storedChat) {
        try {
          setChatMessages(JSON.parse(storedChat));
        } catch (e) {
          console.error('Failed to load chat history:', e);
        }
      } else {
        // Welcome message in stored language
        setChatMessages([{
          id: 'welcome',
          type: 'system',
          content: translations[storedLang].welcome,
          timestamp: Date.now()
        }]);
      }
    }
    // If no language stored, language remains null and selection screen is shown
  }, []);

  // Handle language selection
  const selectLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
    setChatMessages([{
      id: 'welcome',
      type: 'system',
      content: translations[lang].welcome,
      timestamp: Date.now()
    }]);
  };

  // Save chat history
  useEffect(() => {
    if (chatMessages.length > 0) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatMessages.slice(-50))); // Keep last 50 messages
    }
  }, [chatMessages]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      const [info, blocksData] = await Promise.all([
        api.getInfo(),
        api.getBlocks(20, 0)
      ]);

      setNodeInfo(info);
      setBlocks(blocksData.blocks.reverse());
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

  // Add message to chat
  const addMessage = (type: 'user' | 'system', content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, message]);
    return message;
  };

  // Parse and execute natural language commands
  const processCommand = async (input: string) => {
    const lowerInput = input.toLowerCase().trim();

    // Change language
    if (lowerInput.match(/^(english|anglais)$/i)) {
      selectLanguage('en');
      return null;
    }
    if (lowerInput.match(/^(french|français|francais)$/i)) {
      selectLanguage('fr');
      return null;
    }

    // Create wallet (EN + FR)
    if (lowerInput.match(/create|new|make|generate|crée|créer|nouveau|génère|générer/i) && lowerInput.match(/wallet|account|portefeuille|compte/i)) {
      if (wallet) {
        return t.walletExists(wallet.publicKey.substring(0, 32), balance);
      }

      try {
        const newWallet = await api.createWallet();
        const walletData: StoredWallet = {
          address: newWallet.address,
          publicKey: newWallet.publicKey,
          privateKey: newWallet.privateKey || ''
        };
        setWallet(walletData);
        localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(walletData));
        return t.walletCreated(walletData.publicKey);
      } catch (error) {
        return t.walletCreateFailed;
      }
    }

    // Get faucet / request tokens (EN + FR)
    if (lowerInput.match(/faucet|give|send|want|need|get|donne|envoie|veux|besoin|obtenir/i) && lowerInput.match(/vibe|token|coin|money|some|argent|jeton/i)) {
      if (!wallet) {
        return t.noWallet;
      }

      try {
        const result = await api.claimFaucet(wallet.publicKey);
        setTimeout(fetchBalance, 2000);
        return t.faucetSuccess(result.message, result.remainingClaims, result.nextClaimIn);
      } catch (error: any) {
        try {
          const errorData = error.message ? JSON.parse(error.message.replace('HTTP 429: ', '')) : null;
          if (errorData?.error) {
            return t.faucetCooldown(errorData.error);
          }
        } catch {
          // Not JSON, just return the error
        }
        return error.message || t.error;
      }
    }

    // Check balance (EN + FR)
    if (lowerInput.match(/balance|how much|my vibe|have i|solde|combien|mes vibe|ai-je/i)) {
      if (!wallet) {
        return t.noWallet;
      }

      await fetchBalance();
      return t.balance(balance, wallet.publicKey.substring(0, 24));
    }

    // Send VIBE (EN + FR)
    if (lowerInput.match(/send|transfer|pay|envoie|envoyer|transfert|transférer|paye|payer/i)) {
      if (!wallet) {
        return t.noWallet;
      }

      // Extract amount and address
      const amountMatch = lowerInput.match(/(\d+(?:\.\d+)?)\s*(?:vibe)?/i);
      const addressMatch = input.match(/(?:to\s+|à\s+)?([0-9a-f]{64,})/i) || input.match(/(?:to\s+|à\s+)?(04[0-9a-f]{128})/i);

      if (!amountMatch) {
        return t.sendAmountMissing;
      }

      if (!addressMatch) {
        return t.sendAddressMissing;
      }

      const amount = parseFloat(amountMatch[1]);
      const toAddress = addressMatch[1];

      if (amount > balance) {
        return t.sendInsufficientBalance(balance, amount);
      }

      if (amount <= 0) {
        return t.sendAmountZero;
      }

      try {
        await api.sendTransaction(wallet.publicKey, toAddress, amount, wallet.privateKey);
        setTimeout(fetchBalance, 2000);
        return t.sendSuccess(amount, toAddress.substring(0, 16));
      } catch (error: any) {
        return t.sendFailed(error.message);
      }
    }

    // Show blocks (EN + FR)
    if (lowerInput.match(/block|chain|latest|recent|bloc|chaîne|chaine|dernier|récent/i)) {
      if (!nodeInfo) {
        return t.networkOffline;
      }

      const latestBlocks = blocks.slice(0, 5);
      let response = t.blockchainStatus(nodeInfo.blocks, nodeInfo.circulatingSupply.toFixed(0) as any, nodeInfo.pendingTransactions);

      latestBlocks.forEach(block => {
        response += `• Block #${block.index}: ${block.transactions.length} tx, nonce ${block.nonce.toLocaleString()}\n`;
      });

      return response;
    }

    // Show address (EN + FR)
    if (lowerInput.match(/address|my wallet|public key|adresse|mon wallet|clé publique/i)) {
      if (!wallet) {
        return t.noWallet;
      }

      return t.yourAddress(wallet.publicKey);
    }

    // Network status (EN + FR)
    if (lowerInput.match(/status|network|online|stats|statut|réseau|état|en ligne/i)) {
      if (!nodeInfo) {
        return t.networkOffline;
      }

      return t.networkStatus(isOnline, nodeInfo.blocks, nodeInfo.circulatingSupply.toFixed(0) as any, nodeInfo.difficulty, nodeInfo.pendingTransactions);
    }

    // Help (EN + FR)
    if (lowerInput.match(/help|what can|how to|commands|aide|comment|quoi faire/i)) {
      return t.help;
    }

    // Clear chat (EN + FR)
    if (lowerInput.match(/clear|reset|start over|effacer|réinitialiser|recommencer/i) && lowerInput.match(/chat|history|messages|historique/i)) {
      setChatMessages([{
        id: Date.now().toString(),
        type: 'system',
        content: t.chatCleared,
        timestamp: Date.now()
      }]);
      localStorage.removeItem(CHAT_HISTORY_KEY);
      return null; // Don't add another message
    }

    // Delete wallet (EN + FR)
    if (lowerInput.match(/delete|remove|forget|supprimer|effacer|oublier/i) && lowerInput.match(/wallet|account|portefeuille|compte/i)) {
      if (!wallet) {
        return t.noWalletToDelete;
      }

      localStorage.removeItem(WALLET_STORAGE_KEY);
      setWallet(null);
      setBalance(0);
      return t.walletDeleted;
    }

    // Greeting (EN + FR)
    if (lowerInput.match(/^(hi|hello|hey|yo|sup|bonjour|salut|coucou|bonsoir)/i)) {
      return t.greeting(!!wallet, balance);
    }

    // Default response
    return t.notUnderstood;
  };

  // Handle chat submit
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isProcessing) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    addMessage('user', userMessage);
    setIsProcessing(true);

    try {
      const response = await processCommand(userMessage);
      if (response) {
        addMessage('system', response);
      }
    } catch (error) {
      addMessage('system', 'Something went wrong. Please try again.');
    }

    setIsProcessing(false);
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

  // Language selection screen
  const renderLanguageSelection = () => (
    <div className="language-selection">
      <div className="language-card">
        <div className="language-icon">🌐</div>
        <h2>Choose your language</h2>
        <p>Choisissez votre langue</p>
        <div className="language-buttons">
          <button className="language-btn" onClick={() => selectLanguage('en')}>
            <span className="flag">🇬🇧</span>
            <span>English</span>
          </button>
          <button className="language-btn" onClick={() => selectLanguage('fr')}>
            <span className="flag">🇫🇷</span>
            <span>Français</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderChat = () => {
    // Show language selection if not set
    if (!language) {
      return renderLanguageSelection();
    }

    return (
      <div className="chat-container">
        <div className="chat-header">
          <div className="chat-header-left">
            <h2>VibeChat</h2>
            <p>{language === 'fr' ? 'Parlez à VibeCoin naturellement !' : 'Talk to VibeCoin naturally!'}</p>
          </div>
          <div className="chat-header-right">
            {wallet && (
              <span className="chat-balance">{balance.toFixed(2)} VIBE</span>
            )}
            <button
              className="language-toggle"
              onClick={() => selectLanguage(language === 'en' ? 'fr' : 'en')}
              title={language === 'en' ? 'Switch to French' : 'Passer en anglais'}
            >
              {language === 'en' ? '🇫🇷' : '🇬🇧'}
            </button>
          </div>
        </div>

        <div className="chat-messages">
          {chatMessages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.type}`}>
              <div className="message-content">
                {msg.content.split('\n').map((line, i) => (
                  <p key={i}>{line.includes('`') ? (
                    line.split('`').map((part, j) =>
                      j % 2 === 1 ? <code key={j}>{part}</code> : part
                    )
                  ) : line.includes('**') ? (
                    line.split('**').map((part, j) =>
                      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                    )
                  ) : line}</p>
                ))}
              </div>
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
          {isProcessing && (
            <div className="chat-message system">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleChatSubmit}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={t.placeholder}
            disabled={isProcessing || !isOnline}
          />
          <button type="submit" disabled={isProcessing || !chatInput.trim() || !isOnline}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
            </svg>
          </button>
        </form>
      </div>
    );
  };

  const renderExplorer = () => (
    <div className="explorer">
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
          <div className="logo" onClick={() => setCurrentView('chat')}>
            <div className="logo-icon">
              <span>⚡</span>
            </div>
            <span className="logo-text">VibeCoin</span>
            <span className="network-badge">Testnet</span>
          </div>

          <nav className="nav">
            <button
              className={`nav-link ${currentView === 'chat' ? 'active' : ''}`}
              onClick={() => setCurrentView('chat')}
            >
              VibeChat
            </button>
            <button
              className={`nav-link ${currentView === 'explorer' ? 'active' : ''}`}
              onClick={() => setCurrentView('explorer')}
            >
              Explorer
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
          {currentView === 'chat' && renderChat()}
          {currentView === 'explorer' && renderExplorer()}
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
