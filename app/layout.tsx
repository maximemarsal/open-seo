"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "../contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Open SEO - Free AI-Powered Blog Article Generator | Open Source</title>
        <meta name="description" content="Generate high-quality, SEO-optimized blog articles using AI. Free, open source, and supports multiple AI providers including OpenAI, Claude, Gemini, and more." />
        <meta name="keywords" content="SEO, blog generator, AI content, article writer, OpenAI, Claude, Gemini, WordPress, content marketing, free, open source" />
        <meta name="author" content="Maxime Marsal" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Open Graph / Social Media */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://open-seo.tech/" />
        <meta property="og:title" content="Open SEO - Free AI-Powered Blog Article Generator" />
        <meta property="og:description" content="Generate high-quality, SEO-optimized blog articles using AI. Free, open source, and supports multiple AI providers." />
        <meta property="og:image" content="https://open-seo.tech/images/Logo vert Open-SEO.png" />
        <meta property="og:site_name" content="Open SEO" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://open-seo.tech/" />
        <meta name="twitter:title" content="Open SEO - Free AI-Powered Blog Article Generator" />
        <meta name="twitter:description" content="Generate high-quality, SEO-optimized blog articles using AI. Free, open source, and supports multiple AI providers." />
        <meta name="twitter:image" content="https://open-seo.tech/images/Logo vert Open-SEO.png" />
        
        {/* Favicon */}
        <link rel="icon" type="image/png" href="/images/Logo vert Open-SEO.png" />
        <link rel="apple-touch-icon" href="/images/Logo vert Open-SEO.png" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://open-seo.tech/" />
        
        {/* Theme color */}
        <meta name="theme-color" content="#10B981" />
        
        {/* Robots */}
        <meta name="robots" content="index, follow" />
        
        {/* Additional SEO */}
        <meta name="application-name" content="Open SEO" />
        <meta name="generator" content="Next.js" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
