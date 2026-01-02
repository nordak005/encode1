/**
 * AI State Type - Single Source of Truth
 * 
 * Defines all possible states for the AI copilot character.
 * This prevents bugs and keeps behavior intentional.
 */
export type AIState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "unsure"
  | "warning";

