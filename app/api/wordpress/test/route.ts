import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const { wordpressUrl, wordpressUsername, wordpressPassword } =
      await req.json();

    if (!wordpressUrl || !wordpressUsername || !wordpressPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing WordPress credentials",
        },
        { status: 400 }
      );
    }

    // Create temporary axios instance with provided credentials
    const baseURL = wordpressUrl.replace(/\/$/, "") + "/wp-json/wp/v2";
    const wpApi = axios.create({
      baseURL,
      auth: {
        username: wordpressUsername,
        password: wordpressPassword,
      },
      timeout: 10000,
    });

    // Test connection by getting current user
    try {
      const response = await wpApi.get("/users/me");

      if (response.status === 200 && response.data) {
        return NextResponse.json({
          success: true,
          message: `Connection successful! Authenticated as: ${response.data.name}`,
          user: {
            id: response.data.id,
            name: response.data.name,
            email: response.data.email,
            roles: response.data.roles,
          },
        });
      }

      return NextResponse.json({
        success: false,
        message: "Unable to authenticate with WordPress",
      });
    } catch (error: any) {
      console.error("WordPress connection test failed:", error);

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          return NextResponse.json({
            success: false,
            message:
              "Authentication failed: Invalid username or application password. Please check your credentials.",
          });
        } else if (status === 403) {
          return NextResponse.json({
            success: false,
            message:
              "Access forbidden: Your user account doesn't have sufficient permissions to create posts.",
          });
        } else if (status === 404) {
          return NextResponse.json({
            success: false,
            message:
              "WordPress site not found or REST API is disabled. Please check your site URL.",
          });
        } else {
          return NextResponse.json({
            success: false,
            message: `Connection failed: ${data?.message || error.message}`,
          });
        }
      } else if (error.code === "ENOTFOUND") {
        return NextResponse.json({
          success: false,
          message:
            "Site not found: Please check your WordPress URL (make sure it includes https://).",
        });
      } else if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
        return NextResponse.json({
          success: false,
          message:
            "Connection timeout: The WordPress site took too long to respond.",
        });
      }

      return NextResponse.json({
        success: false,
        message: `Connection error: ${error.message}`,
      });
    }
  } catch (error: any) {
    console.error("Error testing WordPress connection:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Server error: ${error.message}`,
      },
      { status: 500 }
    );
  }
}

