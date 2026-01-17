"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { ReactNode, useState, useCallback } from "react";

interface ConnectionDetails {
  serverUrl: string;
  roomName: string;
  participantToken: string;
  participantName: string;
}

interface VoiceAgentProviderProps {
  children: ReactNode;
}

export function VoiceAgentProvider({ children }: VoiceAgentProviderProps) {
  const [connectionDetails, setConnectionDetails] =
    useState<ConnectionDetails | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch("/api/livekit/connection-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Failed to get connection details");
      }

      const details = await response.json();
      setConnectionDetails(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnectionDetails(null);
  }, []);

  if (!connectionDetails) {
    return (
      <VoiceAgentContext.Provider
        value={{ isConnected: false, isConnecting, error, connect, disconnect }}
      >
        {children}
      </VoiceAgentContext.Provider>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={connectionDetails.serverUrl}
      token={connectionDetails.participantToken}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={disconnect}
    >
      <VoiceAgentContext.Provider
        value={{ isConnected: true, isConnecting, error, connect, disconnect }}
      >
        {children}
        <RoomAudioRenderer />
      </VoiceAgentContext.Provider>
    </LiveKitRoom>
  );
}

import { createContext, useContext } from "react";

interface VoiceAgentContextType {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const VoiceAgentContext = createContext<VoiceAgentContextType>({
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
});

export function useVoiceAgentContext() {
  return useContext(VoiceAgentContext);
}
