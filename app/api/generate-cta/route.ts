import { NextRequest, NextResponse } from "next/server";
import { getUserApiKeysServer } from "../../../lib/services/userKeys.server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { AITextGenerator } from "../../../lib/services/ai";

export async function POST(req: NextRequest) {
  try {
    const { prompt, url, userId, aiProvider = "openai", model = "gpt-4o-mini", reasoningEffort, verbosity } = await req.json();

    if (!prompt || !userId) {
      return NextResponse.json(
        { error: "Prompt and userId are required" },
        { status: 400 }
      );
    }

    // Get user's API keys
    const userKeys = await getUserApiKeysServer(userId);

    // Create the prompt for AI
    const systemPrompt = `You are a professional copywriter specializing in creating compelling Call-to-Action content. Always respond with valid JSON only.`;
    
    const userPrompt = `Generate a compelling Call-to-Action (CTA) based on this requirement:

${prompt}

Target URL: ${url || "https://example.com"}

Generate an engaging CTA with:
1. A catchy title (max 60 characters)
2. A persuasive description (max 120 characters)
3. An action-oriented button text (max 25 characters)

The CTA should be professional, engaging, and encourage readers to click.

Return ONLY a JSON object with this exact format:
{
  "title": "...",
  "description": "...",
  "buttonText": "..."
}`;

    let responseText = "";

    switch (aiProvider) {
      case "openai": {
        if (!userKeys?.openaiKey) {
          return NextResponse.json(
            { error: "OpenAI API key not found. Please add it in Settings." },
            { status: 400 }
          );
        }

        // Use the shared AITextGenerator to ensure identical behavior to the main generator
        const generator = new AITextGenerator(userKeys.openaiKey, model);
        const messages = [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: userPrompt },
        ];
        responseText = await generator.generateText(messages, {
          model,
          provider: "openai",
          temperature: 0.8,
          maxTokens: 300,
          reasoningEffort,
          verbosity,
        });

        // Fallback if no text returned (rare edge case)
        if (!responseText || !responseText.trim()) {
          try {
        const openai = new OpenAI({ apiKey: userKeys.openaiKey });
            const fallbackModel = model.toLowerCase().startsWith("gpt-5")
              ? "gpt-4o-mini"
              : model;
        const completion = await openai.chat.completions.create({
              model: fallbackModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
              temperature: 0.7,
          max_tokens: 300,
        });
        responseText = completion.choices[0]?.message?.content || "";
          } catch (fallbackErr) {
            console.error("CTA OpenAI fallback failed:", fallbackErr);
          }
        }
        break;
      }

      case "anthropic": {
        if (!userKeys?.anthropicKey) {
          return NextResponse.json(
            { error: "Anthropic API key not found. Please add it in Settings." },
            { status: 400 }
          );
        }

        const anthropic = new Anthropic({ apiKey: userKeys.anthropicKey });
        const message = await anthropic.messages.create({
          model: model,
          max_tokens: 300,
          temperature: 0.8,
          messages: [
            {
              role: "user",
              content: `${systemPrompt}\n\n${userPrompt}`,
            },
          ],
        });

        const content = message.content[0];
        responseText = content.type === "text" ? content.text : "";
        break;
      }

      case "gemini": {
        if (!userKeys?.geminiKey) {
          return NextResponse.json(
            { error: "Google Gemini API key not found. Please add it in Settings." },
            { status: 400 }
          );
        }

        const genAI = new GoogleGenerativeAI(userKeys.geminiKey);
        const geminiModel = genAI.getGenerativeModel({ model: model });

        const result = await geminiModel.generateContent({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 300,
          },
        });

        responseText = result.response.text();
        break;
      }

      case "deepseek": {
        if (!userKeys?.deepseekKey) {
          return NextResponse.json(
            { error: "DeepSeek API key not found. Please add it in Settings." },
            { status: 400 }
          );
        }

        const client = axios.create({
          baseURL: "https://api.deepseek.com/v1",
          headers: {
            Authorization: `Bearer ${userKeys.deepseekKey}`,
            "content-type": "application/json",
          },
        });

        const resp = await client.post("/chat/completions", {
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 300,
        });

        responseText = resp.data?.choices?.[0]?.message?.content || "";
        break;
      }

      case "qwen": {
        if (!userKeys?.qwenKey) {
          return NextResponse.json(
            { error: "Alibaba Qwen API key not found. Please add it in Settings." },
            { status: 400 }
          );
        }

        const client = axios.create({
          baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
          headers: {
            Authorization: `Bearer ${userKeys.qwenKey}`,
            "content-type": "application/json",
          },
        });

        const resp = await client.post("/chat/completions", {
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 300,
        });

        responseText = resp.data?.choices?.[0]?.message?.content || "";
        break;
      }

      case "grok": {
        if (!userKeys?.grokKey) {
          return NextResponse.json(
            { error: "xAI Grok API key not found. Please add it in Settings." },
            { status: 400 }
          );
        }

        const client = axios.create({
          baseURL: "https://api.x.ai/v1",
          headers: {
            Authorization: `Bearer ${userKeys.grokKey}`,
            "content-type": "application/json",
          },
        });

        const resp = await client.post("/chat/completions", {
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 300,
        });

        responseText = resp.data?.choices?.[0]?.message?.content || "";
        break;
      }

      default:
        return NextResponse.json(
          { error: "Unsupported AI provider" },
          { status: 400 }
        );
    }

    if (!responseText) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    // Try to extract JSON if it's wrapped in markdown code blocks
    let jsonText = responseText.trim();
    if (jsonText.includes("```json")) {
      jsonText = jsonText.split("```json")[1].split("```")[0].trim();
    } else if (jsonText.includes("```")) {
      jsonText = jsonText.split("```")[1].split("```")[0].trim();
    }

    const ctaData = JSON.parse(jsonText);

    return NextResponse.json({
      title: ctaData.title,
      description: ctaData.description,
      buttonText: ctaData.buttonText,
    });
  } catch (error) {
    console.error("Error generating CTA:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate CTA",
      },
      { status: 500 }
    );
  }
}
