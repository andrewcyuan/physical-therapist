import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { imageData, prompt } = await request.json();

    if (!imageData || !prompt) {
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
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5-nano",
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
              name: "exercise_position",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  position: {
                    type: "string",
                    enum: ["START", "END", "MIDWAY"],
                  },
                },
                required: ["position"],
                additionalProperties: false,
              },
            },
          },
          max_tokens: 10,
          temperature: 0,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Vision API] OpenAI error:", response.status, errorData);

        return NextResponse.json(
          {
            error: `OpenAI API error: ${response.status}`,
            details: errorData
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      const position = JSON.parse(data.choices[0].message.content).position;

      return NextResponse.json({ position });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error("[Vision API] Request timeout");
        return NextResponse.json(
          { error: "Request timeout after 5 seconds" },
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
