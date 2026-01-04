import { AIState } from "@/types/aiState";

/**
 * Central Animation Map
 *
 * Maps AI states to their corresponding WebM animations.
 * Never hardcode WebM paths in components - use this map instead.
 *
 * Place your WebM files in: public/copilot/
 * - idle.webm
 * - listening.webm
 * - thinking.webm
 * - speaking.webm
 * - unsure.webm
 * - warning.webm
 * - laugh.webm
 */
export const copilotAnimations: Record<AIState, string> = {
  idle: "/copilot/idle.webm",
  listening: "/copilot/listening.webm",
  thinking: "/copilot/thinking.webm",
  speaking: "/copilot/speaking.webm",
  unsure: "/copilot/unsure.webm",
  warning: "/copilot/warning.webm",
  laugh: "/copilot/laugh.webm",
};

