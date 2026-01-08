# VibeCoin Security Guide

## Private Key Management

**NEVER expose your private key in logs, code, or public files.**

### For Cloud Deployments (Render, Heroku, etc.)

1. **Go to your Render Dashboard**
2. Navigate to your VibeCoin service
3. Click **Environment** in the left menu
4. Add a new environment variable:
   - **Key**: `MINER_PRIVATE_KEY`
   - **Value**: Your 64-character private key
5. Click **Save Changes**
6. Redeploy your service

### Generating a New Private Key Securely

If your key was exposed, generate a new one:

```bash
# On your local machine (NOT on a cloud server)
node -e "const ec = new (require('elliptic').ec)('secp256k1'); console.log(ec.genKeyPair().getPrivate('hex'));"
```

Or use the CLI:
```bash
node dist/cli.js --wallet new
# The key is saved to ~/.vibecoin/wallet.key
cat ~/.vibecoin/wallet.key
```

### Security Best Practices

1. **Never log private keys** - Only log public addresses
2. **Use environment variables** - Never hardcode keys in source code
3. **Rotate exposed keys immediately** - If a key was exposed, consider it compromised
4. **Backup securely** - Store keys in a password manager or encrypted file
5. **Different keys per environment** - Use different wallets for testnet and mainnet

### If Your Key Was Exposed

1. **Stop using the exposed key immediately**
2. Generate a new wallet with a fresh private key
3. Transfer any remaining funds to the new wallet
4. Update your environment variables with the new key
5. Redeploy your application

### Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `MINER_PRIVATE_KEY` | Your 64-character hex private key |
| `SEED_PEERS` | Comma-separated list of peer addresses |
| `PORT` | HTTP API port (default: 3000) |
| `P2P_PORT` | P2P WebSocket port (default: 6001) |
| `DATA_DIR` | Blockchain data directory |

### Example Render Configuration

In your Render dashboard environment variables:

```
MINER_PRIVATE_KEY=your_64_char_private_key_here
SEED_PEERS=vibecoin.onrender.com:6001
PORT=3000
```

**Remember**: Environment variables in Render are encrypted and not visible in logs.
