# Blog Generator AI

Un générateur automatique d'articles de blog utilisant l'intelligence artificielle. Ce système complet permet de créer des articles optimisés SEO et publiés automatiquement sur WordPress.

## 🎉 Nouveau : Landing Page + Authentification Firebase

L'application dispose maintenant d'une **page d'accueil professionnelle** et d'un système d'**authentification complet** avec Firebase !

- ✅ Landing page moderne style startup
- ✅ Authentification email/mot de passe
- ✅ Connexion avec Google
- ✅ Routes protégées
- ✅ Dashboard utilisateur

## 🚀 Fonctionnalités

- **🔐 Authentification** : Connexion sécurisée avec Firebase (Email + Google)
- **🎨 Landing Page** : Page d'accueil moderne et attractive
- **Recherche intelligente** : Collecte d'informations récentes avec Perplexity AI
- **Plan structuré** : Génération automatique d'un plan détaillé avec GPT-4/GPT-5/Claude/Gemini
- **Rédaction contextualisée** : Chaque section garde le contexte des sections précédentes
- **Optimisation SEO** : Génération automatique des métadonnées et optimisation
- **Publication WordPress** : Création automatique de brouillons WordPress (optionnel)
- **Mode copier-coller** : Affichage de l'article avec métadonnées pour copy-paste manuel
- **Aperçu et HTML** : Visualisation de l'article en mode preview ou code HTML
- **Interface moderne** : Interface web responsive avec suivi en temps réel
- **Multi-AI** : Support OpenAI, Anthropic, Google Gemini, DeepSeek, Qwen, xAI Grok
- **Déploiement facile** : Configuration Railway prête à l'emploi

## 📋 Prérequis

### Clés API requises

1. **🔥 Firebase** : Pour l'authentification et le stockage sécurisé des clés **(REQUIS)**

   - Créer un projet sur [Firebase Console](https://console.firebase.google.com/)
   - Activer Authentication (Email/Password + Google)
   - Activer Firestore Database
   - Créer un compte de service (Service Account)
   - 📖 Voir `FIREBASE_SETUP.txt` et `FIRESTORE_SECURITY_SETUP.md` pour les instructions détaillées

2. **Clés API des utilisateurs** : Stockées de manière sécurisée dans Firestore

   Chaque utilisateur configure ses propres clés API dans la page **Settings** :

   - OpenAI (GPT-4/GPT-5)
   - Perplexity (recherche web)
   - Anthropic Claude (optionnel)
   - Google Gemini (optionnel)
   - DeepSeek, Qwen, Grok (optionnel)
   - Unsplash (images, optionnel)
   - WordPress (publication automatique, optionnel)

   ✅ **Sécurité** : Les clés sont chiffrées dans Firebase et jamais exposées au navigateur

### Configuration WordPress

1. Aller dans **Utilisateurs > Votre profil**
2. Faire défiler jusqu'à "Mots de passe d'application"
3. Créer un nouveau mot de passe d'application
4. Utiliser ce mot de passe (pas votre mot de passe principal)

## 🛠️ Installation

### 1. Cloner le projet

```bash
git clone <repository-url>
cd blog-generator-ai
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration Firebase

**Important : Cette étape est obligatoire pour que l'application fonctionne !**

#### 3.1 Authentication & Firestore

Suivez les instructions détaillées dans `FIREBASE_SETUP.txt` et `FIRESTORE_SECURITY_SETUP.md` :

1. Créer un projet Firebase
2. Activer Authentication (Email + Google)
3. Activer Firestore Database
4. Configurer les règles de sécurité Firestore
5. Créer un compte de service (Service Account)
6. Récupérer les clés de configuration
7. Les ajouter dans `.env.local`

### 4. Configuration des variables d'environnement

Copier le fichier d'exemple et le configurer :

```bash
cp env.example .env.local
```

Modifier `.env.local` avec vos clés :

```env
# Firebase (REQUIS pour l'authentification)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin SDK (REQUIS pour accéder aux clés API des utilisateurs)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optionnel: Port pour le développement local
PORT=3000
```

**Note** : Les clés API des utilisateurs (OpenAI, Perplexity, WordPress, etc.) ne sont plus dans `.env` !  
Chaque utilisateur configure ses propres clés dans la page **Settings** après s'être connecté.

### 5. Démarrer en développement

```bash
npm run dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000)

### 🎯 Navigation de l'application

- **Page d'accueil** (`/`) : Formulaire de génération visible directement
- **Page de génération** (`/generate`) : Dashboard complet (protégé, nécessite connexion)
- **Page Settings** (`/generate/settings`) : Configuration des clés API personnelles

**Flow utilisateur :**

1. Visitez `/` et configurez votre article
2. Cliquez sur "Generate Article"
3. Créez un compte (modal Firebase)
4. Vous êtes redirigé vers `/generate` avec votre configuration
5. **Première utilisation** : Ajoutez vos clés API dans Settings
6. La génération démarre ! 🚀

📖 Voir `NEW_UX_FLOW.txt` et `FIRESTORE_SECURITY_SETUP.md` pour tous les détails

## 🚀 Déploiement sur Railway

### 1. Préparer le repository

Assurez-vous que votre code est dans un repository Git :

```bash
git init
git add .
git commit -m "Initial commit"
```

### 2. Déployer sur Railway

1. Aller sur [Railway](https://railway.app/)
2. Connecter votre repository GitHub
3. Sélectionner le projet
4. Railway détectera automatiquement Next.js

### 3. Configurer les variables d'environnement

Dans le dashboard Railway, aller dans **Variables** et ajouter :

```
# Firebase (REQUIS)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin SDK (REQUIS)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important** :

- N'oubliez pas d'ajouter votre domaine Railway dans les "Authorized domains" de Firebase Authentication !
- Les clés API des utilisateurs seront configurées par chaque utilisateur dans la page Settings

### 4. Déploiement automatique

Railway déploiera automatiquement votre application. Le healthcheck sur `/api/health` vérifiera que tout fonctionne.

## 📖 Utilisation

### Interface Web

1. Ouvrir l'application dans votre navigateur
2. Saisir un sujet d'article (ex: "Les tendances du marketing digital en 2024")
3. **Optionnel** : Cocher "Publier automatiquement sur WordPress"
4. Cliquer sur "Générer l'article"
5. Suivre le progrès en temps réel
6. Une fois terminé :
   - **Si WordPress activé** : Accéder au brouillon WordPress
   - **Si WordPress désactivé** : Copier-coller l'article et les métadonnées

### Processus de génération

1. **Recherche** : Collecte d'informations récentes sur le sujet
2. **Plan** : Génération d'un plan structuré avec 4-6 sections
3. **Rédaction** : Écriture de chaque section avec contexte
4. **SEO** : Génération des métadonnées optimisées
5. **WordPress** : Création du brouillon avec toutes les métadonnées (si activé)

### Mode copier-coller

Quand WordPress n'est pas activé, l'interface affiche :

1. **Métadonnées SEO** avec boutons de copie individuels :

   - Titre SEO (meta title)
   - Description meta
   - Slug URL
   - Mots-clés

2. **Contenu de l'article** avec deux modes :

   - **Aperçu** : Visualisation formatée de l'article
   - **HTML** : Code HTML prêt pour WordPress

3. **Instructions détaillées** pour la publication manuelle

4. **Copie en un clic** : Chaque élément peut être copié individuellement

### API Endpoints

#### `POST /api/generate`

Génère un article complet.

**Body :**

```json
{
  "topic": "Sujet de l'article",
  "publishToWordPress": false
}
```

**Réponse :** Stream SSE avec les étapes de progression

#### `GET /api/health`

Vérifie la configuration et les connexions.

**Réponse :**

```json
{
  "status": "healthy",
  "config": {
    "openai": true,
    "perplexity": true,
    "wordpress": {
      "url": true,
      "username": true,
      "password": true
    }
  },
  "wordpress": {
    "configured": true,
    "connected": true
  }
}
```

## 🏗️ Architecture

```
blog-generator-ai/
├── app/
│   ├── api/
│   │   ├── generate/route.ts         # API principale de génération
│   │   ├── health/route.ts           # Healthcheck
│   │   └── wordpress/
│   │       └── publish/route.ts      # Publication WordPress
│   ├── generate/
│   │   └── page.tsx                  # 🔒 Dashboard de génération (protégé)
│   ├── globals.css                   # Styles globaux
│   ├── layout.tsx                    # Layout avec AuthProvider
│   └── page.tsx                      # 🎨 Landing page marketing
├── components/
│   ├── ArticleDisplay.tsx            # Affichage des articles
│   ├── AuthModal.tsx                 # 🔐 Modal d'authentification
│   └── Sidebar.tsx                   # Navigation sidebar
├── contexts/
│   ├── AuthContext.tsx               # 🔐 Contexte Firebase Auth
│   └── SidebarContext.tsx            # État du sidebar
├── lib/
│   ├── firebase.ts                   # 🔥 Configuration Firebase
│   ├── auth-server.ts                # 🔐 Auth serveur (Firebase Admin)
│   ├── services/
│   │   ├── ai.ts                     # Service AI multi-provider
│   │   ├── research.ts               # Service Perplexity
│   │   ├── outline.ts                # Service GPT Outline
│   │   ├── writer.ts                 # Service GPT Writer
│   │   ├── seo.ts                    # Service GPT SEO
│   │   ├── unsplash.ts               # Service Unsplash Images
│   │   ├── wordpress.ts              # Service WordPress
│   │   ├── userKeys.ts               # 🔒 Gestion clés API (client)
│   │   └── userKeys.server.ts        # 🔒 Gestion clés API (serveur)
│   └── config.ts                     # Configuration centralisée
├── types/
│   └── blog.ts                       # Types TypeScript
├── FIREBASE_SETUP.txt                # 📖 Guide config Firebase Auth
├── FIRESTORE_SECURITY_SETUP.md       # 🔒 Guide config Firestore sécurisé
├── firestore.rules                   # Règles de sécurité Firestore
├── env.example                       # Exemple variables d'environnement
├── package.json
├── next.config.js
├── railway.json                      # Config Railway
├── nixpacks.toml                     # Config Nixpacks
└── README.md
```

### 🔄 Flow de l'application

1. **Landing Page** (`/`) : Utilisateur visite la page d'accueil
2. **Authentification** : Clic sur "Generate Article" → Modal Firebase → Création de compte
3. **Dashboard** (`/generate`) : Redirection automatique après connexion
4. **Configuration** : L'utilisateur ajoute ses clés API dans Settings (première utilisation)
5. **Génération** : Configuration et génération d'article avec les clés API de l'utilisateur
6. **Publication** : WordPress automatique ou copie manuelle

**🔒 Sécurité des clés API** :

- Les clés sont stockées de manière sécurisée dans Firestore
- Chiffrées au repos par Firebase
- Accessibles uniquement par le propriétaire (règles Firestore)
- Jamais exposées au navigateur
- Utilisées uniquement côté serveur pour les appels API

## 🔧 Configuration avancée

### Personnalisation des prompts

Les prompts sont configurables dans chaque service :

- `lib/services/outline.ts` : Prompts pour la génération de plans
- `lib/services/writer.ts` : Prompts pour la rédaction
- `lib/services/seo.ts` : Prompts pour le SEO

### Modèles IA

Par défaut, le système utilise :

- **OpenAI** : `gpt-4-turbo-preview`
- **Perplexity** : `llama-3.1-sonar-small-128k-online`

Ces modèles peuvent être modifiés dans `lib/config.ts`.

### WordPress

Le système supporte :

- Création de catégories et tags automatiques
- Métadonnées Yoast SEO (si installé)
- Images mises en avant (à implémenter)
- Programmation de publication (à implémenter)

## 🐛 Dépannage

### Erreurs communes

**"Missing required environment variables"**

- Vérifier que toutes les variables d'environnement sont définies
- Utiliser `/api/health` pour diagnostiquer

**"WordPress connection failed"**

- Vérifier l'URL WordPress (avec https://)
- Utiliser un mot de passe d'application, pas le mot de passe principal
- Vérifier que l'API REST WordPress est activée

**"OpenAI API error"**

- Vérifier la clé API OpenAI
- Vérifier le quota et les crédits

**"Perplexity API error"**

- Vérifier la clé API Perplexity
- Vérifier les limites de taux

### Logs

Pour déboguer, consulter les logs :

- **Développement** : Console du navigateur + terminal
- **Railway** : Dashboard Railway > Deployments > Logs

## 📈 Optimisations possibles

### Performance

- Mise en cache des résultats de recherche
- Compression des réponses API
- CDN pour les assets statiques

### Fonctionnalités

- Génération d'images avec DALL-E
- Support multilingue
- Templates d'articles personnalisés
- Intégration réseaux sociaux
- Analytics et métriques

### SEO

- Analyse sémantique avancée
- Suggestions de liens internes
- Optimisation des images
- Schema markup

## 📝 Licence

MIT License - voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! Merci de :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📞 Support

Pour obtenir de l'aide :

1. Consulter cette documentation
2. Vérifier les [Issues GitHub](issues)
3. Utiliser l'endpoint `/api/health` pour diagnostiquer les problèmes de configuration

---

**Note** : Ce système est conçu pour générer du contenu de qualité, mais il est recommandé de toujours relire et ajuster les articles générés avant publication.
