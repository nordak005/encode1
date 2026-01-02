import { AIState } from "@/types/aiState";

/**
 * Central Animation Map
 * 
 * Maps AI states to their corresponding GIF animations.
 * Never hardcode GIF paths in components - use this map instead.
 * 
 * Place your GIF files in: public/copilot/
 * - idle.gif
 * - listening.gif
 * - thinking.gif
 * - speaking.gif
 * - unsure.gif
 * - warning.gif
 */
export const copilotAnimations: Record<AIState, string> = {
  idle: "/copilot/idle.gif",
  listening: "/copilot/listening.gif",
  thinking: "/copilot/thinking.gif",
  speaking: "/copilot/speaking.gif",
  unsure: "/copilot/unsure.gif",
  warning: "/copilot/warning.gif",
};

