"use client";

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
        <MicrophoneIcon />
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
        {isMuted ? <MicrophoneOffIcon /> : <MicrophoneIcon />}
      </button>

      {/* Disconnect button */}
      <button
        onClick={onDisconnect}
        className="rounded-full bg-red-100 p-2 text-red-600 transition-colors hover:bg-red-200 dark:bg-red-900 dark:text-red-400"
        title="End conversation"
      >
        <PhoneOffIcon />
      </button>
    </div>
  );
}

function MicrophoneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function MicrophoneOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3zM3 3l18 18"
      />
    </svg>
  );
}

function PhoneOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.536 8.464a5 5 0 010 7.072M12 9.5v5m0 0l-3-3m3 3l3-3M3 3l18 18"
      />
    </svg>
  );
}
