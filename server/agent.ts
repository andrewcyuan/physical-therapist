import {
  type JobContext,
  type JobProcess,
  ServerOptions,
  cli,
  defineAgent,
  voice,
} from "@livekit/agents";
import * as livekit from "@livekit/agents-plugin-livekit";
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
import * as silero from "@livekit/agents-plugin-silero";
import { BackgroundVoiceCancellation } from "@livekit/noise-cancellation-node";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load env from root .env.local
dotenv.config({ path: ".env.local" });
if (!process.env.ELEVEN_API_KEY && process.env.ELEVENLABS_API_KEY) {
  process.env.ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
}

const PT_INSTRUCTIONS = `You are a friendly and knowledgeable physical therapy assistant. Your role is to help users with their physical therapy exercises and answer questions about their workout routines.

Key responsibilities:
- Guide users through exercises with clear, step-by-step instructions
- Provide encouragement and motivation during workouts
- Answer questions about proper form and technique
- Explain the benefits of each exercise
- Remind users about safety and to stop if they feel pain
- Suggest modifications for exercises if needed

Important guidelines:
- Always prioritize safety - remind users to consult their healthcare provider for medical advice
- Use simple, clear language when explaining exercises
- Be encouraging and supportive
- Ask clarifying questions if you need more context about their condition or goals
- Keep responses concise and actionable during exercises

Remember: You are an assistant to support their physical therapy journey, not a replacement for professional medical advice.`;

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    const vad = ctx.proc.userData.vad! as silero.VAD;
    const elevenVoiceId =
      process.env.ELEVEN_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL";
    const elevenModel =
      process.env.ELEVEN_TTS_MODEL ?? "eleven_multilingual_v2";

    const assistant = new voice.Agent({
      instructions: PT_INSTRUCTIONS,
    });

    const session = new voice.AgentSession({
      vad,
      stt: "elevenlabs/scribe_v2_realtime:en",
      llm: "openai/gpt-4.1-mini",
      tts: new elevenlabs.TTS({
        voiceId: elevenVoiceId,
        model: elevenModel,
      }),
      turnDetection: new livekit.turnDetector.MultilingualModel(),
    });

    await session.start({
      agent: assistant,
      room: ctx.room,
      inputOptions: {
        // For telephony applications, use TelephonyBackgroundVoiceCancellation for best results.
        noiseCancellation: BackgroundVoiceCancellation(),
      },
    });

    await ctx.connect();

    const handle = session.generateReply({
      instructions:
        "Greet the user warmly and let them know you're here to help with their physical therapy exercises. Ask how you can assist them today.",
    });
    await handle.waitForPlayout();
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: process.env.LIVEKIT_AGENT_NAME ?? "physical-therapist",
  })
);
