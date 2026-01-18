import { useMaybeRoomContext } from "@livekit/components-react";
import { useCallback, useRef } from "react";
import type { FormAlertMessage } from "@/types/agentMessages";

export function useFormAlertSender() {
  const room = useMaybeRoomContext();
  const lastAlertRef = useRef<string>("");
  const lastAlertTimeRef = useRef<number>(0);

  const sendFormAlert = useCallback((alert: string, severity: "info" | "warning" = "warning") => {
    if (!room || room.state !== "connected") {
      console.warn("[FormAlertSender] Room not connected, skipping alert");
      return;
    }

    const now = Date.now();
    if (lastAlertRef.current === alert && now - lastAlertTimeRef.current < 5000) {
      return;
    }

    lastAlertRef.current = alert;
    lastAlertTimeRef.current = now;

    const message: FormAlertMessage = {
      type: "form_alert",
      alert,
      severity,
    };

    console.log("[FormAlertSender] 📤 Sending form alert:", message);

    const encoder = new TextEncoder();
    const payload = encoder.encode(JSON.stringify(message));

    try {
      room.localParticipant.publishData(payload, { reliable: true });
      console.log("[FormAlertSender] ✓ Form alert sent successfully");
    } catch (err) {
      console.error("[FormAlertSender] Failed to publish form alert:", err);
    }
  }, [room]);

  return { sendFormAlert };
}
