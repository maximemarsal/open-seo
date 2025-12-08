import OpenAI from "openai";
import axios from "axios";
import { config } from "../config";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GenerateOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: "minimal" | "faible" | "moyen" | "élevé";
  verbosity?: "faible" | "moyenne" | "élevée";
  provider?: "openai" | "anthropic" | "gemini" | "deepseek" | "qwen" | "grok";
};

export class AITextGenerator {
  private client: OpenAI;
  private defaultModel: string;
  private totalInputTokens: number = 0;
  private totalOutputTokens: number = 0;

  constructor(apiKey: string, defaultModel: string) {
    this.client = new OpenAI({ apiKey });
    this.defaultModel = defaultModel;
  }

  private isResponsesModel(model: string | undefined): boolean {
    if (!model) return false;
    // GPT-5 and future Responses-first families
    return model.toLowerCase().startsWith("gpt-5");
  }

  private mapVerbosity(value?: string): "low" | "medium" | "high" | undefined {
    if (!value) return undefined;
    const v = value.toLowerCase();
    if (v === "faible" || v === "low") return "low";
    if (v === "moyenne" || v === "medium") return "medium";
    if (v === "élevée" || v === "elevee" || v === "haute" || v === "high")
      return "high";
    return undefined;
  }

  private mapEffort(
    value?: string
  ): "minimal" | "low" | "medium" | "high" | undefined {
    if (!value) return undefined;
    const v = value.toLowerCase();
    if (v === "minimal") return "minimal";
    if (v === "faible" || v === "low") return "low";
    if (v === "moyen" || v === "medium") return "medium";
    if (v === "élevé" || v === "eleve" || v === "high") return "high";
    return undefined;
  }

  async generateText(
    messages: ChatMessage[],
    options?: GenerateOptions
  ): Promise<string> {
    const provider = options?.provider || "openai";
    const model = options?.model || this.defaultModel;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens;
    const reasoningEffort = options?.reasoningEffort;
    const verbosity = options?.verbosity;

    if (provider !== "openai") {
      const text = await this.generateWithProvider(provider, messages, {
        model,
        temperature,
        maxTokens,
        reasoningEffort,
        verbosity,
      });
      return text;
    }

    if (this.isResponsesModel(model)) {
      // Use the Responses API for GPT-5 family
      const anyClient = this.client as unknown as {
        responses: {
          create: (args: any) => Promise<any>;
        };
      };

      const input = messages.map((m) => ({
        role: m.role,
        content: [
          {
            type: "input_text",
            text: m.content,
          },
        ],
      }));

      // For GPT-5, we need to account for both reasoning AND text output tokens
      // Multiply by 10 to give enough space for reasoning + actual text
      // (GPT-5 can use up to 80-90% of tokens for reasoning alone)
      const gpt5MaxTokens = maxTokens ? maxTokens * 10 : 16000;

      const response = await anyClient.responses.create({
        model,
        input,
        max_output_tokens: gpt5MaxTokens,
        ...(this.mapEffort(reasoningEffort)
          ? { reasoning: { effort: this.mapEffort(reasoningEffort) } }
          : {}),
        ...(this.mapVerbosity(verbosity)
          ? { text: { verbosity: this.mapVerbosity(verbosity) } }
          : {}),
      });

      // Usage accounting (best effort depending on provider payload)
      try {
        const inTok = (response as any)?.usage?.input_tokens ?? 0;
        const outTok = (response as any)?.usage?.output_tokens ?? 0;
        this.totalInputTokens += inTok || 0;
        this.totalOutputTokens += outTok || 0;
      } catch {}

      // Prefer unified output_text when available
      let text: string = response?.output_text ?? "";

      // Fallback: extract from structured output
      if (!text && Array.isArray(response?.output)) {
        // Method 1: Look for message type with content array
        const messageOutput = response.output.find(
          (item: any) => item?.type === "message"
        );
        if (messageOutput && Array.isArray(messageOutput.content)) {
          text = messageOutput.content
            .filter((c: any) => c?.type === "output_text" || c?.type === "text")
            .map((c: any) => c?.text || "")
            .join("");
        }

        // Method 2: Fallback to direct content extraction
        if (!text) {
          text = response.output
              .flatMap((item: any) => item?.content || [])
            .filter((c: any) => c?.type === "output_text" || c?.type === "text")
              .map((c: any) => c?.text || "")
            .join("");
        }
      }

      // Debug logging for GPT-5
      if (!text || text.trim() === "") {
        console.error(
          "GPT-5 returned empty response:",
          JSON.stringify(response, null, 2)
        );

        // Last resort: try to extract from any text field in response
        const responseStr = JSON.stringify(response);
        if (responseStr.length > 100) {
          console.warn("GPT-5: Attempting to extract text from full response");
          // Try to find any substantial text in the response
          try {
            const textMatch = responseStr.match(/"text"\s*:\s*"([^"]{50,})"/);
            if (textMatch && textMatch[1]) {
              text = textMatch[1];
              console.log("GPT-5: Extracted text via regex fallback");
            }
          } catch (e) {
            console.error("GPT-5: Regex extraction failed", e);
          }
        }
      }

      return text || "";
    }

    // Default path: Chat Completions API
    const completion = await this.client.chat.completions.create({
      model,
      messages,
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    });

    // Usage accounting
    try {
      const u = (completion as any)?.usage;
      const inTok = u?.prompt_tokens ?? 0;
      const outTok = u?.completion_tokens ?? 0;
      this.totalInputTokens += inTok || 0;
      this.totalOutputTokens += outTok || 0;
    } catch {}

    return completion.choices[0]?.message?.content || "";
  }

  private async generateWithProvider(
    provider: NonNullable<GenerateOptions["provider"]>,
    messages: ChatMessage[],
    opts: Omit<GenerateOptions, "provider">
  ): Promise<string> {
    const { model, temperature, maxTokens, reasoningEffort, verbosity } = opts;

    switch (provider) {
      case "anthropic": {
        const client = axios.create({
          baseURL: `${config.anthropic.baseUrl}/v1`,
          headers: {
            "x-api-key": config.anthropic.apiKey,
            "anthropic-version": config.anthropic.version,
            "content-type": "application/json",
          },
        });
        const response = await client.post("/messages", {
          model: model || config.anthropic.model,
          temperature,
          max_tokens: maxTokens || 1024,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });
        try {
          const inTok = response.data?.usage?.input_tokens ?? 0;
          const outTok = response.data?.usage?.output_tokens ?? 0;
          this.totalInputTokens += inTok || 0;
          this.totalOutputTokens += outTok || 0;
        } catch {}
        return response.data?.content?.map((c: any) => c.text).join("") || "";
      }
      case "gemini": {
        const client = axios.create({
          baseURL: config.gemini.baseUrl,
          params: { key: config.gemini.apiKey },
        });
        const resp = await client.post(
          `/models/${model || config.gemini.model}:generateContent`,
          {
            contents: [
              {
                role: "user",
                parts: messages.map((m) => ({
                  text: `${m.role}: ${m.content}`,
                })),
              },
            ],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          }
        );
        try {
          const usage = resp.data?.usageMetadata;
          const inTok = usage?.promptTokenCount ?? 0;
          const outTok =
            (usage?.candidatesTokenCount ?? 0) +
            (usage?.totalTokenCount
              ? usage.totalTokenCount - (usage.promptTokenCount ?? 0)
              : 0);
          this.totalInputTokens += inTok || 0;
          this.totalOutputTokens += outTok || 0;
        } catch {}
        return (
          resp.data?.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text)
            .join("") || ""
        );
      }
      case "deepseek": {
        const client = axios.create({
          baseURL: `${config.deepseek.baseUrl}/v1`,
          headers: {
            Authorization: `Bearer ${config.deepseek.apiKey}`,
            "content-type": "application/json",
          },
        });
        const resp = await client.post("/chat/completions", {
          model: model || config.deepseek.model,
          messages,
          temperature,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
        });
        try {
          const u = resp.data?.usage;
          this.totalInputTokens += u?.prompt_tokens ?? 0;
          this.totalOutputTokens += u?.completion_tokens ?? 0;
        } catch {}
        return resp.data?.choices?.[0]?.message?.content || "";
      }
      case "qwen": {
        const client = axios.create({
          baseURL: `${config.qwen.baseUrl}/v1`,
          headers: {
            Authorization: `Bearer ${config.qwen.apiKey}`,
            "content-type": "application/json",
          },
        });
        const resp = await client.post("/chat/completions", {
          model: model || config.qwen.model,
          messages,
          temperature,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
        });
        try {
          const u = resp.data?.usage;
          this.totalInputTokens += u?.prompt_tokens ?? 0;
          this.totalOutputTokens += u?.completion_tokens ?? 0;
        } catch {}
        return resp.data?.choices?.[0]?.message?.content || "";
      }
      case "grok": {
        const client = axios.create({
          baseURL: `${config.grok.baseUrl}/v1`,
          headers: {
            Authorization: `Bearer ${config.grok.apiKey}`,
            "content-type": "application/json",
          },
        });
        const resp = await client.post("/chat/completions", {
          model: model || config.grok.model,
          messages,
          temperature,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
        });
        try {
          const u = resp.data?.usage;
          this.totalInputTokens += u?.prompt_tokens ?? 0;
          this.totalOutputTokens += u?.completion_tokens ?? 0;
        } catch {}
        return resp.data?.choices?.[0]?.message?.content || "";
      }
      default:
        return "";
    }
  }

  getUsageTotals(): { input: number; output: number; total: number } {
    return {
      input: this.totalInputTokens,
      output: this.totalOutputTokens,
      total: this.totalInputTokens + this.totalOutputTokens,
    };
  }
}
