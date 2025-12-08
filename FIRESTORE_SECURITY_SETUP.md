# Configuration de Firestore pour le stockage sécurisé des clés API

## 📋 Vue d'ensemble

L'application utilise Firebase Firestore pour stocker de manière sécurisée les clés API de chaque utilisateur. Cette approche garantit que :

✅ Les clés ne sont jamais exposées au navigateur  
✅ Chaque utilisateur ne peut accéder qu'à ses propres clés  
✅ Les clés sont chiffrées au repos dans Firebase  
✅ L'accès est protégé par Firebase Authentication

## 🔧 Étape 1 : Activer Firestore

1. Allez dans la [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet
3. Dans le menu latéral, cliquez sur **Firestore Database**
4. Cliquez sur **Create database**
5. Choisissez le mode **Production**
6. Sélectionnez une région proche de vos utilisateurs (ex: `europe-west1` pour l'Europe)
7. Cliquez sur **Enable**

## 🔒 Étape 2 : Configurer les règles de sécurité

1. Dans Firestore Database, allez dans l'onglet **Rules**
2. Copiez-collez les règles suivantes :

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId);

      // Private subcollection (API keys)
      match /private/{document=**} {
        allow read: if isOwner(userId);
        allow write: if isOwner(userId);
      }
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Cliquez sur **Publish**

## 🔑 Étape 3 : Créer un compte de service Firebase Admin

Firebase Admin SDK est nécessaire pour que votre serveur accède à Firestore de manière sécurisée.

### 3.1 Générer une clé privée

1. Allez dans **Project Settings** (⚙️ en haut à gauche)
2. Cliquez sur l'onglet **Service Accounts**
3. Cliquez sur **Generate new private key**
4. Confirmez en cliquant sur **Generate key**
5. Un fichier JSON sera téléchargé

### 3.2 Extraire les informations

Ouvrez le fichier JSON téléchargé. Vous aurez besoin de deux champs :

- `client_email` : L'email du compte de service
- `private_key` : La clé privée (commence par `-----BEGIN PRIVATE KEY-----`)

### 3.3 Ajouter les variables d'environnement

Dans votre fichier `.env.local`, ajoutez :

```env
# Firebase Admin SDK
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**⚠️ Important :**

- Gardez le fichier JSON en sécurité, ne le commitez JAMAIS dans Git
- La `FIREBASE_PRIVATE_KEY` doit être entourée de guillemets doubles
- Les `\n` dans la clé doivent être conservés

## 📊 Étape 4 : Déployer les règles Firestore

Le fichier `firestore.rules` contient déjà les règles de sécurité. Pour les déployer :

### Option 1 : Via la Firebase Console (recommandé)

Copiez-collez le contenu de `firestore.rules` dans l'interface web comme décrit à l'étape 2.

### Option 2 : Via Firebase CLI

```bash
# Installer Firebase CLI (si pas déjà fait)
npm install -g firebase-tools

# Se connecter à Firebase
firebase login

# Initialiser Firebase dans le projet (si pas déjà fait)
firebase init firestore

# Déployer les règles
firebase deploy --only firestore:rules
```

## 🧪 Étape 5 : Tester

1. Démarrez l'application : `npm run dev`
2. Connectez-vous avec un compte
3. Allez dans **Settings**
4. Ajoutez vos clés API
5. Cliquez sur **Save Settings**
6. Vérifiez dans la Firebase Console > Firestore Database que les données sont bien stockées sous :
   ```
   users/{userId}/private/apiKeys
   ```

## 🔐 Structure des données

Les clés API sont stockées dans Firestore avec la structure suivante :

```
users/
  └── {userId}/
      └── private/
          └── apiKeys/
              ├── openaiKey: "sk-..."
              ├── perplexityKey: "pplx-..."
              ├── anthropicKey: "..."
              ├── geminiKey: "..."
              ├── unsplashKey: "..."
              ├── wordpressUrl: "https://..."
              ├── wordpressUsername: "..."
              ├── wordpressPassword: "..."
              └── updatedAt: "2025-01-15T10:30:00.000Z"
```

## 🛡️ Sécurité

### Ce qui est sécurisé :

✅ Les clés sont stockées dans Firestore (chiffrement au repos)  
✅ Seul le propriétaire peut lire/écrire ses clés (règles Firestore)  
✅ L'accès nécessite une authentification Firebase valide  
✅ Les clés ne sont jamais exposées au client  
✅ Firebase Admin SDK accède aux clés côté serveur uniquement

### Bonnes pratiques :

- 🔒 Ne commitez jamais `FIREBASE_PRIVATE_KEY` dans Git
- 🔑 Ajoutez `.env.local` dans `.gitignore`
- 🔄 Régénérez les clés de compte de service régulièrement
- 👥 Utilisez des clés de compte de service différentes pour dev/prod
- 📊 Activez les logs d'audit Firebase pour surveiller les accès

## ⚠️ Pour Railway / Production

Lors du déploiement sur Railway :

1. Ajoutez toutes les variables d'environnement dans **Variables** :

   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - Toutes les autres variables Firebase (`NEXT_PUBLIC_FIREBASE_*`)

2. **Important pour `FIREBASE_PRIVATE_KEY`** :

   - Railway accepte les variables multi-lignes
   - Copiez-collez la clé complète avec les `\n`
   - Ou utilisez l'interface Railway qui gère les retours à la ligne automatiquement

3. N'oubliez pas d'ajouter votre domaine Railway dans les **Authorized domains** de Firebase Authentication :
   - Firebase Console > Authentication > Settings > Authorized domains
   - Ajoutez `your-app.up.railway.app`

## 🆘 Dépannage

### Erreur : "Missing authentication token"

- Vérifiez que l'utilisateur est bien connecté
- Le token Firebase ID expire après 1h, reconnectez-vous

### Erreur : "Invalid authentication token"

- Vérifiez que `FIREBASE_PRIVATE_KEY` est correctement configurée
- Vérifiez que `FIREBASE_CLIENT_EMAIL` correspond à votre projet

### Erreur : "Permission denied"

- Vérifiez que les règles Firestore sont bien déployées
- Vérifiez que l'utilisateur est authentifié

### Les clés ne se sauvegardent pas

- Vérifiez les logs du navigateur (F12)
- Vérifiez que Firestore est activé dans Firebase Console
- Vérifiez les règles de sécurité Firestore

## 📚 Ressources

- [Documentation Firebase Firestore](https://firebase.google.com/docs/firestore)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
