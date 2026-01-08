# VibeCoin - Claude Code Guide

## Project Overview

VibeCoin is a cryptocurrency/altcoin project built from scratch, dedicated to the crypto universe and vibeCoding philosophy.

## Architecture

### Core Components

- **blockchain/**: Core blockchain implementation (blocks, chain, consensus)
- **wallet/**: Wallet application for managing VIBE tokens
- **contracts/**: Smart contract engine and examples
- **mining/**: Mining utilities and Proof of Vibe implementation
- **docs/**: Technical documentation
- **scripts/**: Utility scripts for development and deployment

### Tech Stack

- **Language**: JavaScript/TypeScript (Node.js)
- **Cryptography**: SHA-256, ECDSA
- **Networking**: P2P via WebSocket
- **Storage**: LevelDB for blockchain data

## Development Guidelines

### Coding Standards

- Use ES6+ features
- Follow functional programming patterns where applicable
- Document all public APIs
- Write tests for all critical functionality

### Key Concepts

1. **Block**: Contains transactions, previous hash, timestamp, nonce
2. **Transaction**: Transfer of VIBE between addresses
3. **Proof of Vibe**: Custom consensus mechanism
4. **Wallet**: Manages private/public keys and signs transactions

## Commands

```bash
npm run node    # Start a VibeCoin node
npm run wallet  # Launch wallet CLI
npm run mine    # Start mining
npm test        # Run tests
```

## Token Specs

- Symbol: VIBE
- Total Supply: 21,000,000
- Decimals: 8
- Block Time: ~10 seconds
