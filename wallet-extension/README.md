# VibeCoin Wallet Extension

Official browser extension wallet for VibeCoin - Send, receive, and stake VIBE tokens.

## Features

- **Create/Import Wallet** - Generate new wallets or import existing ones via private key
- **Secure Storage** - Private keys encrypted with AES-256-GCM using PBKDF2 key derivation
- **Send VIBE** - Transfer tokens to any VibeCoin address
- **Receive** - Display your address for receiving tokens
- **Testnet Faucet** - Claim free VIBE tokens for testing (100 VIBE per 24 hours)
- **Transaction History** - View your recent transactions
- **Settings** - Configure node URL and manage wallet

## Installation

### Chrome / Brave / Edge

1. Download or clone this repository
2. Open your browser and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `wallet-extension` folder
6. The VibeCoin Wallet icon will appear in your browser toolbar

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select the `manifest.json` file from the `wallet-extension` folder

## Usage

### Creating a Wallet

1. Click the VibeCoin icon in your browser toolbar
2. Click **Create New Wallet**
3. Set a strong password (minimum 6 characters)
4. Your wallet is created and ready to use!

### Getting Test Tokens

1. Open the wallet extension
2. Click **Faucet** (💧 icon)
3. Click **Claim Tokens**
4. You'll receive 100 VIBE (claimable once per 24 hours)

### Sending VIBE

1. Click **Send** (↑ icon)
2. Enter the recipient's address
3. Enter the amount to send
4. Click **Send Transaction**

### Importing an Existing Wallet

1. Click **Import Wallet**
2. Paste your private key
3. Set a password to encrypt your wallet locally
4. Your wallet is imported!

## Security

- **Private keys are encrypted** using AES-256-GCM
- **Key derivation** uses PBKDF2 with 100,000 iterations
- **No data leaves your device** - everything is stored locally
- **Password never stored** - only a hash is saved for verification

## Development

### File Structure

```
wallet-extension/
├── manifest.json        # Extension manifest
├── popup.html           # Main UI
├── popup.css            # Styles
├── popup.js             # UI controller
├── background.js        # Service worker
├── icons/               # Extension icons
└── src/
    ├── crypto.js        # Cryptographic functions
    ├── wallet.js        # Wallet management
    └── api.js           # Node API communication
```

### Local Development

The extension works in two modes:

1. **Connected Mode** - Connects to a VibeCoin node (default: `http://localhost:3000`)
2. **Simulation Mode** - If no node is available, uses local storage to simulate transactions

To run with a local node:

```bash
cd /path/to/VibeCoin
npm run node
```

Then open the extension and it will automatically connect.

## Configuration

### Node URL

By default, the extension connects to `http://localhost:3000`. To change:

1. Click the ⚙️ icon in the wallet
2. Update the **Node URL** field
3. Click back to save

## Testnet Notice

This extension is configured for the VibeCoin **Testnet**. Testnet tokens have no real value and are for testing purposes only.

## Support

- GitHub Issues: [IOSBLKSTUDIO/VibeCoin](https://github.com/IOSBLKSTUDIO/VibeCoin/issues)
- Documentation: [VibeCoin Whitepaper](https://github.com/IOSBLKSTUDIO/VibeCoin/blob/master/docs/WHITEPAPER.md)

## License

MIT License - See [LICENSE](../LICENSE) for details.
