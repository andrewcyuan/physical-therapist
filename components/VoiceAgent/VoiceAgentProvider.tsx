"use client";

import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import "@livekit/components-styles";
import { ReactNode, useState, useCallback, useEffect, useRef } from "react";
import { useWorkoutStore } from "@/lib/stores/workoutStore";
import type { ExerciseContextMessage, ExerciseSwitchMessage } from "@/types/agentMessages";

interface ConnectionDetails {
  serverUrl: string;
  roomName: string;
  participantToken: string;
  participantName: string;
}

interface VoiceAgentProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

function ExerciseContextSender() {
  const room = useRoomContext();
  const workout = useWorkoutStore((state) => state.workout);
  const currentExerciseIndex = useWorkoutStore((state) => state.currentExerciseIndex);
  const currentSetIndex = useWorkoutStore((state) => state.currentSetIndex);

  useEffect(() => {
    if (!room || !workout) return;

    if (room.state !== "connected") {
      console.warn(
        "[ExerciseContextSender] Room not connected, skipping context publish. State:",
        room.state,
      );
      return;
    }

    const exerciseSet = workout.exercises[currentExerciseIndex];
    if (!exerciseSet) return;

    const message: ExerciseContextMessage = {
      type: "exercise_context",
      workout: { name: workout.name, difficulty: workout.difficulty },
      currentExercise: {
        name: exerciseSet.exercises.name,
        description: exerciseSet.exercises.description,
        orientation: exerciseSet.exercises.orientation_instructions,
      },
      sets: exerciseSet.num_sets,
      currentSet: currentSetIndex + 1,
      reps: exerciseSet.num_reps,
    };

    const encoder = new TextEncoder();
    const payload = encoder.encode(JSON.stringify(message));

    try {
      room.localParticipant.publishData(payload, { reliable: true });
    } catch (err) {
      console.error(
        "[ExerciseContextSender] Failed to publish exercise context:",
        err,
      );
    }
  }, [room, room?.state, workout, currentExerciseIndex, currentSetIndex]);

  return null;
}

function ExerciseSwitchSender() {
  const room = useRoomContext();
  const workout = useWorkoutStore((state) => state.workout);
  const currentExerciseIndex = useWorkoutStore((state) => state.currentExerciseIndex);
  const currentSetIndex = useWorkoutStore((state) => state.currentSetIndex);

  const prevExerciseIndex = useRef<number | null>(null);
  const prevSetIndex = useRef<number | null>(null);

  useEffect(() => {
    if (!room || !workout) return;

    if (room.state !== "connected") {
      console.warn(
        "[ExerciseSwitchSender] Room not connected, skipping switch publish. State:",
        room.state,
      );
      return;
    }

    const exerciseSet = workout.exercises[currentExerciseIndex];
    if (!exerciseSet) return;

    const isInitialRender =
      prevExerciseIndex.current === null && prevSetIndex.current === null;
    const exerciseChanged = prevExerciseIndex.current !== currentExerciseIndex;
    const setChanged = prevSetIndex.current !== currentSetIndex;

    prevExerciseIndex.current = currentExerciseIndex;
    prevSetIndex.current = currentSetIndex;

    if (isInitialRender) return;

    if (!exerciseChanged && !setChanged) return;

    const message: ExerciseSwitchMessage = {
      type: "exercise_switch",
      exerciseName: exerciseSet.exercises.name,
      currentSet: currentSetIndex + 1,
      totalSets: exerciseSet.num_sets,
      isNewExercise: exerciseChanged,
    };

    const encoder = new TextEncoder();
    const payload = encoder.encode(JSON.stringify(message));

    try {
      room.localParticipant.publishData(payload, {
        reliable: true,
      });
    } catch (err) {
      console.error(
        "[ExerciseSwitchSender] Failed to publish exercise switch:",
        err,
      );
    }
  }, [room, room?.state, workout, currentExerciseIndex, currentSetIndex]);

  return null;
}

export function VoiceAgentProvider({ children, autoConnect = false }: VoiceAgentProviderProps) {
  const [connectionDetails, setConnectionDetails] =
    useState<ConnectionDetails | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasManuallyDisconnected, setHasManuallyDisconnected] = useState(false);

  const connect = useCallback(async () => {
    setHasManuallyDisconnected(false);
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
    setHasManuallyDisconnected(true);
    setConnectionDetails(null);
  }, []);

  // Auto-connect on mount if autoConnect is true (and user hasn't manually disconnected)
  useEffect(() => {
    if (autoConnect && !connectionDetails && !isConnecting && !hasManuallyDisconnected) {
      connect();
    }
  }, [autoConnect, connectionDetails, isConnecting, hasManuallyDisconnected, connect]);

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
        <ExerciseContextSender />
        <ExerciseSwitchSender />
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
