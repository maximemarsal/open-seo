export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: process.env.ANTHROPIC_MODEL || "claude-opus-4",
    version: process.env.ANTHROPIC_VERSION || "2023-06-01",
    baseUrl: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-2.5-pro",
    baseUrl:
      process.env.GEMINI_BASE_URL ||
      "https://generativelanguage.googleapis.com/v1beta",
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    model: process.env.DEEPSEEK_MODEL || "deepseek-r1",
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  },
  qwen: {
    apiKey: process.env.QWEN_API_KEY || "",
    model: process.env.QWEN_MODEL || "qwen-qwq-32b-preview",
    baseUrl:
      process.env.QWEN_BASE_URL ||
      "https://dashscope.aliyuncs.com/compatible-mode",
  },
  grok: {
    apiKey: process.env.GROK_API_KEY || "",
    model: process.env.GROK_MODEL || "grok-4",
    baseUrl: process.env.GROK_BASE_URL || "https://api.x.ai",
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY!,
    baseUrl: "https://api.perplexity.ai",
    // Default model; can be overridden by PERPLEXITY_MODEL
    model: process.env.PERPLEXITY_MODEL || "sonar",
  },
  unsplash: {
    accessKey: process.env.UNSPLASH_ACCESS_KEY || "",
    baseUrl: "https://api.unsplash.com",
  },
  wordpress: {
    url: process.env.WORDPRESS_URL!,
    username: process.env.WORDPRESS_USERNAME!,
    password: process.env.WORDPRESS_PASSWORD!,
  },
};

export function validateConfig() {
  const required = [
    "OPENAI_API_KEY",
    "PERPLEXITY_API_KEY",
    "WORDPRESS_URL",
    "WORDPRESS_USERNAME",
    "WORDPRESS_PASSWORD",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}
