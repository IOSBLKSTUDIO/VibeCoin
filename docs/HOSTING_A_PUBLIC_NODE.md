# Héberger un Noeud Public VibeCoin

**Guide ultra-simple pour devenir un hébergeur de noeud VibeCoin**

Ce guide vous permet de faire tourner un noeud VibeCoin accessible à tous sur Internet, même si vous n'êtes pas un expert technique.

---

## Table des Matières

1. [Pourquoi héberger un noeud?](#pourquoi-héberger-un-noeud)
2. [Configuration automatique (recommandé)](#configuration-automatique)
3. [Ouvrir le port sur votre box](#ouvrir-le-port-sur-votre-box)
4. [Lancer le noeud](#lancer-le-noeud)
5. [IP dynamique? Utilisez DuckDNS](#ip-dynamique)
6. [Sécurité intégrée](#sécurité-intégrée)
7. [FAQ](#faq)

---

## Pourquoi héberger un noeud?

```
┌─────────────────────────────────────────────────────────────────┐
│                    AVANTAGES                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   💰 Miner des VIBE          Gagnez des VIBE en minant          │
│   🌍 Décentralisation        Plus de noeuds = réseau plus fort   │
│   🔒 Indépendance            Votre propre copie de la blockchain │
│   🎓 Apprentissage           Comprenez comment fonctionne crypto │
│   🏆 Reconnaissance          Votre noeud dans les seed nodes     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration automatique

### Étape 1: Télécharger VibeCoin

```bash
# Cloner le projet
git clone https://github.com/IOSBLKSTUDIO/VibeCoin.git
cd VibeCoin
```

### Étape 2: Lancer le script de configuration

**Une seule commande fait tout:**

```bash
./scripts/setup-public-node.sh
```

Ce script va automatiquement:
- ✅ Vérifier que Node.js est installé
- ✅ Installer les dépendances
- ✅ Compiler le projet
- ✅ Détecter votre IP publique
- ✅ Créer un wallet (ou charger l'existant)
- ✅ Sauvegarder votre clé privée
- ✅ Créer un script de lancement

**Output exemple:**
```
╔═══════════════════════════════════════════════════════════════════╗
║              PUBLIC NODE SETUP / CONFIGURATION NOEUD PUBLIC       ║
╚═══════════════════════════════════════════════════════════════════╝

[1/6] Vérification des prérequis...
✓ Node.js v20.10.0 détecté

[2/6] Installation des dépendances...
✓ Dépendances installées

[3/6] Compilation du projet...
✓ Projet compilé

[4/6] Détection de votre IP publique...
✓ IP publique: 82.123.45.67

[5/6] Configuration du wallet...
✓ Nouveau wallet créé et sauvegardé
  Adresse: 04a1b2c3d4e5f6g7h8i9j0...

[6/6] Configuration terminée!

╔═══════════════════════════════════════════════════════════════════╗
║                    VOTRE NOEUD EST PRET!                           ║
╚═══════════════════════════════════════════════════════════════════╝

SAUVEGARDEZ VOTRE CLE PRIVEE:

  5Kb8kLf9zgWQnOgU7BqTfH2NvK...

  Stockez-la en lieu sûr (gestionnaire de mots de passe).
  C'est le SEUL moyen de récupérer vos VIBE!
```

---

## Ouvrir le port sur votre box

Pour que d'autres noeuds puissent se connecter à vous, vous devez ouvrir le port **6001** sur votre box Internet.

### Freebox

1. Allez sur **mafreebox.freebox.fr**
2. Connexion avec votre mot de passe admin
3. **Paramètres de la Freebox** → **Mode avancé** → **Gestion des ports**
4. Cliquez **Ajouter une redirection**
5. Remplissez:
   - **IP Destination**: L'IP de votre Mac/PC (ex: 192.168.1.42)
   - **Port début/fin**: 6001
   - **Protocole**: TCP
6. **Sauvegarder**

### Livebox (Orange)

1. Allez sur **192.168.1.1**
2. Connexion (mot de passe sur l'étiquette de la box)
3. **Configuration avancée** → **NAT/PAT**
4. **Ajouter**
5. Remplissez:
   - **Nom**: VibeCoin
   - **Port interne/externe**: 6001
   - **Protocole**: TCP
   - **Équipement**: Votre Mac/PC
6. **Enregistrer**

### Bbox (Bouygues)

1. Allez sur **192.168.1.254**
2. **Services de la box** → **Pare-feu et règles NAT**
3. **Règles NAT** → **Ajouter une règle**
4. Remplissez:
   - **Port externe**: 6001
   - **IP locale**: Votre Mac/PC
   - **Port local**: 6001
5. **Appliquer**

### SFR Box

1. Allez sur **192.168.1.1**
2. **Réseau** → **NAT**
3. **Ajouter une règle**
4. Remplissez:
   - **Service**: VibeCoin
   - **Port externe**: 6001
   - **Appareil**: Votre Mac/PC
   - **Port interne**: 6001
6. **Valider**

### Tester que le port est ouvert

1. Lancez votre noeud (voir section suivante)
2. Allez sur **https://canyouseeme.org**
3. Entrez le port **6001**
4. Cliquez **Check Port**
5. Vous devriez voir: **Success: I can see your service on port 6001**

---

## Lancer le noeud

### Méthode simple

```bash
./scripts/start-node.sh
```

### Options disponibles

```bash
# Noeud complet avec minage (défaut)
./scripts/start-node.sh

# Mode léger (économe en ressources)
./scripts/start-node.sh --light

# Sans minage
./scripts/start-node.sh --no-mine
```

### Lancer en arrière-plan (24/7)

**macOS:**
```bash
# Créer un service qui démarre automatiquement
cat > ~/Library/LaunchAgents/com.vibecoin.node.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.vibecoin.node</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>~/.vibecoin/start-node.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/vibecoin.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/vibecoin.err</string>
</dict>
</plist>
EOF

# Activer
launchctl load ~/Library/LaunchAgents/com.vibecoin.node.plist

# Voir les logs
tail -f /tmp/vibecoin.log
```

**Linux:**
```bash
# Avec screen
screen -S vibecoin
./scripts/start-node.sh
# Ctrl+A, D pour détacher

# Ou avec systemd
sudo nano /etc/systemd/system/vibecoin.service
# Coller la configuration, puis:
sudo systemctl enable vibecoin
sudo systemctl start vibecoin
```

---

## IP dynamique?

Si votre IP publique change (la plupart des connexions résidentielles), utilisez un DNS dynamique gratuit.

### DuckDNS (recommandé, gratuit)

1. Allez sur **https://www.duckdns.org**
2. Connectez-vous avec Google/GitHub
3. Créez un sous-domaine (ex: `mon-vibecoin`)
4. Notez votre **token**
5. Configurez la mise à jour automatique:

**macOS/Linux:**
```bash
# Créer le script de mise à jour
mkdir -p ~/.duckdns
cat > ~/.duckdns/duck.sh << 'EOF'
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=MON-DOMAINE&token=MON-TOKEN&ip=" | curl -k -o ~/.duckdns/duck.log -K -
EOF

# Remplacez MON-DOMAINE et MON-TOKEN
nano ~/.duckdns/duck.sh

chmod +x ~/.duckdns/duck.sh

# Ajouter au cron (mise à jour toutes les 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/.duckdns/duck.sh >/dev/null 2>&1") | crontab -
```

Maintenant les autres noeuds peuvent vous trouver via:
```
mon-vibecoin.duckdns.org:6001
```

---

## Sécurité intégrée

VibeCoin inclut des protections automatiques. **Vous n'avez rien à configurer.**

### Protection DDoS

```
┌─────────────────────────────────────────────────────────────────┐
│                    SÉCURITÉ AUTOMATIQUE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Rate Limiting                                                  │
│   └── Max 10 messages/seconde par peer                          │
│   └── Messages trop gros rejetés (>1MB)                         │
│                                                                  │
│   Connexions                                                     │
│   └── Max 3 connexions par IP                                   │
│   └── Max 5 tentatives de connexion par minute                  │
│                                                                  │
│   Bannissement automatique                                       │
│   └── Blocs invalides: -5 points                                │
│   └── Transactions invalides: -2 points                         │
│   └── Spam: -1 point                                            │
│   └── Score < -10 = Banni 24h                                   │
│                                                                  │
│   Validation blockchain                                          │
│   └── Règles de consensus immuables                             │
│   └── Checkpoints vérifiés                                      │
│   └── Impossible de falsifier des blocs                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Personne ne peut tricher

Même les créateurs de VibeCoin ne peuvent pas:
- Créer des VIBE à partir de rien
- Modifier des blocs passés
- Dépenser les VIBE des autres
- Contourner le halving

Pourquoi? Parce que **votre noeud vérifie tout**. Si quelqu'un envoie un bloc invalide, votre noeud le rejette automatiquement.

---

## FAQ

### Combien de VIBE puis-je gagner?

En minant, vous gagnez **50 VIBE** par bloc (récompense actuelle). Un bloc est miné environ toutes les 10 secondes quand il y a des transactions en attente.

### Mon ordinateur doit-il rester allumé 24/7?

Non, mais plus vous êtes en ligne, plus vous minez. Vous pouvez l'éteindre quand vous voulez - votre wallet et vos VIBE restent intacts.

### Que se passe-t-il si j'éteins mon ordinateur?

Rien de grave. Au prochain démarrage, votre noeud se synchronisera automatiquement avec le réseau et récupérera les blocs manqués.

### Est-ce que ça consomme beaucoup de ressources?

- **Full Node**: ~100-500MB RAM, CPU moyen
- **Light Node**: ~50MB RAM, CPU minimal

### Mon IP change souvent, c'est un problème?

Utilisez DuckDNS (gratuit) comme expliqué ci-dessus. Les autres noeuds pourront toujours vous trouver.

### Comment devenir un seed node officiel?

1. Faites tourner votre noeud de manière stable pendant au moins 1 mois
2. Ouvrez une issue sur GitHub avec:
   - Votre adresse (IP ou domaine DuckDNS)
   - Votre uptime
   - Votre région
3. Nous l'ajouterons à la liste des seed nodes!

### J'ai perdu ma clé privée, puis-je récupérer mes VIBE?

Non. Votre clé privée est le **seul** moyen d'accéder à vos VIBE. C'est pourquoi il est crucial de la sauvegarder.

### Comment voir mes VIBE?

```bash
# Via l'API de votre noeud
curl http://localhost:3000/address/VOTRE_ADRESSE_PUBLIQUE/balance
```

---

## Résumé: 5 étapes pour devenir hébergeur

```
1. git clone https://github.com/IOSBLKSTUDIO/VibeCoin.git
2. cd VibeCoin
3. ./scripts/setup-public-node.sh
4. Ouvrir le port 6001 sur votre box
5. ./scripts/start-node.sh
```

**C'est tout!** Vous faites maintenant partie du réseau décentralisé VibeCoin.

---

## Support

- **GitHub Issues**: https://github.com/IOSBLKSTUDIO/VibeCoin/issues
- **Documentation**: https://github.com/IOSBLKSTUDIO/VibeCoin/docs

---

**Merci de contribuer à la décentralisation de VibeCoin!**

*Chaque noeud rend le réseau plus fort.*
