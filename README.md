# Open SEO

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Firebase-Auth-orange?style=for-the-badge&logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
</p>

<p align="center">
  <strong>🚀 Open-source AI-powered SEO blog article generator</strong>
</p>

<p align="center">
  Generate high-quality, SEO-optimized blog articles using multiple AI providers.<br/>
  Schedule publications, publish to WordPress, and manage your content calendar.
</p>

---

## ✨ Features

- **🤖 Multi-AI Support** - OpenAI (GPT-4/5), Anthropic Claude, Google Gemini, DeepSeek, Qwen, xAI Grok
- **🔍 Web Research** - Perplexity AI integration for up-to-date content
- **📝 SEO Optimization** - Auto-generated meta titles, descriptions, slugs, and keywords
- **📅 Content Calendar** - Drag & drop scheduling with visual calendar
- **📦 Bulk Generation** - Generate multiple articles at once
- **🖼️ Unsplash Images** - Automatic image selection and insertion
- **📤 WordPress Integration** - Direct publishing with Yoast SEO support
- **🔐 Secure** - Firebase Auth + encrypted API key storage
- **💰 Free Forever** - Use your own API keys, no subscription fees

## 🖥️ Demo

Try it live: [https://open-seo.tech](https://open-seo.tech)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Firebase project (for authentication)
- API keys for your preferred AI providers

### 1. Clone the repository

```bash
git clone https://github.com/maximemarsal/open-seo.git
cd open-seo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp env.example .env.local
```

Edit `.env.local` with your Firebase credentials:

```env
# Firebase (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin SDK (Required for API key storage)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Cron Secret (for scheduled publishing)
CRON_SECRET=your-random-secret
```

### 4. Set up Firebase

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** (Email/Password + Google)
3. Enable **Firestore Database**
4. Create a **Service Account** and download the JSON key
5. Deploy Firestore security rules from `firestore.rules`

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage

### First Time Setup

1. Visit the app and create an account
2. Go to **Settings** and add your API keys:
   - **OpenAI** / **Anthropic** / **Gemini** (for article generation)
   - **Perplexity** (for web research - recommended)
   - **Unsplash** (for images - optional)
   - **WordPress** (for auto-publishing - optional)

### Generate an Article

1. Go to **Post Creation**
2. Enter your topic
3. Select AI provider and model
4. Enable/disable web research
5. Add images if needed
6. Click **Generate Article**

### Bulk Generation

1. Go to **Bulk Generation**
2. Add multiple topics
3. Configure settings
4. Click **Generate All**
5. Schedule articles from the calendar

### Schedule Publications

1. Go to **Calendar**
2. Drag articles to schedule them
3. Set up a cron job to trigger `/api/cron/publish-due`

## 🔧 Scheduled Publishing Setup

For scheduled articles to be published automatically, you need an external cron service:

### Option 1: cron-job.org (Free)

1. Create account at [cron-job.org](https://cron-job.org)
2. Add a new cron job:
   - **URL**: `https://open-seo.tech/api/cron/publish-due` (or your domain)
   - **Method**: GET
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
   - **Header**: `Authorization: Bearer YOUR_CRON_SECRET`

### Option 2: Vercel (Built-in)

If deploying to Vercel, cron is configured automatically via `vercel.json`.

### Option 3: Upstash QStash

Use [Upstash QStash](https://upstash.com/qstash) for serverless cron.

## 🏗️ Project Structure

```
open-seo/
├── app/
│   ├── api/
│   │   ├── generate/          # Article generation endpoint
│   │   ├── articles/          # CRUD for articles
│   │   ├── cron/publish-due/  # Scheduled publishing
│   │   └── wordpress/         # WordPress integration
│   ├── generate/
│   │   ├── page.tsx           # Single article generation
│   │   ├── bulk/              # Bulk generation
│   │   ├── articles/          # Article library
│   │   ├── calendar/          # Content calendar
│   │   └── settings/          # API keys configuration
│   └── page.tsx               # Landing page
├── components/                 # React components
├── contexts/                   # Auth & Sidebar contexts
├── lib/
│   ├── services/              # AI, WordPress, Unsplash services
│   └── firebase.ts            # Firebase configuration
└── types/                     # TypeScript types
```

## 🔌 Supported AI Providers

| Provider | Models | Best For |
|----------|--------|----------|
| **OpenAI** | GPT-4o, GPT-4o Mini, GPT-4.1, GPT-5 | General purpose, high quality |
| **Anthropic** | Claude Opus 4, Claude Sonnet | Long-form, nuanced content |
| **Google** | Gemini 2.5 Pro, Gemini 2.5 Flash | Fast, cost-effective |
| **DeepSeek** | DeepSeek R1 | Reasoning-heavy content |
| **Qwen** | Qwen QwQ 32B | Multilingual content |
| **xAI** | Grok 4 | Real-time information |

## 🚀 Deployment

### Railway (Recommended)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

1. Connect your GitHub repository
2. Add environment variables
3. Deploy!

### Vercel

```bash
npm i -g vercel
vercel
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Firebase](https://firebase.google.com/) - Authentication & database
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [Lucide Icons](https://lucide.dev/) - Icons

## 📞 Support

- 📖 [Documentation](https://github.com/maximemarsal/open-seo/wiki)
- 🐛 [Report a Bug](https://github.com/maximemarsal/open-seo/issues)
- 💡 [Request a Feature](https://github.com/maximemarsal/open-seo/issues)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/maximemarsal">Maxime Marsal</a>
</p>
