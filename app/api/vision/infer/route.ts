import { NextRequest, NextResponse } from "next/server";
import { VISION_CONFIG } from "@/lib/vision/config";

export async function POST(request: NextRequest) {
  console.log("[Vision API] ========== REQUEST START ==========");

  try {
    const { imageData, prompt } = await request.json();

    console.log("[Vision API] Received request");
    console.log("[Vision API] Prompt:", prompt?.substring(0, 200) + "...");
    console.log("[Vision API] Image data length:", imageData?.length || 0);

    if (!imageData || !prompt) {
      console.error("[Vision API] Missing imageData or prompt");
      return NextResponse.json(
        { error: "Missing imageData or prompt" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[Vision API] OPENAI_API_KEY not configured");
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      console.log("[Vision API] Calling OpenAI API...");

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: VISION_CONFIG.modelVersion,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: { url: imageData }
                },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "orientation_check",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  answer: {
                    type: "string",
                    enum: ["YES", "NO"],
                  },
                },
                required: ["answer"],
                additionalProperties: false,
              },
            },
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("[Vision API] OpenAI response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Vision API] OpenAI error:", response.status, JSON.stringify(errorData));

        return NextResponse.json(
          {
            error: `OpenAI API error: ${response.status}`,
            details: errorData
          },
          { status: response.status }
        );
      }

      const data = await response.json();

      console.log("[Vision API] OpenAI response:", JSON.stringify(data, null, 2));

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error("[Vision API] Invalid response structure:", data);
        return NextResponse.json(
          { error: "Invalid response from OpenAI" },
          { status: 500 }
        );
      }

      const content = data.choices[0].message.content;
      console.log("[Vision API] Message content:", content);

      let answer: string;

      if (typeof content === "string") {
        try {
          const parsed = JSON.parse(content);
          answer = parsed.answer;
        } catch (parseError) {
          console.error("[Vision API] Failed to parse content as JSON:", content);
          return NextResponse.json(
            { error: "Failed to parse response", details: { content } },
            { status: 500 }
          );
        }
      } else if (typeof content === "object" && content !== null) {
        answer = content.answer;
      } else {
        console.error("[Vision API] Unexpected content type:", typeof content);
        return NextResponse.json(
          { error: "Unexpected response format" },
          { status: 500 }
        );
      }

      console.log("[Vision API] Parsed answer:", answer);

      if (!answer || !["YES", "NO"].includes(answer)) {
        console.error("[Vision API] Invalid answer value:", answer);
        return NextResponse.json(
          { error: "Invalid answer value", details: { answer } },
          { status: 500 }
        );
      }

      console.log("[Vision API] ========== REQUEST SUCCESS ==========");
      return NextResponse.json({ position: answer });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error("[Vision API] Request timeout after 8 seconds");
        return NextResponse.json(
          { error: "Request timeout after 8 seconds" },
          { status: 504 }
        );
      }

      throw fetchError;
    }
  } catch (error) {
    console.error("[Vision API] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
