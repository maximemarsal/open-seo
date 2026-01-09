export interface BlogOutline {
  title: string;
  introduction: {
    keyPoints: string[];
    tone: string;
  };
  sections: BlogSection[];
  conclusion: {
    keyPoints: string[];
    callToAction?: string;
  };
}

export interface BlogSection {
  title: string;
  keyPoints: string[];
  estimatedWordCount: number;
  subsections?: string[];
}

export interface ResearchData {
  query: string;
  results: SearchResult[];
  timestamp: Date;
  usage?: TokenUsage;
  model?: string;
  queries?: string[];
}

export interface SearchResult {
  title: string;
  content: string;
  url: string;
  relevanceScore?: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface BlogContent {
  html: string;
  wordCount: number;
  sources?: string[];
}

export interface SEOMetadata {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  keywords: string[];
}

export interface WordPressPost {
  title: string;
  content: string;
  status: "draft" | "publish";
  excerpt?: string;
  slug?: string;
  meta?: {
    [key: string]: string;
  };
}

export interface GenerationProgress {
  step:
    | "research"
    | "outline"
    | "writing"
    | "seo"
    | "images"
    | "wordpress"
    | "completed";
  message: string;
  progress: number; // 0-100
  currentSection?: string;
  error?: string;
}

export interface ImageAsset {
  id: string;
  url: string;
  alt: string;
  author?: string;
  authorUrl?: string;
  searchTerm?: string;
}

export interface CTA {
  id: string;
  title?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  imageUrl?: string;
  imageFile?: File;
  positionType: "after-intro" | "after-section" | "middle" | "before-conclusion" | "end";
  sectionNumber?: number; // Utilisé uniquement si positionType === "after-section"
  style: "default" | "bordered" | "gradient" | "minimal" | "custom";
  customColors?: {
    background?: string;
    titleColor?: string;
    descriptionColor?: string;
    buttonBackground?: string;
    buttonTextColor?: string;
  };
  generatedText?: {
    title: string;
    description: string;
    buttonText: string;
  };
}

export interface SavedArticle {
  id: string;
  userId: string;
  title: string;
  content: string;
  seoMetadata: SEOMetadata;
  outline?: BlogOutline;
  images?: ImageAsset[];
  wordCount: number;
  status: "draft" | "scheduled" | "published";
  scheduledAt?: string | null; // ISO date string
  publishedAt?: string; // ISO date string
  wordpressPostId?: number;
  wordpressEditUrl?: string;
  createdAt: string;
  updatedAt: string;
}
