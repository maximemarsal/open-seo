import { NextRequest, NextResponse } from "next/server";
import { BlogApiService } from "../../../../lib/services/blogApi";

export async function POST(req: NextRequest) {
  try {
    const { blogApiUrl, blogApiKey } = await req.json();

    if (!blogApiUrl || !blogApiKey) {
      return NextResponse.json(
        { success: false, message: "Missing Blog API URL or API key" },
        { status: 400 }
      );
    }

    const service = new BlogApiService({ url: blogApiUrl, apiKey: blogApiKey });
    const result = await service.testConnection();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error testing Blog API connection:", error);
    return NextResponse.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
