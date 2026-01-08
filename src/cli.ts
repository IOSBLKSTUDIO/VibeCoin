#!/usr/bin/env node
/**
 * VibeCoin CLI - Command line interface for running a node
 */
import { Node, NodeConfig } from './node/Node';
import { Wallet } from './wallet/Wallet';

// Parse command line arguments
const args = process.argv.slice(2);
const flags: Record<string, string> = {};

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
    flags[key] = value;
    if (value !== 'true') i++;
  }
}

// Show help
if (flags.help || args.includes('-h')) {
  console.log(`
VibeCoin Node CLI

Usage: npx ts-node src/cli.ts [options]

Options:
  --network <network>   Network to connect to (mainnet, testnet, local)
                        Default: testnet

  --data <dir>          Data directory
                        Default: ./data

  --api-port <port>     REST API port
                        Default: 3000

  --p2p-port <port>     P2P network port
                        Default: 6001

  --peers <addresses>   Comma-separated list of peer addresses
                        Example: --peers "localhost:6002,localhost:6003"

  --mine                Enable automatic mining

  --miner <address>     Miner address (required if --mine is set)
                        Use "new" to generate a new wallet

  --help, -h            Show this help message

Examples:
  # Start a testnet node
  npx ts-node src/cli.ts --network testnet

  # Start a node with mining enabled
  npx ts-node src/cli.ts --mine --miner new

  # Start a second node and connect to first
  npx ts-node src/cli.ts --api-port 3001 --p2p-port 6002 --peers "localhost:6001"

  # Start a local development node
  npx ts-node src/cli.ts --network local --mine --miner new
`);
  process.exit(0);
}

// Build configuration
const config: Partial<NodeConfig> = {
  network: (flags.network as any) || 'testnet',
  dataDir: flags.data || './data',
  api: {
    port: parseInt(flags['api-port']) || 3000,
    host: '0.0.0.0'
  },
  p2p: {
    port: parseInt(flags['p2p-port']) || 6001,
    seedNodes: flags.peers ? flags.peers.split(',').map(s => s.trim()) : []
  },
  mining: {
    enabled: flags.mine === 'true',
    interval: 10000
  }
};

// Handle miner address
if (config.mining?.enabled) {
  if (flags.miner === 'new') {
    const wallet = new Wallet();
    console.log(`
🔐 New Miner Wallet Generated:
   Address:     ${wallet.getShortAddress()}
   Private Key: ${wallet.getPrivateKey()}

   ⚠️  SAVE YOUR PRIVATE KEY! You will need it to access your funds.
`);
    config.mining.address = wallet.publicKey;
  } else if (flags.miner) {
    // Assume it's a private key and import wallet
    try {
      const wallet = new Wallet(flags.miner);
      config.mining.address = wallet.publicKey;
      console.log(`🔐 Using miner address: ${wallet.getShortAddress()}`);
    } catch {
      console.error('❌ Invalid miner address or private key');
      process.exit(1);
    }
  } else {
    console.error('❌ Mining enabled but no miner address provided. Use --miner <address> or --miner new');
    process.exit(1);
  }
}

// Start node
async function main() {
  try {
    const node = new Node(config);
    await node.start();
  } catch (error: any) {
    console.error('❌ Failed to start node:', error.message);
    process.exit(1);
  }
}

main();
