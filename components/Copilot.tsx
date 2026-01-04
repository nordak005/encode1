"use client";

import { AIState } from "@/types/aiState";
import { copilotAnimations } from "@/config/copilotAnimations";

/**
 * Copilot Component
 * 
 * Dumb & Reliable - Only reacts, doesn't think.
 * No logic, no conditions, just rendering.
 */
interface CopilotProps {
  state: AIState;
  className?: string;
  onClick?: () => void;
}

export default function Copilot({ state, className = "", onClick }: CopilotProps) {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className="relative cursor-pointer" onClick={onClick}>
        <video
          key={state} // Force re-render when state changes
          src={copilotAnimations[state]}
          width={176}
          height={176}
          className="w-44 h-44 select-none object-contain"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={(e) => {
            // Fallback to static image if WebM doesn't exist or fails to load
            const target = e.target as HTMLVideoElement;
            const container = target.parentElement;
            if (container) {
              container.innerHTML = `
                <img
                  src="/character/assistant.png"
                  alt="AI Copilot"
                  class="w-44 h-44 select-none object-contain"
                  draggable="false"
                />
              `;
            }
          }}
        />
      </div>
    </div>
  );
}

