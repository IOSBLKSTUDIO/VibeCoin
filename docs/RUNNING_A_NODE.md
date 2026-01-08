# Running a VibeCoin Node

Run your own VibeCoin node on your Mac or PC and join the decentralized network!

## Why Run a Node?

- **Decentralization**: Every node strengthens the network
- **Security**: Help validate transactions and blocks
- **Privacy**: No need to trust third parties
- **Earn VIBE**: Mining nodes earn rewards
- **Support the network**: Be part of the VibeCoin community

## Quick Start

### One-Line Installation

**Mac/Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/IOSBLKSTUDIO/VibeCoin/master/scripts/install.sh | bash
```

**Windows (PowerShell as Admin):**
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/IOSBLKSTUDIO/VibeCoin/master/scripts/install.ps1'))
```

After installation:
```bash
# Start a node
vibecoin-node

# Or start a mining node (earn VIBE!)
vibecoin-mine
```

## Manual Installation

### Prerequisites

- Node.js 18+ ([download](https://nodejs.org))
- Git ([download](https://git-scm.com))

### Steps

```bash
# Clone the repository
git clone https://github.com/IOSBLKSTUDIO/VibeCoin.git
cd VibeCoin

# Install dependencies
npm install

# Build
npm run build

# Run a node
node dist/cli.js --network testnet
```

## Node Types

### Full Node (Default)
Stores the complete blockchain and can mine new blocks.

```bash
vibecoin --network testnet
```

Features:
- Complete blockchain storage
- Can mine new blocks
- REST API for applications
- Full transaction validation

### Light Node (Eco Mode)
Minimal resource usage, perfect for laptops and low-power devices.

```bash
vibecoin --light --network testnet
```

Features:
- Stores only block headers (~99% less storage)
- Very low CPU usage (no mining)
- Can send and receive transactions
- SPV (Simplified Payment Verification)
- Perfect for mobile/laptop users

## CLI Options

```
--network <network>   Network: mainnet, testnet, local (default: testnet)
--data <dir>          Data directory (default: ./data)
--api-port <port>     REST API port (default: 3000)
--p2p-port <port>     P2P port (default: 6001)
--peers <addresses>   Additional peers (comma-separated)
--external <address>  External address for NAT traversal
--light               Run in eco-friendly light mode
--mine                Enable mining (full node only)
--miner <key>         Miner private key or "new" for new wallet
```

## Examples

### Basic Node
```bash
vibecoin --network testnet
```

### Mining Node
```bash
# Generate new wallet and start mining
vibecoin --mine --miner new

# Use existing wallet
vibecoin --mine --miner "your-private-key"
```

### Connect to Specific Peers
```bash
vibecoin --peers "192.168.1.10:6001,node.example.com:6001"
```

### Run Multiple Local Nodes
```bash
# Terminal 1
vibecoin --api-port 3000 --p2p-port 6001

# Terminal 2
vibecoin --api-port 3001 --p2p-port 6002 --peers "localhost:6001"

# Terminal 3
vibecoin --api-port 3002 --p2p-port 6003 --peers "localhost:6001,localhost:6002"
```

### Behind NAT/Firewall
```bash
# If you have port forwarding set up
vibecoin --external "your-public-ip:6001"

# Or using a dynamic DNS
vibecoin --external "my-node.dyndns.org:6001"
```

## API Endpoints (Full Node)

Once running, access the REST API at `http://localhost:3000`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/info` | GET | Node information |
| `/stats` | GET | Blockchain statistics |
| `/blocks` | GET | List blocks |
| `/blocks/:index` | GET | Get block by index |
| `/blocks/latest` | GET | Latest block |
| `/transactions/pending` | GET | Pending transactions |
| `/transactions` | POST | Submit transaction |
| `/address/:addr/balance` | GET | Get balance |
| `/mine` | POST | Mine a block |
| `/wallet/new` | POST | Create wallet |
| `/faucet` | POST | Get testnet VIBE |

## Network Ports

| Port | Protocol | Description |
|------|----------|-------------|
| 3000 | HTTP | REST API |
| 6001 | WebSocket | P2P Network |

Make sure these ports are accessible if you want other nodes to connect to you.

## Data Storage

Default locations:
- **Mac/Linux**: `~/.vibecoin/data/`
- **Windows**: `%USERPROFILE%\.vibecoin\data\`

Structure:
```
data/
├── testnet/
│   ├── chaindata/     # Blockchain database
│   └── wallets/       # Saved wallets
└── mainnet/
    └── ...
```

## Eco-Friendly Tips

VibeCoin uses **Proof of Vibe** - a more eco-friendly consensus mechanism than traditional Proof of Work.

To minimize your environmental impact:

1. **Use Light Mode**: `--light` uses ~99% less storage and minimal CPU
2. **Disable Mining**: Only mine if you want to earn VIBE
3. **Close When Not Needed**: The network has enough nodes to survive

## Troubleshooting

### Can't Connect to Peers
- Check your firewall allows port 6001
- Try adding specific peers: `--peers "seed.vibecoin.network:6001"`
- Check your internet connection

### Sync Taking Forever
- This is normal for first sync
- Use `--light` mode for faster sync
- Check you're on the right network

### Port Already in Use
- Change ports: `--api-port 3001 --p2p-port 6002`
- Check for other VibeCoin instances

### Out of Disk Space
- Use light mode: `--light`
- Change data directory: `--data /path/with/space`

## Wallet Management

### Creating a Wallet

When you start mining, a new wallet is automatically created:

```bash
node dist/cli.js --mine --miner new --network testnet
```

You'll see output like:
```
🔑 New Miner Wallet Created
   Address: 04a1b2c3d4...
   Private Key: 5Kb8kLf9zgWQnOgU...

⚠️  SAVE YOUR PRIVATE KEY! This is the ONLY way to restore your wallet.
```

### Backing Up Your Wallet

**CRITICAL**: Your private key is the ONLY thing you need to backup.

Save it somewhere secure:
- Password manager (recommended)
- Encrypted file
- Written on paper in a safe

**Never share your private key with anyone!**

### Restoring Your Wallet

You can restore your wallet on any computer, anytime:

```bash
# Use your saved private key
node dist/cli.js --mine --miner "5Kb8kLf9zgWQnOgU..." --network testnet
```

Your VIBE balance is stored in the blockchain, not on your computer. When you restore:
1. The node connects to the network
2. Downloads the latest blockchain from peers
3. Your balance is automatically calculated from the blockchain

**Even if years pass and millions of blocks are mined, your VIBE are safe as long as you have your private key.**

## How Synchronization Works

### First Start (No Local Blockchain)

```
┌─────────────────┐         ┌─────────────────┐
│   Your Node     │         │   Other Nodes   │
│   (Height: 0)   │◀───────▶│   (Height: 500) │
└─────────────────┘         └─────────────────┘
        │                           │
        │    1. Connect to peers    │
        │◀─────────────────────────▶│
        │                           │
        │    2. Request blocks      │
        │─────────────────────────▶ │
        │                           │
        │    3. Receive & validate  │
        │◀───────────────────────── │
        │                           │
        ▼                           │
┌─────────────────┐                 │
│   Your Node     │                 │
│   (Height: 500) │ ← Synced!       │
└─────────────────┘                 │
```

### Restart (With Local Blockchain)

If your node has blockchain data saved locally:
1. Loads blockchain from disk (instant)
2. Connects to peers
3. Downloads only NEW blocks since last run
4. Continues normally

### What Gets Synchronized

| Data | Synced? | Details |
|------|---------|---------|
| Blocks | ✅ Yes | All blocks from genesis to latest |
| Transactions | ✅ Yes | Included in blocks |
| Balances | ✅ Yes | Calculated from transactions |
| Pending TX | ✅ Yes | Shared between connected nodes |
| Your Private Key | ❌ No | Never shared, never leaves your device |

## Cloud Deployment (Render, Heroku, etc.)

### The Challenge

Cloud platforms like Render use **ephemeral storage** - your data is lost on each deployment.

### Solution: Environment Variables

Set these in your cloud dashboard:

| Variable | Description | Example |
|----------|-------------|---------|
| `MINER_PRIVATE_KEY` | Your wallet private key | `5Kb8kLf9zgWQn...` |
| `SEED_PEERS` | Nodes to sync from | `192.168.1.10:6001` |
| `PORT` | API port | `3000` |
| `P2P_PORT` | P2P port | `6001` |

### Render.com Setup

1. Create a new Web Service
2. Connect your GitHub repo
3. Set build command: `npm install && npm run build`
4. Set start command: `npm run start`
5. Add environment variables:
   - `MINER_PRIVATE_KEY` = your private key
   - `SEED_PEERS` = ip:port of your home node (optional)

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VibeCoin Network                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌─────────────┐              ┌─────────────┐          │
│   │  Your Home  │◀────────────▶│   Render    │          │
│   │  Mac/PC     │   P2P Sync   │   Server    │          │
│   │  (24/7)     │              │             │          │
│   │             │              │             │          │
│   │  Primary    │              │  Secondary  │          │
│   │  Storage    │              │  + API      │          │
│   └─────────────┘              └─────────────┘          │
│         ▲                            ▲                   │
│         │                            │                   │
│         ▼                            ▼                   │
│   ┌─────────────┐              ┌─────────────┐          │
│   │  Other      │              │  Other      │          │
│   │  Users      │              │  Users      │          │
│   └─────────────┘              └─────────────┘          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Your home node** = Primary source of truth (persistent storage)
**Render** = Public API + backup node (syncs from home node)
**Other users** = Sync from any available node

### Port Forwarding for Home Node

To let Render (or other nodes) connect to your home node:

1. Find your public IP: `curl ifconfig.me`
2. Open port 6001 on your router (forward to your Mac/PC)
3. Set `SEED_PEERS=your-public-ip:6001` on Render

**Dynamic IP?** Use a free dynamic DNS:
- [DuckDNS](https://duckdns.org) - Free, simple
- [No-IP](https://noip.com) - Free tier available

Then use: `SEED_PEERS=mynode.duckdns.org:6001`

## Security Best Practices

### DO ✅
- Save your private key in a secure location
- Use environment variables for sensitive data
- Keep your node software updated
- Use HTTPS for public APIs

### DON'T ❌
- Share your private key with anyone
- Commit private keys to Git
- Run as root/administrator
- Expose your node without firewall

## Community

- **GitHub**: https://github.com/IOSBLKSTUDIO/VibeCoin
- **Issues**: https://github.com/IOSBLKSTUDIO/VibeCoin/issues

## License

MIT License - Run your node freely!

---

**Every node makes VibeCoin stronger. Thank you for participating!**
