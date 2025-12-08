# Guide de Test - Popups API Keys

## 🧪 Tests à Effectuer

### Test 1 : Popup Settings (Page Réglages)

#### Étapes :
1. Aller sur `/generate/settings`
2. Cliquer sur le "?" à côté de "OpenAI API Key"

#### Vérifications :
- [ ] Le popup s'ouvre avec une animation smooth
- [ ] Le popup est parfaitement centré
- [ ] Le fond est noir et flou
- [ ] On voit 6 étapes numérotées
- [ ] On voit le prix : "$5 minimum recommended"
- [ ] On voit la note sur les crédits dans le même bloc vert
- [ ] Le bouton "Open OpenAI Dashboard" est visible

#### Test des interactions :
- [ ] Cliquer sur le fond noir → Le popup se ferme ✅
- [ ] Rouvrir et cliquer sur le contenu blanc → Reste ouvert ✅
- [ ] Cliquer sur "Open OpenAI Dashboard" → Ouvre https://platform.openai.com/api-keys dans un nouvel onglet ✅
- [ ] Le popup reste ouvert après avoir cliqué sur le lien ✅
- [ ] Cliquer sur le X en haut à droite → Le popup se ferme ✅

#### Répéter pour chaque service :
- [ ] Perplexity → URL: https://www.perplexity.ai/settings/api
- [ ] Anthropic → URL: https://console.anthropic.com/settings/keys
- [ ] Google Gemini → URL: https://aistudio.google.com/app/apikey (Free tier!)
- [ ] DeepSeek → URL: https://platform.deepseek.com/api_keys
- [ ] Alibaba Qwen → URL: https://dashscope.console.aliyun.com/apiKey
- [ ] xAI Grok → URL: https://console.x.ai/
- [ ] Unsplash → URL: https://unsplash.com/oauth/applications

---

### Test 2 : Popup Generate (Page Génération)

#### Étapes :
1. Aller sur `/generate`
2. Ne PAS configurer d'API keys
3. Sélectionner "Anthropic" comme AI Provider
4. Entrer un topic
5. Cliquer sur "Generate Article"

#### Vérifications :
- [ ] Le popup "Missing API Keys" s'ouvre
- [ ] Le popup est parfaitement centré
- [ ] On voit "Anthropic API Key" dans la liste
- [ ] On voit l'explication : "Powers Claude AI for advanced content generation"
- [ ] On voit le lien "Get your Anthropic API key" en bleu

#### Test des interactions :
- [ ] Cliquer sur le fond noir → Le popup se ferme ✅
- [ ] Rouvrir et cliquer sur le contenu blanc → Reste ouvert ✅
- [ ] Cliquer sur "Get your Anthropic API key" → Ouvre https://console.anthropic.com/settings/keys ✅
- [ ] Le popup reste ouvert après avoir cliqué sur le lien ✅
- [ ] Hover sur le lien → Curseur devient pointeur + underline ✅
- [ ] Cliquer sur X → Le popup se ferme ✅
- [ ] Cliquer sur "Cancel" → Le popup se ferme ✅

#### Test de sauvegarde :
- [ ] Rouvrir le popup
- [ ] Entrer une fausse clé API (ex: "sk-ant-test123")
- [ ] Cliquer sur "Save & Continue"
- [ ] Le popup se ferme ✅
- [ ] La génération démarre (et échouera avec erreur API, c'est normal) ✅

---

### Test 3 : Responsive Mobile

#### Sur mobile (ou DevTools en mode mobile) :
- [ ] Les popups sont bien centrés
- [ ] Le padding de 4 (p-4) donne des marges
- [ ] Le contenu est scrollable si trop long
- [ ] Les liens sont facilement cliquables (pas trop petits)
- [ ] Le bouton X est accessible

---

### Test 4 : Perplexity (Web Research)

#### Étapes :
1. Configurer OpenAI API key
2. NE PAS configurer Perplexity
3. Activer "Web Research (Perplexity)"
4. Essayer de générer

#### Vérifications :
- [ ] Le popup s'ouvre avec "Perplexity API Key (for research)"
- [ ] L'explication dit : "Enables real-time web research for up-to-date content"
- [ ] Le lien ouvre : https://www.perplexity.ai/settings/api

---

### Test 5 : Tous les Providers

#### OpenAI
- [ ] Popup s'ouvre correctement
- [ ] Lien : https://platform.openai.com/api-keys
- [ ] Prix : $5 minimum
- [ ] Note : "Pay-as-you-go pricing. GPT-4o costs ~$2.50 per 1M input tokens..."

#### Perplexity
- [ ] Lien : https://www.perplexity.ai/settings/api
- [ ] Prix : $10 minimum
- [ ] Note : "Used for real-time web research. Pricing: ~$1 per 1M tokens..."

#### Anthropic
- [ ] Lien : https://console.anthropic.com/settings/keys
- [ ] Prix : $5 minimum
- [ ] Note : "Pay-as-you-go pricing. Claude Opus costs ~$15 per 1M input tokens..."

#### Google Gemini
- [ ] Lien : https://aistudio.google.com/app/apikey
- [ ] Prix : "Free tier: 60 requests/min"
- [ ] Note : "Generous free tier with no credit card required!"

#### DeepSeek
- [ ] Lien : https://platform.deepseek.com/api_keys
- [ ] Prix : $5 minimum
- [ ] Note : "Very competitive pricing: ~$0.27 per 1M input tokens..."

#### Alibaba Qwen
- [ ] Lien : https://dashscope.console.aliyun.com/apiKey
- [ ] Prix : $5 minimum
- [ ] Note : "Requires Alibaba Cloud account. International payments accepted..."

#### xAI Grok
- [ ] Lien : https://console.x.ai/
- [ ] Prix : $10 minimum
- [ ] Note : "Grok API pricing: ~$5 per 1M input tokens. Credits required..."

#### Unsplash
- [ ] Lien : https://unsplash.com/oauth/applications
- [ ] Prix : "Free tier: 50 requests/hour"
- [ ] Note : "Completely free for development and production!"

---

## 🐛 Bugs Connus à Vérifier

### Bugs Résolus ✅
- [x] Popups pas centrés → RÉSOLU (flexbox)
- [x] Impossible de fermer en cliquant dehors → RÉSOLU (onClick backdrop)
- [x] Liens pas cliquables → RÉSOLU (stopPropagation)
- [x] Liens ferment le popup → RÉSOLU (stopPropagation)

### À Surveiller
- [ ] Z-index conflicts avec d'autres éléments ?
- [ ] Scroll bloqué sur la page derrière ?
- [ ] Performance avec beaucoup de popups ouverts ?

---

## 📱 Checklist Navigateurs

### Desktop
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari

### Mobile
- [ ] Safari iOS
- [ ] Chrome Android

---

## ✅ Critères de Succès

Un test est réussi si :
1. ✅ Les popups s'ouvrent et se ferment sans bug
2. ✅ Le centrage est parfait sur tous les écrans
3. ✅ Les liens ouvrent les bonnes URLs dans un nouvel onglet
4. ✅ Les liens ne ferment PAS le popup
5. ✅ Cliquer à l'extérieur ferme le popup
6. ✅ Cliquer à l'intérieur ne ferme PAS le popup
7. ✅ Les animations sont smooth (pas de saccades)
8. ✅ Les informations de prix sont dans le même bloc vert
9. ✅ Les explications sont claires et succinctes

---

**Testeur** : _______________  
**Date** : _______________  
**Résultat** : ⬜ PASS / ⬜ FAIL  
**Notes** : _______________

