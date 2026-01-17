import { AccessToken } from "livekit-server-sdk";
import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    return NextResponse.json(
      { error: "LiveKit credentials not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { roomName, participantName } = body;
    const agentName = process.env.LIVEKIT_AGENT_NAME ?? "pt-assistant";

    // Generate unique room name if not provided
    const room = roomName || `pt-session-${crypto.randomUUID().slice(0, 8)}`;
    const participant = participantName || `user-${crypto.randomUUID().slice(0, 8)}`;

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participant,
      ttl: "15m",
    });

    token.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    token.roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({
          agentName,
        }),
      ],
    });

    const jwt = await token.toJwt();

    return NextResponse.json(
      {
        serverUrl: livekitUrl,
        roomName: room,
        participantToken: jwt,
        participantName: participant,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json(
      { error: "Failed to generate connection details" },
      { status: 500 }
    );
  }
}
