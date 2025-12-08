#!/bin/bash

echo "🚀 Blog Generator AI - Démarrage du mode développement"
echo "=================================================="

# Vérifier si .env.local existe
if [ ! -f .env.local ]; then
    echo "⚠️  Fichier .env.local non trouvé"
    echo "📋 Création du fichier .env.local depuis env.example..."
    cp env.example .env.local
    echo "✅ Fichier .env.local créé"
    echo "🔧 Veuillez éditer .env.local avec vos clés API avant de continuer"
    echo ""
    echo "Clés requises :"
    echo "- OPENAI_API_KEY"
    echo "- PERPLEXITY_API_KEY"
    echo "- WORDPRESS_* (optionnel, pour publication auto)"
    echo ""
    read -p "Appuyez sur Entrée après avoir configuré .env.local..."
fi

echo "📦 Installation des dépendances..."
npm install

echo "🔍 Vérification de la configuration..."
# Vérifier les variables d'environnement essentielles
if [ -z "$OPENAI_API_KEY" ] && ! grep -q "OPENAI_API_KEY=" .env.local; then
    echo "❌ OPENAI_API_KEY manquante"
    exit 1
fi

if [ -z "$PERPLEXITY_API_KEY" ] && ! grep -q "PERPLEXITY_API_KEY=" .env.local; then
    echo "❌ PERPLEXITY_API_KEY manquante"
    exit 1
fi

echo "✅ Configuration OK"
echo "🌐 Démarrage du serveur de développement..."
echo "📱 L'application sera disponible sur http://localhost:3000"
echo ""

npm run dev
