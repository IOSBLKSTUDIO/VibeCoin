import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';
import type { NodeInfo, Block } from './api';
import { API_URL, TOKEN, REFRESH_INTERVAL } from './config';
import { exportWalletToFile, importWalletFromFile } from './crypto';
import { RewardsPanel } from './RewardsPanel';
import './App.css';

type View = 'showcase' | 'chat' | 'explorer' | 'wallet' | 'whitepaper';

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
    walletCreated: (publicKey: string, mnemonic: string) => `Wallet created successfully!\n\nYour address:\n\`${publicKey.substring(0, 32)}...\`\n\n🔐 **IMPORTANT: Save your secret recovery phrase!**\n\n\`${mnemonic}\`\n\n⚠️ This phrase is the ONLY way to recover your wallet. Write it down and keep it safe. Never share it with anyone!\n\nNow you can ask me for some free testnet VIBE!`,
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
    walletRestored: (publicKey: string) => `Wallet restored successfully!\n\nYour address:\n\`${publicKey.substring(0, 32)}...\`\n\n✅ You can now use your wallet. Ask me for your balance or some free testnet VIBE!`,
    walletRestoreFailed: `Invalid recovery phrase. Please make sure you entered all 12 words correctly, separated by spaces.`,
    walletRestoreInstructions: `To restore your wallet, type: "restore" followed by your 12-word recovery phrase.\n\nExample: "restore word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"`,
    exportWalletPrompt: `To export your wallet, type: "export wallet" followed by a password to encrypt it.\n\nExample: "export wallet mySecurePassword123"\n\n⚠️ Remember this password - you'll need it to import the wallet!`,
    exportWalletSuccess: `✅ Wallet exported successfully!\n\nA file has been downloaded to your device. Store it safely (USB, cloud storage, etc.).\n\n⚠️ Remember your password - you'll need it to import the wallet!`,
    exportWalletFailed: `❌ Failed to export wallet. Please try again.`,
    importWalletPrompt: `To import a wallet from a backup file:\n\n1. Click the "Import File" button below\n2. Select your wallet file (.json)\n3. Enter your password when prompted`,
    importWalletSuccess: (publicKey: string) => `✅ Wallet imported successfully!\n\nYour address:\n\`${publicKey.substring(0, 32)}...\`\n\nYou can now use your wallet!`,
    importWalletFailed: `❌ Failed to import wallet. Wrong password or corrupted file.`,
    notUnderstood: `I didn't quite understand that. Try saying:\n• "Create a wallet"\n• "Give me some VIBE"\n• "What's my balance?"\n• "Show me the blocks"\n• "Restore my wallet"\n• "Export wallet" or "Import wallet"\n\nOr just say "help" for more options!`,
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
    walletCreated: (publicKey: string, mnemonic: string) => `Wallet créé avec succès !\n\nVotre adresse :\n\`${publicKey.substring(0, 32)}...\`\n\n🔐 **IMPORTANT : Sauvegardez votre phrase de récupération secrète !**\n\n\`${mnemonic}\`\n\n⚠️ Cette phrase est le SEUL moyen de récupérer votre wallet. Notez-la et gardez-la en sécurité. Ne la partagez jamais avec personne !\n\nMaintenant vous pouvez me demander des VIBE gratuits pour le testnet !`,
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
    walletRestored: (publicKey: string) => `Wallet restauré avec succès !\n\nVotre adresse :\n\`${publicKey.substring(0, 32)}...\`\n\n✅ Vous pouvez maintenant utiliser votre wallet. Demandez-moi votre solde ou des VIBE gratuits pour le testnet !`,
    walletRestoreFailed: `Phrase de récupération invalide. Assurez-vous d'avoir entré les 12 mots correctement, séparés par des espaces.`,
    walletRestoreInstructions: `Pour restaurer votre wallet, tapez : "restaurer" suivi de vos 12 mots de récupération.\n\nExemple : "restaurer mot1 mot2 mot3 mot4 mot5 mot6 mot7 mot8 mot9 mot10 mot11 mot12"`,
    exportWalletPrompt: `Pour exporter votre wallet, tapez : "exporter wallet" suivi d'un mot de passe pour le chiffrer.\n\nExemple : "exporter wallet monMotDePasse123"\n\n⚠️ Retenez ce mot de passe - vous en aurez besoin pour importer le wallet !`,
    exportWalletSuccess: `✅ Wallet exporté avec succès !\n\nUn fichier a été téléchargé sur votre appareil. Stockez-le en sécurité (clé USB, cloud, etc.).\n\n⚠️ Retenez votre mot de passe - vous en aurez besoin pour importer le wallet !`,
    exportWalletFailed: `❌ Échec de l'export du wallet. Veuillez réessayer.`,
    importWalletPrompt: `Pour importer un wallet depuis un fichier de sauvegarde :\n\n1. Cliquez sur le bouton "Importer un fichier" ci-dessous\n2. Sélectionnez votre fichier wallet (.json)\n3. Entrez votre mot de passe quand demandé`,
    importWalletSuccess: (publicKey: string) => `✅ Wallet importé avec succès !\n\nVotre adresse :\n\`${publicKey.substring(0, 32)}...\`\n\nVous pouvez maintenant utiliser votre wallet !`,
    importWalletFailed: `❌ Échec de l'import du wallet. Mauvais mot de passe ou fichier corrompu.`,
    notUnderstood: `Je n'ai pas bien compris. Essayez de dire :\n• "Crée un wallet"\n• "Donne-moi des VIBE"\n• "Quel est mon solde ?"\n• "Montre les blocs"\n• "Restaurer mon wallet"\n• "Exporter wallet" ou "Importer wallet"\n\nOu dites "aide" pour plus d'options !`,
    error: `Une erreur s'est produite. Veuillez réessayer.`,
    placeholder: `Tapez un message... (ex: 'donne-moi des VIBE')`,
    langChanged: `Langue changée en français ! Comment puis-je vous aider ?`
  }
};

interface StoredWallet {
  address: string;
  publicKey: string;
  privateKey: string;
  mnemonic?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  content: string;
  timestamp: number;
}

function App() {
  const [currentView, setCurrentView] = useState<View>('showcase');
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Language state
  const [language, setLanguage] = useState<Language | null>(null);
  const t = language ? translations[language] : translations.en;

  // Rewards state
  const [showRewards, setShowRewards] = useState(false);
  const [streakCount, setStreakCount] = useState(0);

  // Load streak count from API on mount (when wallet is available)
  useEffect(() => {
    if (wallet?.publicKey) {
      api.getRewardsStatus(wallet.publicKey)
        .then(status => setStreakCount(status.streak.current))
        .catch(() => setStreakCount(0));
    }
  }, [wallet?.publicKey]);

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

  // Track mission progress (on-chain via API)
  const trackMission = async (action: string) => {
    if (!wallet?.publicKey) return;

    try {
      const response = await api.trackMission(wallet.publicKey, action);
      if (response.completed && response.missionId) {
        // Mission completed notification
        const missionNames: Record<string, { en: string; fr: string }> = {
          check_balance: { en: 'Check your balance', fr: 'Vérifier ton solde' },
          view_blocks: { en: 'Explore the blockchain', fr: 'Explorer la blockchain' },
          claim_faucet: { en: 'Claim from faucet', fr: 'Réclamer au faucet' },
          send_transaction: { en: 'Make a transaction', fr: 'Effectuer une transaction' },
          share_twitter: { en: 'Share on Twitter/X', fr: 'Partager sur Twitter/X' },
          stay_connected: { en: 'Stay connected 10 min', fr: 'Rester connecté 10 min' },
        };
        const mission = missionNames[response.missionId];
        if (mission) {
          const missionName = language === 'fr' ? mission.fr : mission.en;
          addMessage('system', language === 'fr'
            ? `🎉 Mission complétée : "${missionName}" ! Ouvre les Récompenses pour réclamer ta récompense VIBE`
            : `🎉 Mission completed: "${missionName}"! Open Rewards to claim your VIBE reward`);
        }
      }
    } catch (err) {
      console.error('Failed to track mission:', err);
    }
  };

  // Handle reward earned
  const handleRewardEarned = (amount: number, reason: string) => {
    addMessage('system', language === 'fr'
      ? `🎁 +${amount} VIBE gagné : ${reason}`
      : `🎁 +${amount} VIBE earned: ${reason}`);
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
        const newWallet = await api.createWalletWithMnemonic();
        const walletData: StoredWallet = {
          address: newWallet.address,
          publicKey: newWallet.publicKey,
          privateKey: newWallet.privateKey || '',
          mnemonic: newWallet.mnemonic
        };
        setWallet(walletData);
        localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(walletData));
        return t.walletCreated(walletData.publicKey, walletData.mnemonic || '');
      } catch (error) {
        return t.walletCreateFailed;
      }
    }

    // Restore wallet from mnemonic (EN + FR)
    if (lowerInput.match(/^(restore|recover|import|restaurer|récupérer|importer)\s+(.+)/i)) {
      const match = input.match(/^(?:restore|recover|import|restaurer|récupérer|importer)\s+(.+)/i);
      if (match) {
        const mnemonic = match[1].trim().toLowerCase();
        const wordCount = mnemonic.split(/\s+/).length;

        if (wordCount !== 12) {
          return t.walletRestoreInstructions;
        }

        try {
          const restoredWallet = await api.restoreFromMnemonic(mnemonic);
          const walletData: StoredWallet = {
            address: restoredWallet.address,
            publicKey: restoredWallet.publicKey,
            privateKey: restoredWallet.privateKey || '',
            mnemonic: mnemonic
          };
          setWallet(walletData);
          localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(walletData));
          return t.walletRestored(walletData.publicKey);
        } catch (error) {
          return t.walletRestoreFailed;
        }
      }
    }

    // Show restore instructions (EN + FR)
    if (lowerInput.match(/^(restore|recover|restaurer|récupérer)$/i)) {
      return t.walletRestoreInstructions;
    }

    // Export wallet with password (EN + FR)
    if (lowerInput.match(/^(export|exporter|backup|sauvegarder)\s+(wallet|portefeuille)\s+(.+)/i)) {
      if (!wallet) {
        return t.noWallet;
      }

      const match = input.match(/^(?:export|exporter|backup|sauvegarder)\s+(?:wallet|portefeuille)\s+(.+)/i);
      if (match) {
        const password = match[1].trim();
        if (password.length < 6) {
          return language === 'fr'
            ? '⚠️ Le mot de passe doit contenir au moins 6 caractères.'
            : '⚠️ Password must be at least 6 characters.';
        }

        try {
          await exportWalletToFile(wallet, password);
          return t.exportWalletSuccess;
        } catch (error) {
          return t.exportWalletFailed;
        }
      }
    }

    // Show export instructions (EN + FR)
    if (lowerInput.match(/^(export|exporter|backup|sauvegarder)(\s+(wallet|portefeuille))?$/i)) {
      if (!wallet) {
        return t.noWallet;
      }
      return t.exportWalletPrompt;
    }

    // Show import instructions (EN + FR)
    if (lowerInput.match(/^(import|importer)(\s+(wallet|portefeuille|file|fichier))?$/i)) {
      return t.importWalletPrompt;
    }

    // Get faucet / request tokens (EN + FR)
    if (lowerInput.match(/faucet|give|send|want|need|get|donne|envoie|veux|besoin|obtenir/i) && lowerInput.match(/vibe|token|coin|money|some|argent|jeton/i)) {
      if (!wallet) {
        return t.noWallet;
      }

      try {
        const result = await api.claimFaucet(wallet.publicKey);
        setTimeout(fetchBalance, 2000);
        trackMission('faucet'); // Track faucet mission
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
      trackMission('balance'); // Track balance mission
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
        trackMission('send'); // Track send mission
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

      trackMission('blocks'); // Track blocks mission
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

  // Handle file import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const password = prompt(language === 'fr'
      ? 'Entrez le mot de passe pour déchiffrer le wallet :'
      : 'Enter the password to decrypt the wallet:');

    if (!password) {
      addMessage('system', language === 'fr' ? 'Import annulé.' : 'Import cancelled.');
      return;
    }

    setIsProcessing(true);
    try {
      const walletData = await importWalletFromFile(file, password) as StoredWallet;
      setWallet(walletData);
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(walletData));
      addMessage('system', t.importWalletSuccess(walletData.publicKey));
    } catch (error) {
      addMessage('system', t.importWalletFailed);
    }
    setIsProcessing(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  // Quick action buttons for the chat
  const quickActions = language === 'fr' ? [
    { label: 'Créer un wallet', command: 'Crée-moi un wallet', icon: '👛' },
    { label: 'Mon solde', command: 'Quel est mon solde ?', icon: '💰' },
    { label: 'Obtenir des VIBE', command: 'Donne-moi des VIBE', icon: '🎁' },
    { label: 'Mon adresse', command: 'Quelle est mon adresse ?', icon: '📋' },
    { label: 'Voir les blocs', command: 'Montre-moi les derniers blocs', icon: '📦' },
    { label: 'État du réseau', command: 'Quel est l\'état du réseau ?', icon: '🌐' },
    { label: 'Exporter wallet', command: 'exporter wallet', icon: '💾' },
    { label: 'Restaurer wallet', command: 'restaurer', icon: '🔄' },
  ] : [
    { label: 'Create wallet', command: 'Create a wallet for me', icon: '👛' },
    { label: 'My balance', command: 'What\'s my balance?', icon: '💰' },
    { label: 'Get VIBE', command: 'Give me some VIBE', icon: '🎁' },
    { label: 'My address', command: 'What\'s my address?', icon: '📋' },
    { label: 'View blocks', command: 'Show me the latest blocks', icon: '📦' },
    { label: 'Network status', command: 'What\'s the network status?', icon: '🌐' },
    { label: 'Export wallet', command: 'export wallet', icon: '💾' },
    { label: 'Restore wallet', command: 'restore', icon: '🔄' },
  ];

  const handleQuickAction = async (command: string) => {
    if (isProcessing) return;

    addMessage('user', command);
    setIsProcessing(true);

    try {
      const response = await processCommand(command);
      if (response) {
        addMessage('system', response);
      }
    } catch (error) {
      addMessage('system', t.error);
    }

    setIsProcessing(false);
  };

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
              className="rewards-btn"
              onClick={() => setShowRewards(true)}
              title={language === 'fr' ? 'Récompenses' : 'Rewards'}
            >
              🎁 {language === 'fr' ? 'Récompenses' : 'Rewards'}
              {streakCount > 0 && <span className="streak-badge">🔥{streakCount}</span>}
            </button>
            <button
              className="language-toggle"
              onClick={() => selectLanguage(language === 'en' ? 'fr' : 'en')}
              title={language === 'en' ? 'Switch to French' : 'Passer en anglais'}
            >
              {language === 'en' ? '🇫🇷' : '🇬🇧'}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <div className="quick-actions-label">
            {language === 'fr' ? 'Actions rapides :' : 'Quick actions:'}
          </div>
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="quick-action-btn"
                onClick={() => handleQuickAction(action.command)}
                disabled={isProcessing}
              >
                <span className="quick-action-icon">{action.icon}</span>
                <span className="quick-action-label">{action.label}</span>
              </button>
            ))}
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
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileImport}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="import-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            title={language === 'fr' ? 'Importer un wallet' : 'Import wallet'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
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

  const renderShowcase = () => (
    <div className="showcase">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg-grid"></div>
        <div className="hero-glow"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            {language === 'fr' ? 'Testnet Actif' : 'Testnet Live'}
          </div>
          <h1 className="hero-title">
            <span className="title-gradient">VibeCoin</span>
            <span className="title-sub">{language === 'fr' ? 'La crypto née du VibeCoding' : 'The Crypto Born from VibeCoding'}</span>
          </h1>
          <p className="hero-description">
            {language === 'fr'
              ? 'Une blockchain nouvelle génération avec Proof of Vibe (PoV). Stakez, votez, gagnez des récompenses et participez à un écosystème décentralisé où la créativité et la communauté sont au coeur du consensus.'
              : 'A next-generation blockchain with Proof of Vibe (PoV). Stake, vote, earn rewards, and participate in a decentralized ecosystem where creativity and community drive consensus.'}
          </p>
          <div className="hero-cta">
            <button className="cta-primary" onClick={() => setCurrentView('chat')}>
              <span className="cta-icon">⚡</span>
              {language === 'fr' ? 'Lancer l\'App' : 'Launch App'}
            </button>
            <button className="cta-secondary" onClick={() => setCurrentView('whitepaper')}>
              <span className="cta-icon">📄</span>
              Whitepaper
            </button>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-number">{nodeInfo?.blocks || 0}</span>
              <span className="stat-label">Blocks</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <span className="stat-number">{nodeInfo?.circulatingSupply?.toFixed(0) || 0}</span>
              <span className="stat-label">VIBE {language === 'fr' ? 'Minés' : 'Minted'}</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <span className="stat-number">21M</span>
              <span className="stat-label">Max Supply</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <span className="stat-number">~10s</span>
              <span className="stat-label">Block Time</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">
          <span className="title-icon">🔮</span>
          {language === 'fr' ? 'Architecture Technique' : 'Technical Architecture'}
        </h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <span className="feature-icon">🛡️</span>
            </div>
            <h3>Proof of Vibe (PoV)</h3>
            <p>{language === 'fr'
              ? 'Consensus hybride combinant staking, votes communautaires et score de contribution pour une sécurité décentralisée.'
              : 'Hybrid consensus combining staking, community votes, and contribution score for decentralized security.'}</p>
            <div className="feature-code">
              <code>VibeScore = (Stake × 0.4) + (Votes × 0.3) + (Contribution × 0.3)</code>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <span className="feature-icon">⛓️</span>
            </div>
            <h3>{language === 'fr' ? 'Blockchain Complète' : 'Full Blockchain'}</h3>
            <p>{language === 'fr'
              ? 'Implémentation from scratch : blocs, transactions signées ECDSA, mempool, P2P, API REST et stockage LevelDB.'
              : 'Built from scratch: blocks, ECDSA-signed transactions, mempool, P2P network, REST API and LevelDB storage.'}</p>
            <div className="feature-tech-stack">
              <span className="tech-tag">TypeScript</span>
              <span className="tech-tag">Node.js</span>
              <span className="tech-tag">LevelDB</span>
              <span className="tech-tag">WebSocket</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <span className="feature-icon">🎮</span>
            </div>
            <h3>{language === 'fr' ? 'Gamification On-Chain' : 'On-Chain Gamification'}</h3>
            <p>{language === 'fr'
              ? 'Système de missions, streaks quotidiens, récompenses VIBE et progression stockés directement sur la blockchain.'
              : 'Mission system, daily streaks, VIBE rewards and progression stored directly on the blockchain.'}</p>
            <div className="feature-rewards">
              <span className="reward-item">🎯 Missions</span>
              <span className="reward-item">🔥 Streaks</span>
              <span className="reward-item">💎 Rewards</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <span className="feature-icon">🔐</span>
            </div>
            <h3>{language === 'fr' ? 'Sécurité Avancée' : 'Advanced Security'}</h3>
            <p>{language === 'fr'
              ? 'Signatures ECDSA secp256k1, validation des transactions, limite mempool anti-DoS, et système Guardian de backup.'
              : 'ECDSA secp256k1 signatures, transaction validation, anti-DoS mempool limits, and Guardian backup system.'}</p>
            <div className="feature-security">
              <span className="security-badge">✓ ECDSA</span>
              <span className="security-badge">✓ SHA-256</span>
              <span className="security-badge">✓ Merkle</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <span className="feature-icon">💬</span>
            </div>
            <h3>VibeChat AI</h3>
            <p>{language === 'fr'
              ? 'Interface conversationnelle en langage naturel pour interagir avec la blockchain. Créez des wallets et envoyez des VIBE en parlant.'
              : 'Natural language conversational interface to interact with the blockchain. Create wallets and send VIBE just by talking.'}</p>
            <div className="feature-chat-demo">
              <span className="chat-example">"Give me some VIBE"</span>
              <span className="chat-arrow">→</span>
              <span className="chat-result">+100 VIBE</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <span className="feature-icon">🌐</span>
            </div>
            <h3>{language === 'fr' ? 'Réseau P2P' : 'P2P Network'}</h3>
            <p>{language === 'fr'
              ? 'Architecture décentralisée avec synchronisation des blocs, broadcast des transactions et découverte automatique des pairs.'
              : 'Decentralized architecture with block synchronization, transaction broadcast and automatic peer discovery.'}</p>
            <div className="feature-network">
              <div className="network-node active"></div>
              <div className="network-line"></div>
              <div className="network-node"></div>
              <div className="network-line"></div>
              <div className="network-node"></div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-section">
        <h2 className="section-title">
          <span className="title-icon">🚀</span>
          {language === 'fr' ? 'Comment ça marche' : 'How It Works'}
        </h2>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">01</div>
            <h3>{language === 'fr' ? 'Créez votre Wallet' : 'Create your Wallet'}</h3>
            <p>{language === 'fr'
              ? 'Générez un wallet sécurisé avec phrase de récupération de 12 mots. 100% client-side.'
              : 'Generate a secure wallet with 12-word recovery phrase. 100% client-side.'}</p>
          </div>
          <div className="step-connector">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <div className="step-card">
            <div className="step-number">02</div>
            <h3>{language === 'fr' ? 'Obtenez des VIBE' : 'Get VIBE'}</h3>
            <p>{language === 'fr'
              ? 'Utilisez le faucet testnet pour recevoir des tokens gratuits et commencer à explorer.'
              : 'Use the testnet faucet to receive free tokens and start exploring.'}</p>
          </div>
          <div className="step-connector">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <div className="step-card">
            <div className="step-number">03</div>
            <h3>{language === 'fr' ? 'Gagnez des Récompenses' : 'Earn Rewards'}</h3>
            <p>{language === 'fr'
              ? 'Complétez des missions, maintenez votre streak et gagnez des VIBE supplémentaires.'
              : 'Complete missions, maintain your streak and earn bonus VIBE.'}</p>
          </div>
        </div>
      </section>

      {/* Tech Specs Section */}
      <section className="specs-section">
        <h2 className="section-title">
          <span className="title-icon">⚙️</span>
          {language === 'fr' ? 'Spécifications' : 'Specifications'}
        </h2>
        <div className="specs-grid">
          <div className="spec-item">
            <span className="spec-key">Symbol</span>
            <span className="spec-value">VIBE</span>
          </div>
          <div className="spec-item">
            <span className="spec-key">Max Supply</span>
            <span className="spec-value">21,000,000</span>
          </div>
          <div className="spec-item">
            <span className="spec-key">Decimals</span>
            <span className="spec-value">8</span>
          </div>
          <div className="spec-item">
            <span className="spec-key">Block Time</span>
            <span className="spec-value">~10s</span>
          </div>
          <div className="spec-item">
            <span className="spec-key">Consensus</span>
            <span className="spec-value">Proof of Vibe</span>
          </div>
          <div className="spec-item">
            <span className="spec-key">Cryptography</span>
            <span className="spec-value">ECDSA secp256k1</span>
          </div>
          <div className="spec-item">
            <span className="spec-key">Hash</span>
            <span className="spec-value">SHA-256</span>
          </div>
          <div className="spec-item">
            <span className="spec-key">Storage</span>
            <span className="spec-value">LevelDB</span>
          </div>
          <div className="spec-item">
            <span className="spec-key">Network</span>
            <span className="spec-value">WebSocket P2P</span>
          </div>
          <div className="spec-item">
            <span className="spec-key">API</span>
            <span className="spec-value">REST + JSON</span>
          </div>
          <div className="spec-item">
            <span className="spec-key">Max Validators</span>
            <span className="spec-value">21</span>
          </div>
          <div className="spec-item">
            <span className="spec-key">Min Stake</span>
            <span className="spec-value">100 VIBE</span>
          </div>
        </div>
      </section>

      {/* Run Your Node Section */}
      <section className="node-section">
        <h2 className="section-title">
          <span className="title-icon">🖥️</span>
          {language === 'fr' ? 'Faites Tourner Votre Nœud' : 'Run Your Own Node'}
        </h2>
        <p className="section-subtitle">
          {language === 'fr'
            ? 'Rejoignez le réseau décentralisé ! Chaque nœud renforce VibeCoin.'
            : 'Join the decentralized network! Every node makes VibeCoin stronger.'}
        </p>
        <div className="node-options">
          <div className="node-option-card full-node">
            <div className="node-icon">🔷</div>
            <h3>Full Node</h3>
            <p>{language === 'fr'
              ? 'Stocke toute la blockchain, peut miner et valider les transactions.'
              : 'Stores the full blockchain, can mine and validate transactions.'}</p>
            <div className="node-features">
              <span className="node-feature">✓ {language === 'fr' ? 'Mining' : 'Mining'}</span>
              <span className="node-feature">✓ {language === 'fr' ? 'Validation' : 'Validation'}</span>
              <span className="node-feature">✓ API REST</span>
            </div>
            <div className="node-code">
              <code>vibecoin --mine --miner new</code>
            </div>
          </div>
          <div className="node-option-card light-node">
            <div className="node-icon eco">🌱</div>
            <h3>Light Node <span className="eco-badge">ECO</span></h3>
            <p>{language === 'fr'
              ? 'Mode écologique : stockage minimal, faible consommation CPU.'
              : 'Eco mode: minimal storage, low CPU usage.'}</p>
            <div className="node-features">
              <span className="node-feature">✓ {language === 'fr' ? '99% moins de stockage' : '99% less storage'}</span>
              <span className="node-feature">✓ {language === 'fr' ? 'Faible énergie' : 'Low power'}</span>
              <span className="node-feature">✓ SPV</span>
            </div>
            <div className="node-code">
              <code>vibecoin --light</code>
            </div>
          </div>
        </div>
        <div className="node-install">
          <h4>{language === 'fr' ? 'Installation en une ligne' : 'One-Line Install'}</h4>
          <div className="install-tabs">
            <div className="install-tab">
              <span className="tab-label">Mac/Linux</span>
              <div className="install-code">
                <code>curl -fsSL https://raw.githubusercontent.com/IOSBLKSTUDIO/VibeCoin/master/scripts/install.sh | bash</code>
              </div>
            </div>
            <div className="install-tab">
              <span className="tab-label">Windows</span>
              <div className="install-code">
                <code>iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/IOSBLKSTUDIO/VibeCoin/master/scripts/install.ps1'))</code>
              </div>
            </div>
          </div>
          <a href="https://github.com/IOSBLKSTUDIO/VibeCoin/blob/master/docs/RUNNING_A_NODE.md" target="_blank" rel="noopener noreferrer" className="docs-link">
            📖 {language === 'fr' ? 'Documentation complète' : 'Full Documentation'}
          </a>
        </div>
      </section>

      {/* CTA Section */}
      <section className="final-cta-section">
        <div className="cta-card">
          <h2>{language === 'fr' ? 'Prêt à Vibe ?' : 'Ready to Vibe?'}</h2>
          <p>{language === 'fr'
            ? 'Rejoignez le testnet maintenant et soyez parmi les premiers à explorer VibeCoin.'
            : 'Join the testnet now and be among the first to explore VibeCoin.'}</p>
          <div className="cta-buttons">
            <button className="cta-primary large" onClick={() => setCurrentView('chat')}>
              <span className="cta-icon">🚀</span>
              {language === 'fr' ? 'Commencer' : 'Get Started'}
            </button>
            <a href="https://github.com/IOSBLKSTUDIO/VibeCoin" target="_blank" rel="noopener noreferrer" className="cta-github">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );

  const renderWhitepaper = () => (
    <section className="page-section">
      <div className="container">
        <article className="whitepaper-content">
          <h1>VibeCoin Whitepaper</h1>
          <p className="subtitle">{language === 'fr' ? 'La Crypto née du VibeCoding' : 'The Cryptocurrency Born from VibeCoding'}</p>
          <p className="wp-version">v1.1.0 — January 2026</p>

          <section className="wp-section">
            <h2>{language === 'fr' ? 'Résumé' : 'Abstract'}</h2>
            <p>
              {language === 'fr'
                ? 'VibeCoin (VIBE) représente un changement de paradigme dans la conception des cryptomonnaies, intégrant la philosophie du VibeCoding au cœur de son architecture. Contrairement aux cryptomonnaies traditionnelles qui privilégient la puissance de calcul ou l\'accumulation de capital, VibeCoin introduit le "Proof of Vibe" (PoV) — un mécanisme de consensus novateur qui récompense la créativité, la contribution communautaire et les pratiques de développement durables.'
                : 'VibeCoin (VIBE) represents a paradigm shift in cryptocurrency design, embedding the philosophy of VibeCoding into its core architecture. Unlike traditional cryptocurrencies that prioritize computational power or capital accumulation, VibeCoin introduces "Proof of Vibe" (PoV) — a novel consensus mechanism that rewards creativity, community contribution, and sustainable development practices.'}
            </p>
          </section>

          <section className="wp-section">
            <h2>{language === 'fr' ? 'La Philosophie VibeCoding' : 'The VibeCoding Philosophy'}</h2>
            <p>
              {language === 'fr'
                ? 'Le VibeCoding a émergé comme un contre-mouvement à l\'industrialisation du développement logiciel. Il prône :'
                : 'VibeCoding emerged as a counter-movement to the industrialization of software development. It advocates for:'}
            </p>
            <ul>
              <li><strong>{language === 'fr' ? 'Le Flow plutôt que la Force' : 'Flow Over Force'}:</strong> {language === 'fr' ? 'Écrire du code quand l\'inspiration frappe' : 'Writing code when inspiration strikes'}</li>
              <li><strong>{language === 'fr' ? 'Développement Intuitif' : 'Intuition-Driven Development'}:</strong> {language === 'fr' ? 'Faire confiance à l\'instinct du développeur' : 'Trusting developer instincts'}</li>
              <li><strong>{language === 'fr' ? 'Expression Créative' : 'Creative Expression'}:</strong> {language === 'fr' ? 'Chaque ligne de code est une œuvre d\'art' : 'Every line of code as art'}</li>
              <li><strong>{language === 'fr' ? 'Harmonie Communautaire' : 'Community Harmony'}:</strong> {language === 'fr' ? 'Construire ensemble, grandir ensemble' : 'Building together, growing together'}</li>
            </ul>
          </section>

          <section className="wp-section">
            <h2>Proof of Vibe (PoV)</h2>
            <p>
              {language === 'fr'
                ? 'Notre mécanisme de consensus combine des éléments de Proof of Stake (PoS), Delegated Proof of Stake (DPoS), et un système de réputation novateur :'
                : 'Our consensus mechanism combines elements of Proof of Stake (PoS), Delegated Proof of Stake (DPoS), and a novel reputation system:'}
            </p>
            <div className="formula-box">
              <strong>VibeScore = (Stake × 0.4) + (Votes × 0.3) + (Contribution × 0.3)</strong>
            </div>
            <p>
              {language === 'fr'
                ? 'Les validateurs sont sélectionnés en fonction de leur VibeScore, garantissant que ceux qui contribuent le plus à l\'écosystème ont la plus grande influence.'
                : 'Validators are selected based on their VibeScore, ensuring that those who contribute most to the ecosystem have the greatest influence.'}
            </p>
          </section>

          <section className="wp-section">
            <h2>{language === 'fr' ? 'Gamification On-Chain' : 'On-Chain Gamification'}</h2>
            <p>
              {language === 'fr'
                ? 'VibeCoin intègre un système de gamification complet directement sur la blockchain, encourageant l\'engagement et la fidélité des utilisateurs :'
                : 'VibeCoin integrates a complete gamification system directly on the blockchain, encouraging user engagement and loyalty:'}
            </p>
            <ul>
              <li><strong>{language === 'fr' ? 'Système de Missions' : 'Mission System'}:</strong> {language === 'fr' ? 'Complétez des missions quotidiennes pour gagner des VIBE (vérifier le solde, explorer les blocs, utiliser le faucet, effectuer des transactions, partager sur les réseaux sociaux)' : 'Complete daily missions to earn VIBE (check balance, explore blocks, use faucet, make transactions, share on social media)'}</li>
              <li><strong>{language === 'fr' ? 'Streaks Quotidiens' : 'Daily Streaks'}:</strong> {language === 'fr' ? 'Maintenez une série de connexions consécutives pour des bonus croissants (jusqu\'à +100% au jour 7)' : 'Maintain consecutive login streaks for increasing bonuses (up to +100% on day 7)'}</li>
              <li><strong>{language === 'fr' ? 'Récompenses Persistantes' : 'Persistent Rewards'}:</strong> {language === 'fr' ? 'Toutes les données de progression sont stockées sur la blockchain via LevelDB' : 'All progression data is stored on the blockchain via LevelDB'}</li>
            </ul>
            <div className="formula-box">
              <strong>{language === 'fr' ? 'Récompenses Streak' : 'Streak Rewards'}: Day 3 = +25% | Day 5 = +50% | Day 7 = +100%</strong>
            </div>
          </section>

          <section className="wp-section">
            <h2>{language === 'fr' ? 'Système Guardian' : 'Guardian System'}</h2>
            <p>
              {language === 'fr'
                ? 'Pour assurer la résilience et la décentralisation du réseau, VibeCoin implémente un système de "Guardians" :'
                : 'To ensure network resilience and decentralization, VibeCoin implements a "Guardians" system:'}
            </p>
            <ul>
              <li><strong>{language === 'fr' ? 'Sauvegarde Blockchain' : 'Blockchain Backup'}:</strong> {language === 'fr' ? 'Les utilisateurs peuvent télécharger une copie complète de la blockchain' : 'Users can download a complete copy of the blockchain'}</li>
              <li><strong>{language === 'fr' ? 'Vérification de Backup' : 'Backup Verification'}:</strong> {language === 'fr' ? 'Les backups sont vérifiés cryptographiquement pour garantir leur intégrité' : 'Backups are cryptographically verified to ensure integrity'}</li>
              <li><strong>{language === 'fr' ? 'Récompenses Guardian' : 'Guardian Rewards'}:</strong> {language === 'fr' ? '50 VIBE toutes les 24h pour les utilisateurs qui maintiennent des backups valides' : '50 VIBE every 24h for users who maintain valid backups'}</li>
              <li><strong>{language === 'fr' ? 'Récupération' : 'Recovery'}:</strong> {language === 'fr' ? 'En cas de défaillance, n\'importe quel Guardian peut restaurer le réseau' : 'In case of failure, any Guardian can restore the network'}</li>
            </ul>
          </section>

          <section className="wp-section">
            <h2>{language === 'fr' ? 'Architecture Sécurisée' : 'Secure Architecture'}</h2>
            <p>
              {language === 'fr'
                ? 'VibeCoin implémente plusieurs couches de sécurité pour protéger le réseau et les utilisateurs :'
                : 'VibeCoin implements multiple security layers to protect the network and users:'}
            </p>
            <ul>
              <li><strong>ECDSA secp256k1:</strong> {language === 'fr' ? 'Signatures cryptographiques de niveau Bitcoin' : 'Bitcoin-grade cryptographic signatures'}</li>
              <li><strong>SHA-256:</strong> {language === 'fr' ? 'Hachage des blocs et transactions' : 'Block and transaction hashing'}</li>
              <li><strong>{language === 'fr' ? 'Validation des Transactions' : 'Transaction Validation'}:</strong> {language === 'fr' ? 'Vérification des montants, adresses et taille des données' : 'Amount, address, and data size verification'}</li>
              <li><strong>{language === 'fr' ? 'Protection Anti-DoS' : 'Anti-DoS Protection'}:</strong> {language === 'fr' ? 'Limite de 1000 transactions en attente dans le mempool' : 'Limit of 1000 pending transactions in the mempool'}</li>
              <li><strong>{language === 'fr' ? 'Clés Sécurisées' : 'Secure Keys'}:</strong> {language === 'fr' ? 'Clés admin via variables d\'environnement, jamais hardcodées' : 'Admin keys via environment variables, never hardcoded'}</li>
            </ul>
          </section>

          <section className="wp-section">
            <h2>{language === 'fr' ? 'Spécifications Techniques' : 'Technical Specifications'}</h2>
            <table className="specs-table">
              <tbody>
                <tr><td>Symbol</td><td>{TOKEN.symbol}</td></tr>
                <tr><td>Total Supply</td><td>{TOKEN.maxSupply.toLocaleString()}</td></tr>
                <tr><td>Block Time</td><td>~10 {language === 'fr' ? 'secondes' : 'seconds'}</td></tr>
                <tr><td>Consensus</td><td>Proof of Vibe (PoV)</td></tr>
                <tr><td>Max Validators</td><td>21</td></tr>
                <tr><td>Minimum Stake</td><td>100 VIBE</td></tr>
                <tr><td>Decimals</td><td>{TOKEN.decimals}</td></tr>
                <tr><td>Cryptography</td><td>ECDSA secp256k1 + SHA-256</td></tr>
                <tr><td>Storage</td><td>LevelDB</td></tr>
                <tr><td>Network</td><td>WebSocket P2P</td></tr>
                <tr><td>API</td><td>REST + JSON</td></tr>
                <tr><td>Max Mempool</td><td>1000 TX</td></tr>
              </tbody>
            </table>
          </section>

          <section className="wp-section">
            <h2>VibeChat</h2>
            <p>
              {language === 'fr'
                ? 'VibeCoin propose une interface conversationnelle unique permettant d\'interagir avec la blockchain en langage naturel :'
                : 'VibeCoin offers a unique conversational interface allowing interaction with the blockchain in natural language:'}
            </p>
            <ul>
              <li><strong>{language === 'fr' ? 'Création de Wallet' : 'Wallet Creation'}:</strong> "Create a wallet for me"</li>
              <li><strong>{language === 'fr' ? 'Demande de Tokens' : 'Token Request'}:</strong> "Give me some VIBE"</li>
              <li><strong>{language === 'fr' ? 'Transferts' : 'Transfers'}:</strong> "Send 50 VIBE to 04abc..."</li>
              <li><strong>{language === 'fr' ? 'Exploration' : 'Exploration'}:</strong> "Show me the latest blocks"</li>
              <li><strong>{language === 'fr' ? 'Multilingue' : 'Multilingual'}:</strong> {language === 'fr' ? 'Supporte l\'anglais et le français' : 'Supports English and French'}</li>
            </ul>
          </section>

          <section className="wp-section">
            <h2>Conclusion</h2>
            <p>
              {language === 'fr'
                ? 'VibeCoin est plus qu\'une cryptomonnaie — c\'est un mouvement. En alignant les incitations économiques avec la contribution créative et la construction communautaire, nous créons un écosystème durable où développeurs, artistes et éducateurs peuvent s\'épanouir.'
                : 'VibeCoin is more than a cryptocurrency — it\'s a movement. By aligning economic incentives with creative contribution and community building, we create a sustainable ecosystem where developers, artists, and educators can thrive.'}
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
              className={`nav-link ${currentView === 'showcase' ? 'active' : ''}`}
              onClick={() => setCurrentView('showcase')}
            >
              Home
            </button>
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

      <main className={`main ${currentView === 'showcase' ? 'showcase-main' : ''}`}>
        <div className={currentView === 'showcase' ? 'showcase-container' : 'container'}>
          {currentView === 'showcase' && renderShowcase()}
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
            <span className="divider">•</span>
            <button
              className="backup-link"
              onClick={async () => {
                try {
                  await api.downloadBlockchain();
                  if (wallet?.publicKey) {
                    // Silent verification for guardian reward
                    const backup = await api.exportBlockchain();
                    await api.verifyBackup(backup, wallet.publicKey);
                  }
                } catch (e) {
                  console.error('Backup download failed:', e);
                }
              }}
              title={language === 'fr' ? 'Télécharger la blockchain' : 'Download blockchain'}
            >
              📦 Backup
            </button>
          </div>
        </div>
      </footer>

      {/* Rewards Panel */}
      {language && (
        <RewardsPanel
          language={language}
          walletAddress={wallet?.publicKey || null}
          onRewardEarned={handleRewardEarned}
          isVisible={showRewards}
          onClose={() => setShowRewards(false)}
        />
      )}
    </div>
  );
}

export default App;
