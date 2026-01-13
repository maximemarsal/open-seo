import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { SavedArticle } from "../../../types/blog";

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminDb = getFirestore();
const adminAuth = getAuth();

const SEED_SECRET = process.env.SEED_SECRET || process.env.CRON_SECRET;

// Sample articles with lorem ipsum content
const sampleArticles = [
  {
    title: "10 Stratégies SEO Incontournables pour 2026",
    content: `<h2>Introduction au SEO moderne</h2>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>

<h2>1. L'importance du contenu de qualité</h2>
<p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>

<h2>2. Optimisation technique</h2>
<p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.</p>

<h2>3. Link Building stratégique</h2>
<p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.</p>

<h2>Conclusion</h2>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum. Cras porttitor metus justo, ut fringilla velit fermentum a.</p>`,
    seoMetadata: {
      metaTitle: "10 Stratégies SEO Incontournables pour 2026 | Guide Complet",
      metaDescription: "Découvrez les 10 stratégies SEO essentielles pour améliorer votre visibilité en 2026. Conseils d'experts et techniques avancées.",
      slug: "strategies-seo-2026",
      keywords: ["SEO", "référencement", "stratégies SEO", "2026", "marketing digital"],
    },
    wordCount: 450,
  },
  {
    title: "Guide Complet du Marketing de Contenu",
    content: `<h2>Qu'est-ce que le marketing de contenu ?</h2>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin sagittis nisl rhoncus mattis rhoncus. Ut tristique nulla vitae mauris cursus, nec ullamcorper nibh iaculis.</p>

<h2>Les piliers du content marketing</h2>
<p>Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante.</p>
<p>Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra.</p>

<h2>Créer une stratégie efficace</h2>
<p>Vestibulum erat wisi, condimentum sed, commodo vitae, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui.</p>

<h2>Mesurer le ROI</h2>
<p>Donec non enim in turpis pulvinar facilisis. Ut felis. Praesent dapibus, neque id cursus faucibus, tortor neque egestas auguae, eu vulputate magna eros eu erat.</p>

<h2>Conclusion</h2>
<p>Aliquam erat volutpat. Nam dui mi, tincidunt quis, accumsan porttitor, facilisis luctus, metus. Phasellus ultrices nulla quis nibh.</p>`,
    seoMetadata: {
      metaTitle: "Guide Complet du Marketing de Contenu | Stratégie 2026",
      metaDescription: "Apprenez à créer une stratégie de marketing de contenu efficace. Guide complet avec conseils pratiques et exemples.",
      slug: "guide-marketing-contenu",
      keywords: ["marketing de contenu", "content marketing", "stratégie digitale", "blog", "engagement"],
    },
    wordCount: 380,
  },
  {
    title: "L'Intelligence Artificielle dans le Blogging",
    content: `<h2>L'IA révolutionne la création de contenu</h2>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. Vivamus hendrerit arcu sed erat molestie vehicula. Sed auctor neque eu tellus rhoncus ut eleifend nibh porttitor.</p>

<h2>Les outils IA pour les blogueurs</h2>
<p>Ut in nulla enim. Phasellus molestie magna non est bibendum non venenatis nisl tempor. Suspendisse dictum feugiat nisl ut dapibus. Mauris iaculis porttitor posuere.</p>
<p>Praesent id metus massa, ut blandit odio. Proin quis tortor orci. Etiam at risus et justo dignissim congue. Donec congue lacinia dui, a porttitor lectus condimentum laoreet.</p>

<h2>Éthique et IA</h2>
<p>Nulla facilisi. Proin scelerisque elit pellentesque risus vulputate vehicula. Sed auctor neque eu tellus rhoncus ut eleifend nibh porttitor. Ut in nulla enim.</p>

<h2>L'avenir du blogging</h2>
<p>Phasellus molestie magna non est bibendum non venenatis nisl tempor. Suspendisse dictum feugiat nisl ut dapibus. Mauris iaculis porttitor posuere. Praesent id metus massa, ut blandit odio.</p>

<h2>Conclusion</h2>
<p>Proin quis tortor orci. Etiam at risus et justo dignissim congue. Donec congue lacinia dui, a porttitor lectus condimentum laoreet.</p>`,
    seoMetadata: {
      metaTitle: "L'Intelligence Artificielle dans le Blogging | Tendances 2026",
      metaDescription: "Découvrez comment l'IA transforme le blogging. Outils, éthique et tendances futures de la création de contenu assistée par IA.",
      slug: "intelligence-artificielle-blogging",
      keywords: ["IA", "intelligence artificielle", "blogging", "création de contenu", "ChatGPT"],
    },
    wordCount: 420,
  },
  {
    title: "Optimiser la Vitesse de Chargement de Votre Site",
    content: `<h2>Pourquoi la vitesse est cruciale</h2>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit.</p>

<h2>Analyse des performances</h2>
<p>Nec luctus nibh non enim. Suspendisse potenti. Integer eu ante ornare, euismod odio eget, sodales quam. Sed auctor neque eu tellus rhoncus ut eleifend nibh porttitor.</p>
<p>Ut in nulla enim. Phasellus molestie magna non est bibendum non venenatis nisl tempor. Suspendisse dictum feugiat nisl ut dapibus.</p>

<h2>Optimisation des images</h2>
<p>Mauris iaculis porttitor posuere. Praesent id metus massa, ut blandit odio. Proin quis tortor orci. Etiam at risus et justo dignissim congue.</p>

<h2>Minification et compression</h2>
<p>Donec congue lacinia dui, a porttitor lectus condimentum laoreet. Nulla facilisi. Proin scelerisque elit pellentesque risus vulputate vehicula.</p>

<h2>CDN et mise en cache</h2>
<p>Sed auctor neque eu tellus rhoncus ut eleifend nibh porttitor. Ut in nulla enim. Phasellus molestie magna non est bibendum non venenatis nisl tempor.</p>

<h2>Conclusion</h2>
<p>Suspendisse dictum feugiat nisl ut dapibus. Mauris iaculis porttitor posuere. Praesent id metus massa, ut blandit odio.</p>`,
    seoMetadata: {
      metaTitle: "Optimiser la Vitesse de Chargement de Votre Site | Guide Technique",
      metaDescription: "Guide complet pour optimiser la vitesse de votre site web. Images, CDN, cache et bonnes pratiques pour un site rapide.",
      slug: "optimiser-vitesse-chargement-site",
      keywords: ["vitesse site", "performance web", "Core Web Vitals", "optimisation", "CDN"],
    },
    wordCount: 390,
  },
  {
    title: "Les Tendances du E-commerce en 2026",
    content: `<h2>L'évolution du commerce en ligne</h2>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum. Cras porttitor metus justo, ut fringilla velit fermentum a.</p>

<h2>Le social commerce</h2>
<p>Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc.</p>
<p>Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem.</p>

<h2>L'expérience utilisateur personnalisée</h2>
<p>Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet.</p>

<h2>Paiements et sécurité</h2>
<p>Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu.</p>

<h2>Durabilité et éthique</h2>
<p>Ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. Sed lacinia, urna non tincidunt mattis, tortor neque adipiscing diam.</p>

<h2>Conclusion</h2>
<p>A cursus in eros elementum suscipit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>`,
    seoMetadata: {
      metaTitle: "Les Tendances du E-commerce en 2026 | Guide Complet",
      metaDescription: "Découvrez les grandes tendances e-commerce 2026 : social commerce, personnalisation, paiements et durabilité.",
      slug: "tendances-ecommerce-2026",
      keywords: ["e-commerce", "tendances", "2026", "social commerce", "vente en ligne"],
    },
    wordCount: 410,
  },
];

export async function POST(request: NextRequest) {
  try {
    // Verify secret
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    
    if (!SEED_SECRET || token !== SEED_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    let userId: string;
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      userId = userRecord.uid;
    } catch {
      return NextResponse.json(
        { error: `User not found with email: ${email}` },
        { status: 404 }
      );
    }

    // Create articles
    const now = new Date().toISOString();
    const createdArticles: SavedArticle[] = [];

    for (const articleData of sampleArticles) {
      const docRef = adminDb
        .collection("users")
        .doc(userId)
        .collection("articles")
        .doc();

      const article: SavedArticle = {
        id: docRef.id,
        userId,
        title: articleData.title,
        content: articleData.content,
        seoMetadata: articleData.seoMetadata,
        wordCount: articleData.wordCount,
        status: "draft", // Not scheduled yet
        createdAt: now,
        updatedAt: now,
      };

      await docRef.set(article);
      createdArticles.push(article);
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdArticles.length} articles for ${email}`,
      articles: createdArticles.map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
      })),
    });
  } catch (error: any) {
    console.error("Error seeding articles:", error);
    return NextResponse.json(
      { error: error.message || "Failed to seed articles" },
      { status: 500 }
    );
  }
}

