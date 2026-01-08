# VibeCoin (VIBE)

<div align="center">

![VibeCoin Logo](https://img.shields.io/badge/VIBE-VibeCoin-blueviolet?style=for-the-badge&logo=bitcoin&logoColor=white)

**The First Cryptocurrency Born from the VibeCoding Movement**

*La Première Cryptomonnaie Issue du Mouvement VibeCoding*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/IOSBLKSTUDIO/VibeCoin?style=social)](https://github.com/IOSBLKSTUDIO/VibeCoin)

[English](#english) | [Français](#français)

</div>

---

# English

## What is VibeCoin?

**VibeCoin (VIBE)** is not just another cryptocurrency. It's a revolutionary digital asset that embodies the spirit of the **VibeCoding** movement — a philosophy where coding transcends mere syntax and becomes an art form driven by intuition, creativity, and flow state.

In a world where developers are often reduced to code factories, VibeCoding emerged as a counter-movement: **code with feeling, build with passion, create with vibes**. VibeCoin is the financial backbone of this philosophy.

## The VibeCoding Philosophy

VibeCoding is more than a coding style — it's a mindset:

- **Flow Over Force**: Write code when inspiration strikes, not just when deadlines demand
- **Intuition-Driven Development**: Trust your developer instincts
- **Creative Expression**: Every line of code is a brushstroke on a digital canvas
- **Community Harmony**: Build together, vibe together, grow together
- **Minimal Friction**: Tools should enhance creativity, not hinder it

## Why VibeCoin?

### The Problem We Solve

The current crypto landscape is dominated by:
- Complex, intimidating projects that exclude newcomers
- Speculative tokens with no real community value
- Technical barriers that contradict the spirit of decentralization

### Our Solution

VibeCoin creates an **inclusive ecosystem** where:
- **Creators are rewarded** for their contributions, not just their capital
- **Learning is incentivized** through our "Proof of Vibe" mechanism
- **Community drives value**, not market manipulation
- **Simplicity meets sophistication** in our technical design

## Core Concepts

### Proof of Vibe (PoV)

Unlike traditional Proof of Work or Proof of Stake, our **Proof of Vibe** consensus mechanism rewards:

| Activity | VIBE Reward |
|----------|-------------|
| Open source contributions | High |
| Community mentoring | High |
| Educational content creation | Medium |
| Bug reporting & fixes | Medium |
| Community engagement | Low |

### The Vibe Economy

```
┌─────────────────────────────────────────────────────────────┐
│                    VIBE ECOSYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│   │  CREATORS   │───▶│   VIBE      │◀───│  LEARNERS   │    │
│   │  Developers │    │   TOKEN     │    │  Students   │    │
│   │  Artists    │    │             │    │  Newcomers  │    │
│   └─────────────┘    └──────┬──────┘    └─────────────┘    │
│                             │                               │
│                             ▼                               │
│                    ┌─────────────┐                          │
│                    │  COMMUNITY  │                          │
│                    │  Governance │                          │
│                    │  DAO        │                          │
│                    └─────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Token Economics

| Property | Value |
|----------|-------|
| **Name** | VibeCoin |
| **Symbol** | VIBE |
| **Total Supply** | 21,000,000 VIBE |
| **Initial Distribution** | Community: 60% / Team: 15% / Development: 15% / Reserve: 10% |
| **Block Time** | ~10 seconds |
| **Consensus** | Proof of Vibe (PoV) |
| **Decimals** | 8 |

### Distribution Breakdown

```
Community Rewards    ████████████████████████░░░░░░░░░░░░░░░░  60%
Team & Founders      ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  15%
Development Fund     ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  15%
Emergency Reserve    ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  10%
```

## Use Cases

### 1. Creator Economy
- Tip developers for helpful open-source code
- Fund creative coding projects
- Reward educational content creators

### 2. Learning Platform
- Earn VIBE by completing coding challenges
- Stake VIBE to access premium tutorials
- Mentorship marketplace

### 3. Governance
- Vote on project direction
- Propose new features
- Community treasury management

### 4. NFT Marketplace
- Mint code snippets as NFTs
- Trade creative coding art
- Collectible developer achievements

## Roadmap

### Phase 1: Foundation (Q1 2025)
- [x] Project initialization
- [ ] Core blockchain development
- [ ] Basic wallet implementation
- [ ] Testnet launch

### Phase 2: Growth (Q2 2025)
- [ ] Smart contract engine
- [ ] Web wallet release
- [ ] Mobile wallet (iOS/Android)
- [ ] DEX listing

### Phase 3: Ecosystem (Q3 2025)
- [ ] DAO governance launch
- [ ] Creator rewards program
- [ ] Learning platform beta
- [ ] Partnership announcements

### Phase 4: Mainstream (Q4 2025)
- [ ] Mainnet launch
- [ ] CEX listings
- [ ] NFT marketplace
- [ ] Global marketing campaign

## Technical Architecture

```
VibeCoin/
├── blockchain/           # Core blockchain engine
│   ├── block.js          # Block structure
│   ├── chain.js          # Chain management
│   ├── consensus.js      # Proof of Vibe algorithm
│   └── network/          # P2P networking
├── wallet/               # Wallet implementations
│   ├── core/             # Core wallet logic
│   ├── web/              # Web wallet UI
│   └── cli/              # Command-line wallet
├── contracts/            # Smart contract system
│   ├── engine/           # Contract execution engine
│   └── examples/         # Sample contracts
├── mining/               # Mining/Validation tools
├── api/                  # REST API for integrations
└── docs/                 # Technical documentation
```

## Getting Started

```bash
# Clone the repository
git clone https://github.com/IOSBLKSTUDIO/VibeCoin.git
cd VibeCoin

# Install dependencies
npm install

# Build
npm run build
```

## Run Your Own Node

Join the decentralized network by running your own node on your Mac or PC!

### Full Node (Mining)

Full nodes store the complete blockchain and can mine new blocks to earn VIBE.

```bash
# Create a new wallet and start mining
node dist/cli.js --mine --miner new --network testnet

# Or use an existing wallet
node dist/cli.js --mine --miner "your-private-key" --network testnet
```

**Important**: Save your private key! It's the only way to restore your wallet.

### Light Node (Eco Mode)

Light nodes use minimal resources - perfect for laptops or low-power devices.

```bash
node dist/cli.js --light --network testnet
```

Benefits:
- ~99% less storage (headers only)
- Minimal CPU usage
- Can send/receive transactions
- Eco-friendly

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--network` | mainnet, testnet, local | testnet |
| `--mine` | Enable mining | false |
| `--miner` | Private key or "new" | - |
| `--light` | Eco-friendly light mode | false |
| `--api-port` | REST API port | 3000 |
| `--p2p-port` | P2P network port | 6001 |
| `--peers` | Connect to specific peers | - |

### Wallet Backup & Restore

Your VIBE are stored in the blockchain, not on your computer. To restore your wallet anywhere:

```bash
node dist/cli.js --mine --miner "your-saved-private-key" --network testnet
```

The node will sync with the network and your balance will be restored automatically.

### Become a Public Node Host

Want to help decentralize VibeCoin? Host a public node accessible to everyone!

```bash
# One-command setup
./scripts/setup-public-node.sh

# Then just start your node
./scripts/start-node.sh
```

The script handles everything: wallet creation, configuration, and provides clear instructions for port forwarding.

**[Complete Hosting Guide (FR)](docs/HOSTING_A_PUBLIC_NODE.md)**

### Network Security

VibeCoin includes automatic protection against attacks:

| Protection | Description |
|------------|-------------|
| Rate Limiting | Max 10 messages/second per peer |
| Connection Limits | Max 3 connections per IP |
| Auto-Ban | Bad actors banned for 24 hours |
| Chain Validation | Immutable consensus rules |
| Peer Scoring | +1 valid block, -5 invalid block |

**Nobody can cheat** - not even the creators. Every node validates every block independently.

### Full Documentation

For complete setup guide, cloud deployment, and troubleshooting:

**[Read the Full Node Documentation](docs/RUNNING_A_NODE.md)**

---

# Français

## Qu'est-ce que VibeCoin ?

**VibeCoin (VIBE)** n'est pas une cryptomonnaie comme les autres. C'est un actif numérique révolutionnaire qui incarne l'esprit du mouvement **VibeCoding** — une philosophie où le code transcende la simple syntaxe pour devenir un art guidé par l'intuition, la créativité et l'état de flow.

Dans un monde où les développeurs sont souvent réduits à de simples usines à code, le VibeCoding a émergé comme un contre-mouvement : **coder avec émotion, construire avec passion, créer avec des vibes**.

## La Philosophie VibeCoding

Le VibeCoding est plus qu'un style de programmation — c'est un état d'esprit :

- **Le Flow avant la Force** : Écrire du code quand l'inspiration frappe
- **Développement Guidé par l'Intuition** : Faire confiance à son instinct de développeur
- **Expression Créative** : Chaque ligne de code est un coup de pinceau sur une toile numérique
- **Harmonie Communautaire** : Construire ensemble, vibrer ensemble, grandir ensemble
- **Friction Minimale** : Les outils doivent amplifier la créativité, pas l'entraver

## Pourquoi VibeCoin ?

### Le Problème que Nous Résolvons

Le paysage crypto actuel est dominé par :
- Des projets complexes et intimidants qui excluent les nouveaux venus
- Des tokens spéculatifs sans vraie valeur communautaire
- Des barrières techniques qui contredisent l'esprit de décentralisation

### Notre Solution

VibeCoin crée un **écosystème inclusif** où :
- **Les créateurs sont récompensés** pour leurs contributions, pas seulement leur capital
- **L'apprentissage est incité** via notre mécanisme "Proof of Vibe"
- **La communauté génère la valeur**, pas la manipulation de marché
- **La simplicité rencontre la sophistication** dans notre design technique

## Concepts Clés

### Proof of Vibe (PoV) - Preuve de Vibe

Contrairement au Proof of Work ou Proof of Stake traditionnels, notre mécanisme de consensus **Proof of Vibe** récompense :

| Activité | Récompense VIBE |
|----------|-----------------|
| Contributions open source | Élevée |
| Mentorat communautaire | Élevée |
| Création de contenu éducatif | Moyenne |
| Signalement & correction de bugs | Moyenne |
| Engagement communautaire | Faible |

## Tokenomics

| Propriété | Valeur |
|-----------|--------|
| **Nom** | VibeCoin |
| **Symbole** | VIBE |
| **Supply Total** | 21 000 000 VIBE |
| **Distribution Initiale** | Communauté: 60% / Équipe: 15% / Développement: 15% / Réserve: 10% |
| **Temps de Bloc** | ~10 secondes |
| **Consensus** | Proof of Vibe (PoV) |

## Cas d'Usage

### 1. Économie des Créateurs
- Donner des pourboires aux développeurs pour leur code open-source
- Financer des projets de creative coding
- Récompenser les créateurs de contenu éducatif

### 2. Plateforme d'Apprentissage
- Gagner des VIBE en complétant des défis de code
- Staker des VIBE pour accéder aux tutoriels premium
- Marketplace de mentorat

### 3. Gouvernance
- Voter sur la direction du projet
- Proposer de nouvelles fonctionnalités
- Gestion de la trésorerie communautaire

### 4. Marketplace NFT
- Mint des snippets de code en NFT
- Échanger de l'art de creative coding
- Achievements développeur collectibles

## Feuille de Route

### Phase 1 : Fondation (T1 2025)
- [x] Initialisation du projet
- [ ] Développement du blockchain core
- [ ] Implémentation wallet basique
- [ ] Lancement testnet

### Phase 2 : Croissance (T2 2025)
- [ ] Moteur de smart contracts
- [ ] Release wallet web
- [ ] Wallet mobile (iOS/Android)
- [ ] Listing DEX

### Phase 3 : Écosystème (T3 2025)
- [ ] Lancement gouvernance DAO
- [ ] Programme récompenses créateurs
- [ ] Plateforme d'apprentissage beta
- [ ] Annonces partenariats

### Phase 4 : Grand Public (T4 2025)
- [ ] Lancement mainnet
- [ ] Listings CEX
- [ ] Marketplace NFT
- [ ] Campagne marketing globale

## Lancer Votre Propre Nœud

Rejoignez le réseau décentralisé en lançant votre propre nœud sur votre Mac ou PC !

### Full Node (Minage)

Les full nodes stockent la blockchain complète et peuvent miner des blocs pour gagner des VIBE.

```bash
# Créer un nouveau wallet et commencer à miner
node dist/cli.js --mine --miner new --network testnet

# Ou utiliser un wallet existant
node dist/cli.js --mine --miner "votre-clé-privée" --network testnet
```

**Important** : Sauvegardez votre clé privée ! C'est le seul moyen de restaurer votre wallet.

### Light Node (Mode Éco)

Les light nodes utilisent un minimum de ressources - parfait pour les laptops.

```bash
node dist/cli.js --light --network testnet
```

Avantages :
- ~99% moins de stockage (headers uniquement)
- Utilisation CPU minimale
- Peut envoyer/recevoir des transactions
- Éco-responsable

### Options CLI

| Option | Description | Défaut |
|--------|-------------|--------|
| `--network` | mainnet, testnet, local | testnet |
| `--mine` | Activer le minage | false |
| `--miner` | Clé privée ou "new" | - |
| `--light` | Mode éco light node | false |
| `--api-port` | Port API REST | 3000 |
| `--p2p-port` | Port réseau P2P | 6001 |
| `--peers` | Se connecter à des peers spécifiques | - |

### Sauvegarde & Restauration du Wallet

Vos VIBE sont stockés dans la blockchain, pas sur votre ordinateur. Pour restaurer votre wallet n'importe où :

```bash
node dist/cli.js --mine --miner "votre-clé-privée-sauvegardée" --network testnet
```

Le nœud se synchronisera avec le réseau et votre solde sera restauré automatiquement.

### Devenir Hébergeur de Nœud Public

Vous voulez aider à décentraliser VibeCoin ? Hébergez un nœud public accessible à tous !

```bash
# Configuration en une commande
./scripts/setup-public-node.sh

# Puis lancez votre nœud
./scripts/start-node.sh
```

Le script gère tout : création du wallet, configuration, et fournit des instructions claires pour le port forwarding.

**[Guide Complet d'Hébergement](docs/HOSTING_A_PUBLIC_NODE.md)**

### Sécurité du Réseau

VibeCoin inclut une protection automatique contre les attaques :

| Protection | Description |
|------------|-------------|
| Rate Limiting | Max 10 messages/seconde par peer |
| Limite Connexions | Max 3 connexions par IP |
| Bannissement Auto | Mauvais acteurs bannis 24h |
| Validation Chaîne | Règles de consensus immuables |
| Score Pairs | +1 bloc valide, -5 bloc invalide |

**Personne ne peut tricher** - même pas les créateurs. Chaque nœud valide chaque bloc indépendamment.

### Documentation Complète

Pour le guide complet, déploiement cloud et dépannage :

**[Lire la Documentation Complète](docs/RUNNING_A_NODE.md)**

---

## Contributing / Contribuer

VibeCoin is open source and welcomes contributions from the vibeCoding community.

VibeCoin est open source et accueille les contributions de la communauté vibeCoding.

```bash
# Fork the repo / Forker le repo
# Create your branch / Créer votre branche
git checkout -b feature/amazing-feature

# Commit your changes / Commiter vos changements
git commit -m "Add amazing feature"

# Push and create PR / Pousser et créer une PR
git push origin feature/amazing-feature
```

## Community / Communauté

- **GitHub**: [IOSBLKSTUDIO/VibeCoin](https://github.com/IOSBLKSTUDIO/VibeCoin)
- **Twitter/X**: Coming soon
- **Discord**: Coming soon
- **Telegram**: Coming soon

## License / Licence

MIT License - Built with vibes by **BLKSTUDIO**

---

<div align="center">

**"Code with feeling. Build with passion. Create with vibes."**

*"Coder avec émotion. Construire avec passion. Créer avec des vibes."*

</div>
