import axios from "axios";
import { config } from "../config";
import { ResearchData, SearchResult, TokenUsage } from "../../types/blog";

export type ResearchDepth = "shallow" | "moderate" | "deep";

export class ResearchService {
  private perplexityApi;

  constructor() {
    this.perplexityApi = axios.create({
      baseURL: config.perplexity.baseUrl,
      headers: {
        Authorization: `Bearer ${config.perplexity.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 120000, // 2 minutes timeout for deep research
    });
  }

  async searchTopic(
    topic: string,
    depth: ResearchDepth = "moderate"
  ): Promise<ResearchData> {
    try {
      const queries = this.generateSearchQueries(topic, depth);
      const allResults: SearchResult[] = [];
      const usage: TokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };

      // Map depth -> model
      const model =
        depth === "deep"
          ? "sonar-deep-research"
          : depth === "moderate"
          ? "sonar-pro"
          : "sonar";

      for (const query of queries) {
        const { results, usageDelta } = await this.performSearch(query, model);
        allResults.push(...results);
        usage.promptTokens += usageDelta.promptTokens;
        usage.completionTokens += usageDelta.completionTokens;
        usage.totalTokens += usageDelta.totalTokens;
      }

      // Deduplicate and score results
      const uniqueResults = this.deduplicateResults(allResults);
      const scoredResults = this.scoreResults(uniqueResults, topic);

      return {
        query: topic,
        results: scoredResults.slice(0, 10), // Top 10 results
        timestamp: new Date(),
        usage,
        model,
        queries,
      };
    } catch (error: any) {
      // Soft-fail: continue the flow with empty research if Perplexity is unavailable
      const reason =
        error?.response?.data?.error?.message ||
        error?.message ||
        "Unknown error";
      console.error(
        "Research error (continuing without web research):",
        reason
      );
      return {
        query: topic,
        results: [],
        timestamp: new Date(),
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: config.perplexity.model,
        queries: [],
      };
    }
  }

  private generateSearchQueries(topic: string, depth: ResearchDepth): string[] {
    const baseQueries = [
      `${topic} latest trends 2024 2025`,
      `${topic} recent developments news`,
      `${topic} best practices guide`,
    ];

    const moderateExtras = [
      `${topic} statistics data research`,
      `${topic} expert opinions analysis`,
    ];

    const deepExtras = [
      `${topic} market size statistics 2024 2025`,
      `${topic} case studies examples`,
      `${topic} regulatory updates 2024 2025`,
      `${topic} benchmarks comparison`,
    ];

    if (depth === "shallow") return baseQueries;
    if (depth === "moderate") return [...baseQueries, ...moderateExtras];
    return [...baseQueries, ...moderateExtras, ...deepExtras];
  }

  private async performSearch(
    query: string,
    modelOverride?: string
  ): Promise<{ results: SearchResult[]; usageDelta: TokenUsage }> {
    try {
      const response = await this.perplexityApi.post("/chat/completions", {
        // Valid models: sonar, sonar-pro, sonar-deep-research
        model: modelOverride || config.perplexity.model,
        messages: [
          {
            role: "system",
            content:
              "You are a research assistant. Provide comprehensive, factual information with sources. Focus on recent, credible information.",
          },
          {
            role: "user",
            content: `Research and provide detailed information about: ${query}. Include recent data, statistics, and credible sources.`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      });

      const content = response.data.choices?.[0]?.message?.content || "";
      const promptTokens = response.data.usage?.prompt_tokens ?? 0;
      const completionTokens = response.data.usage?.completion_tokens ?? 0;
      const totalTokens =
        response.data.usage?.total_tokens ?? promptTokens + completionTokens;
      
      // Parse the response to extract information and sources
      return {
        results: this.parsePerplexityResponse(content, query),
        usageDelta: { promptTokens, completionTokens, totalTokens },
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const msg =
        error?.response?.data?.error?.message ||
        error?.message ||
        "Request failed";
      console.error(
        `Search error for query "${query}" (status ${status}):`,
        msg
      );
      return {
        results: [],
        usageDelta: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }
  }

  private parsePerplexityResponse(
    content: string,
    query: string
  ): SearchResult[] {
    // Simple parsing - in production, you might want more sophisticated parsing
    const sections = content
      .split("\n\n")
      .filter((section) => section.trim().length > 50);
    
    return sections.map((section, index) => ({
      title: `${query} - Result ${index + 1}`,
      content: section.trim(),
      url: `https://perplexity.ai/search?q=${encodeURIComponent(query)}`,
      relevanceScore: 1.0 - index * 0.1, // Simple scoring
    }));
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      const key = result.content.substring(0, 100).toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private scoreResults(results: SearchResult[], topic: string): SearchResult[] {
    const topicWords = topic.toLowerCase().split(" ");
    
    return results
      .map((result) => {
        const contentLower = result.content.toLowerCase();
        const titleLower = result.title.toLowerCase();
        
        let score = 0;
        topicWords.forEach((word) => {
          // Escape special regex characters to avoid "Invalid regular expression" errors
          const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

          try {
          // Title matches are more important
            score +=
              (titleLower.match(new RegExp(escapedWord, "g")) || []).length * 2;
          // Content matches
            score += (contentLower.match(new RegExp(escapedWord, "g")) || [])
              .length;
          } catch (e) {
            // If regex still fails, use simple string includes
            if (titleLower.includes(word)) score += 2;
            if (contentLower.includes(word)) score += 1;
          }
        });
        
        return {
          ...result,
          relevanceScore: score / (result.content.length / 100), // Normalize by content length
        };
      })
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }
}
