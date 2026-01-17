"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useVoiceAgentContext } from "./VoiceAgentProvider";
import {
  useLocalParticipant,
  useVoiceAssistant,
  BarVisualizer,
} from "@livekit/components-react";

export function VoiceAgentButton() {
  const { isConnected, isConnecting, error, connect, disconnect } =
    useVoiceAgentContext();

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        <button
          onClick={connect}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 rounded-full bg-gray-400 px-4 py-2 font-medium text-white"
      >
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        Connecting...
      </button>
    );
  }

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
      >
        <Mic className="h-5 w-5" />
        Talk to PT Assistant
      </button>
    );
  }

  return <ConnectedVoiceAgent onDisconnect={disconnect} />;
}

function ConnectedVoiceAgent({ onDisconnect }: { onDisconnect: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const { state, audioTrack } = useVoiceAssistant();

  const isMuted = !localParticipant.isMicrophoneEnabled;

  const toggleMute = async () => {
    await localParticipant.setMicrophoneEnabled(isMuted);
  };

  return (
    <div className="flex items-center gap-3 rounded-full bg-gray-100 px-4 py-2 dark:bg-gray-800">
      {/* Visualizer */}
      <div className="flex h-8 w-16 items-center justify-center">
        {audioTrack && state === "speaking" ? (
          <BarVisualizer
            state={state}
            trackRef={audioTrack}
            barCount={5}
            options={{ minHeight: 4 }}
          />
        ) : (
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full ${
                  state === "listening"
                    ? "animate-pulse bg-green-500"
                    : "bg-gray-400"
                }`}
                style={{ height: `${8 + Math.random() * 8}px` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {state === "listening"
          ? "Listening..."
          : state === "speaking"
            ? "Speaking..."
            : state === "thinking"
              ? "Thinking..."
              : "Connected"}
      </span>

      {/* Mute button */}
      <button
        onClick={toggleMute}
        className={`rounded-full p-2 transition-colors ${
          isMuted
            ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900 dark:text-red-400"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
        }`}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>

      {/* Disconnect button */}
      <button
        onClick={onDisconnect}
        className="rounded-full bg-red-100 p-2 text-red-600 transition-colors hover:bg-red-200 dark:bg-red-900 dark:text-red-400"
        title="End conversation"
      >
        <PhoneOff className="h-4 w-4" />
      </button>
    </div>
  );
}
