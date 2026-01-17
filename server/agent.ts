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
import { DataPacketKind } from "@livekit/rtc-node";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import type {
  ExerciseContextMessage,
  FormAlertMessage,
} from "../types/agentMessages";
import {
  PT_INSTRUCTIONS,
  buildExerciseContextSystemMessage,
  buildFormAlertPrompt,
  buildGreetingPrompt,
} from "./prompts";

type AgentMessage = ExerciseContextMessage | FormAlertMessage;

// Load env from root .env.local
dotenv.config({ path: ".env.local" });
if (!process.env.ELEVEN_API_KEY && process.env.ELEVENLABS_API_KEY) {
  process.env.ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
}

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
        noiseCancellation: BackgroundVoiceCancellation(),
      },
    });

    await ctx.connect();

    let exerciseContext: ExerciseContextMessage | null = null;
    let exerciseContextMessageId: string | null = null;
    let hasGreeted = false;
    const decoder = new TextDecoder();

    ctx.room.on("dataReceived", async (payload: Uint8Array, participant, kind) => {
      if (kind !== DataPacketKind.KIND_RELIABLE) return;

      try {
        const message = JSON.parse(decoder.decode(payload)) as AgentMessage;

        if (message.type === "exercise_context") {
          exerciseContext = message;
          const chatCtx = assistant.chatCtx.copy();

          if (exerciseContextMessageId) {
            const previousIndex = chatCtx.indexById(exerciseContextMessageId);
            if (previousIndex !== undefined) {
              chatCtx.items.splice(previousIndex, 1);
            }
          }

          const contextMessage = chatCtx.addMessage({
            role: "system",
            content: buildExerciseContextSystemMessage(message),
          });
          exerciseContextMessageId = contextMessage.id;
          await assistant.updateChatCtx(chatCtx);

          if (!hasGreeted) {
            hasGreeted = true;
            session.generateReply({
              instructions: buildGreetingPrompt(message),
            });
          }
        }

        if (message.type === "form_alert") {
          session.generateReply({
            instructions: buildFormAlertPrompt(message, exerciseContext),
          });
        }
      } catch (err) {
        console.error("Failed to parse data message:", err);
      }
    });

    setTimeout(() => {
      if (!hasGreeted) {
        hasGreeted = true;
        session.generateReply({
          instructions:
            "Greet the user warmly and let them know you're here to help with their physical therapy exercises. Ask how you can assist them today.",
        });
      }
    }, 3000);
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: process.env.LIVEKIT_AGENT_NAME ?? "physical-therapist",
  })
);
