"use client";

import { AIState } from "@/types/aiState";
import { copilotAnimations } from "@/config/copilotAnimations";
import Image from "next/image";

/**
 * Copilot Component
 * 
 * Dumb & Reliable - Only reacts, doesn't think.
 * No logic, no conditions, just rendering.
 */
interface CopilotProps {
  state: AIState;
  className?: string;
}

export default function Copilot({ state, className = "" }: CopilotProps) {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className="relative">
        <Image
          src={copilotAnimations[state]}
          alt="AI Copilot"
          width={176}
          height={176}
          className="w-44 h-44 select-none object-contain"
          draggable={false}
          unoptimized // For GIF animations
          onError={(e) => {
            // Fallback to static image if GIF doesn't exist
            const target = e.target as HTMLImageElement;
            target.src = "/character/assistant.png";
          }}
        />
      </div>
    </div>
  );
}

