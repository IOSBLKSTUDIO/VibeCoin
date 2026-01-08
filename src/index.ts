/**
 * VibeCoin - Main Entry Point
 * The cryptocurrency born from the VibeCoding movement
 */

// Core
export { Block, ConsensusType } from './core/Block';
export { Transaction } from './core/Transaction';
export { Blockchain, BLOCKCHAIN_CONFIG } from './core/Blockchain';

// Wallet
export { Wallet } from './wallet/Wallet';

// Consensus - Proof of Vibe
export {
  ProofOfVibe,
  PoVConfig,
  DEFAULT_POV_CONFIG,
  StakingManager,
  StakeInfo,
  VotingManager,
  ValidatorManager,
  ValidatorInfo,
  VibeScore
} from './consensus';

// Storage
export { Storage, StorageConfig } from './storage/Storage';

// API
export { API, APIConfig } from './api/API';

// Network
export { P2PNetwork, P2PConfig } from './network/P2P';

// Node
export { Node, NodeConfig } from './node/Node';
export { LightNode, LightNodeConfig } from './node/LightNode';

// Network utilities
export { getSeedNodes, getPublicSeedNodes, SEED_NODES, NodeCapability } from './network/SeedNodes';

// Chain validation & security
export {
  ChainValidator,
  ValidationError,
  ValidationResult,
  CONSENSUS_RULES,
  CHECKPOINTS
} from './core/ChainValidator';

// Quick demo when running directly
if (require.main === module) {
  const { Blockchain } = require('./core/Blockchain');
  const { Wallet } = require('./wallet/Wallet');

  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   ██╗   ██╗██╗██████╗ ███████╗ ██████╗ ██████╗ ██╗███╗   ██╗      ║
║   ██║   ██║██║██╔══██╗██╔════╝██╔════╝██╔═══██╗██║████╗  ██║      ║
║   ██║   ██║██║██████╔╝█████╗  ██║     ██║   ██║██║██╔██╗ ██║      ║
║   ╚██╗ ██╔╝██║██╔══██╗██╔══╝  ██║     ██║   ██║██║██║╚██╗██║      ║
║    ╚████╔╝ ██║██████╔╝███████╗╚██████╗╚██████╔╝██║██║ ╚████║      ║
║     ╚═══╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝      ║
║                                                                    ║
║              Code with feeling. Build with passion.                ║
║                     Create with vibes.                             ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
  `);

  // Create blockchain
  console.log('🚀 Initializing VibeCoin blockchain...\n');
  const vibeCoin = new Blockchain();

  // Create wallets
  console.log('👛 Creating wallets...\n');
  const alice = new Wallet();
  const bob = new Wallet();
  const miner = new Wallet();

  console.log(`Alice: ${alice.getShortAddress()}`);
  console.log(`Bob:   ${bob.getShortAddress()}`);
  console.log(`Miner: ${miner.getShortAddress()}\n`);

  // Mine first block (miner gets reward)
  console.log('⛏️  Mining first block...\n');
  vibeCoin.minePendingTransactions(miner.publicKey);

  // Check balances
  console.log('💰 Balances after mining:');
  console.log(`   Miner: ${miner.getBalance(vibeCoin)} VIBE\n`);

  // Miner sends to Alice
  console.log('📤 Miner sending 20 VIBE to Alice...');
  const result = miner.send(vibeCoin, alice.publicKey, 20, 'Welcome to VibeCoin!');
  if (result.success) {
    console.log(`   ✅ Transaction created: ${result.transaction?.id.substring(0, 16)}...\n`);
  }

  // Mine to confirm transaction
  console.log('⛏️  Mining second block...\n');
  vibeCoin.minePendingTransactions(miner.publicKey);

  // Final balances
  console.log('💰 Final balances:');
  console.log(`   Alice: ${alice.getBalance(vibeCoin)} VIBE`);
  console.log(`   Bob:   ${bob.getBalance(vibeCoin)} VIBE`);
  console.log(`   Miner: ${miner.getBalance(vibeCoin)} VIBE\n`);

  // Blockchain stats
  console.log('📊 Blockchain Stats:');
  console.log(vibeCoin.getStats());

  // Validate chain
  console.log(`\n🔐 Blockchain valid: ${vibeCoin.isValid()}`);
}
