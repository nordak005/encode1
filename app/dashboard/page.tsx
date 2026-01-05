"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { AIState } from "@/types/aiState";
import Copilot from "@/components/Copilot";

interface ProcessResult {
  labels: string[];
  confidence: number;
  filename?: string;
  size?: number;
  type?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ingredient analysis state
  const [ingredients, setIngredients] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState("");

  // Voice input/output state
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] =
    useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  // AI State - Single Source of Truth
  const [aiState, setAiState] = useState<AIState>("idle");

  // Derive emotional mood from analysis result
  const emotionalMood = useMemo(() => {
    if (!analysisResult) return null;
    const text = analysisResult.toLowerCase();

    // Negative keywords
    const negativeKeywords = [
      "high sugar",
      "artificial",
      "preservative",
      "processed",
      "additives",
      "synthetic",
    ];
    const hasNegative = negativeKeywords.some((keyword) =>
      text.includes(keyword)
    );

    // Positive keywords
    const positiveKeywords = [
      "organic",
      "natural",
      "whole",
      "healthy",
      "nutritious",
      "fresh",
    ];
    const hasPositive = positiveKeywords.some((keyword) =>
      text.includes(keyword)
    );

    if (hasNegative) return "negative";
    if (hasPositive) return "positive";
    return null;
  }, [analysisResult]);

  // Cursor awareness state
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isPreparing, setIsPreparing] = useState(false);
  const [cursorTransform, setCursorTransform] = useState<React.CSSProperties>(
    {}
  );
  const mouseUpdateRef = useRef<number | null>(null);
  const mascotContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    // Check if user is authenticated
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        router.push("/login");
        return;
      }
      setUser(user);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Auto-reset: After speaking, return to idle (feels human)
  // This is a fallback in case audio.onended doesn't fire
  useEffect(() => {
    if (aiState === "speaking") {
      const timer = setTimeout(() => {
        // Only reset if still speaking (audio.onended should handle it, but this is a safety net)
        if (aiState === "speaking") {
          setAiState("idle");
        }
      }, 10000); // Fallback: Reset to idle after 10 seconds if audio doesn't end properly
      return () => clearTimeout(timer);
    }
  }, [aiState]);

  // State transition: When user types, show listening state
  useEffect(() => {
    if (ingredients.trim() && !analyzing && !listening) {
      // Only set to listening if user is actively typing
      const timer = setTimeout(() => {
        if (ingredients.trim() && !analyzing) {
          setAiState("listening");
        }
      }, 500); // Debounce: wait 500ms after typing stops
      return () => clearTimeout(timer);
    } else if (!ingredients.trim() && aiState === "listening" && !analyzing) {
      setAiState("idle");
    }
  }, [ingredients, analyzing, listening]);

  // Check browser support for speech APIs
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check SpeechRecognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        setSpeechRecognitionSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          try {
            const transcript = event.results[0][0].transcript;
            setIngredients((prev) => prev + (prev ? " " : "") + transcript);
            setListening(false);
            setAiState("idle");
            setMicError(null);
          } catch (error) {
            console.error("Error processing recognition result:", error);
            setMicError("Failed to process speech. Please try again.");
            setListening(false);
            setAiState("idle");
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setListening(false);
          setAiState("idle");

          // Provide user-friendly error messages
          let errorMessage = "Speech recognition error occurred.";
          switch (event.error) {
            case "no-speech":
              errorMessage = "No speech detected. Please try again.";
              break;
            case "audio-capture":
              errorMessage =
                "Microphone not found or not accessible. Please check your microphone permissions.";
              break;
            case "not-allowed":
              errorMessage =
                "Microphone permission denied. Please allow microphone access in your browser settings.";
              break;
            case "network":
              errorMessage =
                "Network error. Please check your internet connection.";
              break;
            case "aborted":
              errorMessage = "Speech recognition was aborted.";
              break;
            case "service-not-allowed":
              errorMessage =
                "Speech recognition service not allowed. Please check your browser settings.";
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}. Please try again.`;
          }
          setMicError(errorMessage);
        };

        recognition.onstart = () => {
          setMicError(null);
          setListening(true);
          setAiState("listening");
        };

        recognition.onend = () => {
          setListening(false);
          // Always return to idle after listening ends
          setAiState("idle");
        };

        recognitionRef.current = recognition;
      } catch (error) {
        console.error("Failed to initialize SpeechRecognition:", error);
        setSpeechRecognitionSupported(false);
        setMicError(
          "Failed to initialize speech recognition. Your browser may not support this feature."
        );
      }
    } else {
      setSpeechRecognitionSupported(false);
      setMicError(
        "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari."
      );
    }

    // Store SpeechSynthesis reference and load voices
    if ("speechSynthesis" in window) {
      synthesisRef.current = window.speechSynthesis;
      // Load voices if not already loaded
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener("voiceschanged", () => {
          // Voices loaded
        });
      }
    }

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  // Lightweight mouse tracking for cursor awareness (desktop only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only track on desktop (not touch devices)
    const isDesktop = window.matchMedia("(pointer: fine)").matches;
    if (!isDesktop) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Throttle updates using requestAnimationFrame for performance
      if (mouseUpdateRef.current === null) {
        mouseUpdateRef.current = requestAnimationFrame(() => {
          setMousePosition({ x: e.clientX, y: e.clientY });
          mouseUpdateRef.current = null;
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (mouseUpdateRef.current !== null) {
        cancelAnimationFrame(mouseUpdateRef.current);
      }
    };
  }, []);

  // Calculate cursor-aware transform (only when idle)
  useEffect(() => {
    if (aiState !== "idle" || isPreparing || mousePosition.x === 0) {
      setCursorTransform({});
      return;
    }

    if (!mascotContainerRef.current) {
      return;
    }

    const rect = mascotContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = mousePosition.x - centerX;
    const deltaY = mousePosition.y - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 400; // Max distance to consider
    const influence = Math.min(1, maxDistance / Math.max(distance, 100));
    const maxRotation = 3; // Max rotation in degrees
    const maxLean = 2; // Max lean in pixels
    const rotation = (deltaX / maxDistance) * maxRotation * influence;
    const leanX = (deltaX / maxDistance) * maxLean * influence;
    const leanY = (deltaY / maxDistance) * maxLean * influence;

    setCursorTransform({
      transform: `translate(${leanX}px, ${leanY}px) rotate(${rotation}deg)`,
      transition: "transform 0.3s ease-out",
    });
  }, [mousePosition, aiState, isPreparing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
      setError("");
      setResult(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select an image file");
      return;
    }

    setProcessing(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch("/api/process-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to process image");
        setProcessing(false);
        return;
      }

      setResult(data);
      setProcessing(false);
    } catch {
      setError("An error occurred. Please try again.");
      setProcessing(false);
    }
  };

  const handleUploadButtonClick = () => {
    if (!selectedFile) {
      // No file selected - open file picker
      fileInputRef.current?.click();
    } else {
      // File selected - process upload
      handleUpload();
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleStartListening = async () => {
    if (!recognitionRef.current) {
      setMicError(
        "Speech recognition not initialized. Please refresh the page."
      );
      return;
    }

    if (listening) {
      // Already listening, stop first
      handleStopListening();
      return;
    }

    // Request microphone permission first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Permission granted, stop the stream and start recognition
      stream.getTracks().forEach((track) => track.stop());

      try {
        recognitionRef.current.start();
        setMicError(null);
        // State transition: User starts voice input → Listening
        setAiState("listening");
      } catch (error: any) {
        console.error("Failed to start recognition:", error);
        let errorMessage = "Failed to start speech recognition.";

        if (error.name === "InvalidStateError") {
          errorMessage = "Speech recognition is already running. Please wait.";
        } else if (error.message) {
          errorMessage = error.message;
        }

        setMicError(errorMessage);
        setListening(false);
        setAiState("idle");
      }
    } catch (error: any) {
      console.error("Microphone permission denied:", error);
      let errorMessage = "Microphone access denied.";

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        errorMessage =
          "Microphone permission denied. Please allow microphone access in your browser settings and try again.";
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        errorMessage =
          "No microphone found. Please connect a microphone and try again.";
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        errorMessage =
          "Microphone is being used by another application. Please close other apps using the microphone.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setMicError(errorMessage);
      setListening(false);
      setAiState("idle");
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current && listening) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
        setListening(false);
        // Always return to idle after stopping listening
        setAiState("idle");
        setMicError(null);
      } catch (error) {
        console.error("Failed to stop recognition:", error);
        setListening(false);
        setAiState("idle");
        // Try to abort if stop fails
        try {
          if (recognitionRef.current) {
            recognitionRef.current.abort();
          }
        } catch (e) {
          // Ignore abort errors
        }
      }
    }
  };

  const shortenForSpeech = (text: string) =>
    text.split("\n").slice(0, 5).join(". ");

  // Fallback: Use browser's built-in speech synthesis
  const speakWithBrowserTTS = (text: string) => {
    if (!("speechSynthesis" in window)) {
      setAnalysisError(
        "Your browser doesn't support speech synthesis. Please use Chrome, Edge, or Safari."
      );
      setAiState("idle");
      return;
    }

    setAiState("speaking");

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Configure voice settings
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use a natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find(
        (voice) =>
          (voice.name.includes("Natural") || voice.name.includes("Neural")) &&
          voice.lang.startsWith("en")
      ) ||
      voices.find(
        (voice) => voice.lang.startsWith("en") && voice.localService
      ) ||
      voices.find((voice) => voice.lang.startsWith("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Event handlers
    utterance.onend = () => {
      setAiState("idle");
    };

    utterance.onerror = (event) => {
      console.error("Browser TTS error:", event);
      setAnalysisError("Failed to speak text. Please try again.");
      setAiState("idle");
    };

    window.speechSynthesis.speak(utterance);
  };

  const speakText = async (text: string) => {
    setAiState("speaking");

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      // Check if response is OK
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("Speak API error:", errorData);

        // If it's a permission error, fall back to browser TTS
        if (errorData.useBrowserTTS) {
          console.log("Falling back to browser speech synthesis");
          speakWithBrowserTTS(text);
          return;
        }

        // Show user-friendly error message for other errors
        setAnalysisError(
          errorData.error ||
            (res.status === 401
              ? "Text-to-speech API key not configured. Please add ELEVENLABS_API_KEY to .env.local"
              : "Failed to generate speech. Please try again.")
        );
        setAiState("idle");
        return;
      }

      // Check if response is actually audio
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("audio")) {
        const errorText = await res.text();
        console.error("Unexpected response type:", contentType, errorText);
        setAnalysisError(
          "Invalid audio response. Please check your API configuration."
        );
        setAiState("idle");
        return;
      }

      const audioBlob = await res.blob();

      // Validate blob is not empty
      if (audioBlob.size === 0) {
        console.error("Empty audio blob received");
        setAnalysisError("Empty audio response. Please try again.");
        setAiState("idle");
        return;
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // Set audio properties for better compatibility
      audio.preload = "auto";

      // Wait for audio to be ready before playing
      audio.addEventListener("canplaythrough", () => {
        console.log("Audio ready to play");
      });

      // Return to idle when audio finishes playing
      audio.onended = () => {
        console.log("Audio playback finished");
        setAiState("idle");
        URL.revokeObjectURL(audioUrl); // Clean up
      };

      // Handle audio playback errors with detailed logging
      audio.onerror = (e) => {
        const error = audio.error;
        console.error("Audio playback error:", {
          error,
          code: error?.code,
          message: error?.message,
          networkState: audio.networkState,
          readyState: audio.readyState,
        });

        let errorMessage = "Failed to play audio.";
        if (error) {
          // MediaError codes: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED
          switch (error.code) {
            case 1: // MEDIA_ERR_ABORTED
              errorMessage = "Audio playback was aborted.";
              break;
            case 2: // MEDIA_ERR_NETWORK
              errorMessage = "Network error while loading audio.";
              break;
            case 3: // MEDIA_ERR_DECODE
              errorMessage =
                "Audio format not supported or corrupted. The API may have returned invalid audio data. Please check your ElevenLabs API key.";
              break;
            case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
              errorMessage =
                "Audio format not supported by your browser. The API may have returned an invalid format. Please check your ElevenLabs API configuration.";
              break;
            default:
              errorMessage = `Audio playback error (code ${error.code}): ${
                error.message || "Unknown error"
              }. Please check your ElevenLabs API key in .env.local`;
          }
        }

        setAnalysisError(errorMessage);
        setAiState("idle");
        URL.revokeObjectURL(audioUrl); // Clean up
      };

      // Try to play audio
      try {
        console.log(
          "Attempting to play audio, blob size:",
          audioBlob.size,
          "type:",
          audioBlob.type
        );
        await audio.play();
        console.log("Audio playback started successfully");
      } catch (playError: any) {
        console.error("Error playing audio:", playError);
        let errorMessage = "Failed to play audio. Please try again.";

        if (playError.name === "NotAllowedError") {
          errorMessage =
            "Audio playback blocked by browser. Please click to interact with the page first, then try again.";
        } else if (playError.name === "NotSupportedError") {
          errorMessage =
            "Audio format not supported. The API may have returned an invalid audio format. Please check your ElevenLabs API key and configuration.";
        } else if (playError.message) {
          errorMessage = `Audio playback error: ${playError.message}`;
        }

        setAnalysisError(errorMessage);
        setAiState("idle");
        URL.revokeObjectURL(audioUrl); // Clean up
      }
    } catch (error: any) {
      console.error("Error in speakText:", error);
      setAnalysisError(
        "Failed to generate speech. Please check your internet connection and try again."
      );
      setAiState("idle");
    }
  };

  const handleStopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setSpeaking(false);
      setAiState("idle");
    }
  };

  const handleCopilotClick = () => {
    setAiState("laugh");
    // Auto-reset to idle after 3 seconds (similar to warning state)
    setTimeout(() => setAiState("idle"), 3000);
  };

  const handleAnalyze = async () => {
    if (!ingredients.trim()) {
      setAnalysisError("Please enter ingredients to analyze");
      setAiState("warning");
      // Auto-reset warning after 3 seconds
      setTimeout(() => setAiState("idle"), 3000);
      return;
    }

    // Trigger prepare animation
    setIsPreparing(true);
    setTimeout(() => setIsPreparing(false), 400);

    // State transition: User submitted → Thinking
    setAiState("thinking");
    setAnalyzing(true);
    setAnalysisError("");
    setAnalysisResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAnalysisError("Something went wrong. Please try again.");
        setAnalyzing(false);
        setAiState("warning");
        // Auto-reset warning after 5 seconds
        setTimeout(() => setAiState("idle"), 5000);
        return;
      }

      setAnalysisResult(data.text);
      setAnalyzing(false);

      // State transition: Check confidence/uncertainty
      // If uncertain or low confidence → unsure state
      if (data.isUncertain || (data.confidence && data.confidence < 0.7)) {
        setAiState("unsure");
        // Still speak the response, but show unsure state
        if (data.text) {
          speakText(data.text);
        } else {
          setAiState("idle");
        }
      } else {
        // Normal response → Speaking
        if (data.text) {
          speakText(data.text);
          // Note: speakText will handle returning to idle when audio finishes
        } else {
          // No text to speak, return to idle immediately
          setAiState("idle");
        }
      }
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysisError("Something went wrong. Please try again.");
      setAnalyzing(false);
      setAiState("warning");
      // Auto-reset warning after 5 seconds
      setTimeout(() => setAiState("idle"), 5000);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-25">
      <style dangerouslySetInnerHTML={{
        __html: `
          .tagline {
            font-size: 0.875rem;
            color: #6b7280;
            text-align: center;
            font-weight: 400;
            line-height: 1.25;
          }
        `
      }} />
      <div className="bg-white/80 backdrop-blur-sm shadow-[0_2px_16px_rgba(0,0,0,0.04)] border-b border-blue-100/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Logo Placeholder */}
            <div className="flex flex-col items-start">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">L</span>
                </div>
                <span className="ml-3 text-xl font-semibold text-gray-800 tracking-tight">LabelSense</span>
              </div>
              <p className="tagline text-base text-gray-500 mt-1">
                Know what's inside before it goes inside you.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                aria-label="Sign out of your account"
                className="rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2.5 text-sm font-medium text-blue-700 shadow-[0_2px_8px_rgba(173,216,230,0.3)] transition-all duration-300 ease-in-out hover:from-blue-100 hover:to-blue-200 hover:shadow-[0_4px_16px_rgba(173,216,230,0.4)] hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="mx-auto max-w-[1920px] px-4 py-8 sm:px-6 sm:py-12 lg:px-12 lg:py-16 space-y-8 lg:space-y-12">

        {/* Top Row: Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 min-h-[400px]">

          {/* Left Column: Image Upload Box */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <div className={`rounded-2xl border backdrop-blur-[12px] shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-all duration-500 ease-out hover:scale-[1.01] p-4 lg:p-6 h-full ${
              processing
                ? "border-[rgba(16,185,129,0.6)] bg-[rgba(173,216,230,0.35)] shadow-[0_0_30px_rgba(16,185,129,0.4),0_16px_48px_rgba(0,0,0,0.12)] ring-2 ring-emerald-300/50 animate-pulse"
                : "border-[rgba(173,216,230,0.4)] bg-[rgba(173,216,230,0.25)] hover:bg-[rgba(173,216,230,0.35)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)]"
            }`}>
              <h2 className="text-lg font-light leading-7 text-gray-900 mb-4">
              📷 Image of Ingredient List
                </h2>

                {error && (
                <div className="mb-4 rounded-xl bg-gradient-to-r from-red-50 to-red-100 p-4 shadow-[0_4px_16px_rgba(239,68,68,0.15)] border border-red-200/50 backdrop-blur-sm transition-all duration-300 ease-in-out">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                )}

              <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="image-upload"
                    className="block text-sm font-normal text-gray-700 mb-2"
                    >
                      Select an image
                    </label>
                    <input
                      ref={fileInputRef}
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gradient-to-r file:from-blue-50 file:to-blue-100 file:text-blue-700 file:shadow-[0_2px_8px_rgba(173,216,230,0.3)] file:transition-all file:duration-300 hover:file:from-blue-100 hover:file:to-blue-200 hover:file:shadow-[0_4px_16px_rgba(173,216,230,0.4)]"
                    />
                    <p className="mt-2 text-xs text-gray-600">
                      Maximum file size: 10MB
                    </p>
                  </div>

                  {preview && (
                  <div className="mt-4 transition-all duration-300 ease-in-out">
                    <h3 className="text-sm font-normal text-gray-700 mb-2">
                        Preview
                      </h3>
                      <div className="relative inline-block">
                        <img
                          src={preview}
                          alt="Preview"
                        className="max-h-32 rounded-lg border border-gray-300 transition-all duration-300 ease-in-out hover:shadow-lg"
                        />
                      </div>
                    </div>
                  )}

                <div className="flex gap-3">
                    <button
                      onClick={handleUpload}
                      disabled={!selectedFile || processing}
                      aria-label={
                        processing
                          ? "Processing image"
                          : "Process uploaded image"
                      }
                    className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.3)] transition-all duration-300 ease-in-out hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_6px_24px_rgba(59,130,246,0.4)] hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-blue-600 disabled:hover:shadow-[0_4px_16px_rgba(59,130,246,0.3)] disabled:hover:scale-100"
                    >
                    {processing ? "Processing..." : "Process"}
                    </button>
                    {selectedFile && (
                      <button
                        onClick={handleReset}
                        disabled={processing}
                        aria-label="Reset image selection"
                      className="rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-in-out hover:from-gray-100 hover:to-gray-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-gray-50 disabled:hover:to-gray-100 disabled:hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] disabled:hover:scale-100"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {result && (
                  <div className="mt-6 rounded-xl bg-gradient-to-r from-green-50 to-green-100 p-4 shadow-[0_4px_16px_rgba(34,197,94,0.15)] border border-green-200/50 backdrop-blur-sm transition-all duration-300 ease-in-out">
                    <h3 className="text-sm font-medium text-green-800 mb-3">
                      Results
                      </h3>
                    <div className="space-y-2 text-xs">
                        <div>
                        <span className="font-medium text-green-800">
                            Labels:{" "}
                          </span>
                        <span className="text-green-700">
                            {result.labels.join(", ")}
                          </span>
                        </div>
                        <div>
                        <span className="font-medium text-green-800">
                            Confidence:{" "}
                          </span>
                        <span className="text-green-700">
                            {(result.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
            </div>

            {/* Upload Button - Under Image Box */}
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={handleUploadButtonClick}
                disabled={processing}
                aria-label={
                  processing
                    ? "Processing image"
                    : selectedFile
                    ? "Process uploaded image"
                    : "Select image file"
                }
                className={`group relative w-48 h-48 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 shadow-[0_16px_40px_rgba(16,185,129,0.4)] transition-all duration-300 ease-out hover:shadow-[0_20px_50px_rgba(16,185,129,0.6)] hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_16px_40px_rgba(16,185,129,0.4)] disabled:hover:scale-100 ${
                  processing
                    ? "shadow-[0_0_50px_rgba(16,185,129,0.9),0_0_100px_rgba(16,185,129,0.5)] animate-pulse ring-4 ring-emerald-300/60"
                    : selectedFile
                    ? "ring-3 ring-emerald-300/40 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                    : "ring-2 ring-emerald-200/30"
                }`}
                style={{
                  transform: processing ? 'translateY(-5px)' : selectedFile ? 'translateY(-2px)' : 'translateY(0)',
                }}
              >
                {/* Enhanced background glow */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-300 via-emerald-400 to-emerald-500 opacity-0 group-hover:opacity-40 transition-all duration-300 blur-sm"></div>
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-emerald-200 to-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>

                {/* Inner highlight */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/20 to-white/40 opacity-60"></div>

                <div className="relative z-10 flex items-center justify-center">
                  <span className={`text-5xl transition-all duration-300 ${processing ? "animate-pulse scale-110 drop-shadow-lg" : selectedFile ? "drop-shadow-md" : "drop-shadow-sm"}`}>
                    📂
                  </span>
                </div>

                {/* Processing animation rings */}
                {processing && (
                  <>
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-300/70 animate-ping"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-200/50 animate-ping animation-delay-300"></div>
                  </>
                )}

                {/* File selected indicator */}
                {selectedFile && !processing && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Middle Column: Copilot Character Area (Empty dedicated space) */}
          <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col items-center justify-center min-h-[400px] relative">
            {/* Subtle Radial Gradient Background */}
            <div
              className="absolute inset-0 pointer-events-none -z-0 rounded-2xl"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(173, 216, 230, 0.06) 0%, rgba(173, 216, 230, 0.03) 40%, transparent 70%)",
              }}
            />

            {/* Copilot Character Container */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
              {/* Outer Glow Aura */}
              <div
                className={`absolute rounded-full blur-3xl transition-all duration-700 ${
                  emotionalMood === "negative" && aiState === "speaking"
                    ? "opacity-50"
                    : emotionalMood === "positive" && aiState === "speaking"
                    ? "opacity-60"
                    : aiState === "idle"
                    ? "opacity-45"
                    : aiState === "thinking"
                    ? "opacity-30 animate-thinking-pulse"
                    : aiState === "speaking"
                    ? "opacity-55"
                    : aiState === "listening"
                    ? "opacity-45 animate-pulse"
                    : aiState === "unsure"
                    ? "opacity-40"
                    : aiState === "warning"
                    ? "opacity-45"
                    : "opacity-45"
                }`}
                style={{
                  width: "450px",
                  height: "450px",
                  background: `radial-gradient(circle, ${
                    emotionalMood === "negative" && aiState === "speaking"
                      ? "rgba(251, 146, 60, 0.6)"
                      : emotionalMood === "positive" && aiState === "speaking"
                      ? "rgba(34, 197, 94, 0.7)"
                      : aiState === "idle"
                      ? "rgba(96, 165, 250, 0.5)"
                      : aiState === "thinking"
                      ? "rgba(168, 85, 247, 0.4)"
                      : aiState === "speaking"
                      ? "rgba(74, 222, 128, 0.6)"
                      : aiState === "listening"
                      ? "rgba(96, 165, 250, 0.5)"
                      : aiState === "unsure"
                      ? "rgba(250, 204, 21, 0.5)"
                      : aiState === "warning"
                      ? "rgba(251, 146, 60, 0.6)"
                      : "rgba(248, 113, 113, 0.5)"
                  }, transparent 75%)`,
                }}
              />

              {/* Inner Aura Ring */}
              <div
                className={`absolute rounded-full blur-2xl transition-all duration-700 ${
                  emotionalMood === "negative" && aiState === "speaking"
                    ? "opacity-45"
                    : emotionalMood === "positive" && aiState === "speaking"
                    ? "opacity-55"
                    : aiState === "idle"
                    ? "opacity-40"
                    : aiState === "thinking"
                    ? "opacity-25 animate-thinking-pulse"
                    : aiState === "speaking"
                    ? "opacity-50"
                    : aiState === "listening"
                    ? "opacity-40 animate-pulse"
                    : aiState === "unsure"
                    ? "opacity-35"
                    : aiState === "warning"
                    ? "opacity-40"
                    : "opacity-40"
                }`}
                style={{
                  width: "380px",
                  height: "380px",
                  backgroundColor:
                    emotionalMood === "negative" && aiState === "speaking"
                      ? "rgba(251, 146, 60, 0.5)"
                      : emotionalMood === "positive" && aiState === "speaking"
                      ? "rgba(34, 197, 94, 0.6)"
                      : aiState === "idle"
                      ? "rgba(96, 165, 250, 0.45)"
                      : aiState === "thinking"
                      ? "rgba(168, 85, 247, 0.3)"
                      : aiState === "speaking"
                      ? "rgba(74, 222, 128, 0.55)"
                      : aiState === "listening"
                      ? "rgba(96, 165, 250, 0.45)"
                      : aiState === "unsure"
                      ? "rgba(250, 204, 21, 0.4)"
                      : aiState === "warning"
                      ? "rgba(251, 146, 60, 0.5)"
                      : "rgba(248, 113, 113, 0.45)",
                }}
              />

              {/* Mascot Container */}
              <div
                className="relative z-10 scale-[1.4] sm:scale-[1.6] lg:scale-[2.0]"
                ref={mascotContainerRef}
              >
                <div
                  className={
                    isPreparing
                      ? "animate-prepare"
                      : emotionalMood === "negative" && aiState === "speaking"
                      ? "animate-warning-lean"
                      : emotionalMood === "positive" && aiState === "speaking"
                      ? "animate-positive-happy"
                      : aiState === "listening"
                      ? "animate-listening-lean"
                      : aiState === "idle"
                      ? "animate-idle-sway"
                      : aiState === "thinking"
                      ? "animate-thinking-tilt"
                      : aiState === "speaking"
                      ? "animate-speaking-bounce"
                      : aiState === "warning"
                      ? "animate-warning-lean"
                      : ""
                  }
                  style={cursorTransform}
                >
                  <Copilot state={aiState} className="mt-6 drop-shadow-[0_16px_40px_rgba(0,0,0,0.2)]" onClick={handleCopilotClick} />
                </div>
              </div>

              {/* Status Messages */}
              {aiState === "thinking" && (
                <p className="mt-8 text-sm text-gray-600 font-medium animate-pulse text-center">
                  Thinking...
                </p>
              )}
              {aiState === "speaking" && (
                <p className="mt-8 text-sm text-gray-600 font-medium text-center">
                  Speaking...
                </p>
              )}
              {aiState === "listening" && (
                <p className="mt-8 text-sm text-blue-600 font-medium animate-pulse text-center">
                  Listening...
                </p>
              )}
              {aiState === "warning" && (
                <p className="mt-8 text-sm text-red-600 font-medium animate-pulse text-center">
                  ⚠️ Something went wrong
                </p>
              )}
              {aiState === "unsure" && (
                <p className="mt-8 text-sm text-yellow-600 font-medium animate-pulse text-center">
                  🤔 Not quite sure about this one...
                </p>
              )}
            </div>
          </div>

          {/* Right Column: History Box + Action Buttons */}
          <div className="lg:col-span-3 order-3 space-y-4">
            {/* History Box */}
            <div className="rounded-2xl border border-[rgba(173,216,230,0.4)] bg-[rgba(173,216,230,0.25)] backdrop-blur-[12px] shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-all duration-500 ease-out hover:bg-[rgba(173,216,230,0.35)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)] hover:scale-[1.01] p-4 lg:p-6">
              <h2 className="text-lg font-light leading-7 text-gray-900 mb-4">
              📜 History
              </h2>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                <p className="text-sm text-gray-600">
                  Past interactions and results will appear here...
                </p>
                <div className="text-xs text-gray-500 italic">
                  No history yet
                </div>
              </div>
            </div>


          </div>
        </div>

        {/* Bottom Section: Full-Width Ingredient Analysis Box */}
        <div className="rounded-2xl border border-[rgba(173,216,230,0.4)] bg-[rgba(173,216,230,0.25)] backdrop-blur-[12px] shadow-[0_16px_48px_rgba(0,0,0,0.08)] transition-all duration-500 ease-out hover:bg-[rgba(173,216,230,0.35)] hover:shadow-[0_20px_64px_rgba(0,0,0,0.12)] hover:scale-[1.005] p-8 lg:p-12">
          <h2 className="text-2xl font-light leading-7 text-gray-900 mb-8">
                  Ingredient Analysis
                </h2>

                {analysisError && (
            <div className="mb-8 rounded-xl bg-gradient-to-r from-red-50 to-red-100 p-6 shadow-[0_4px_16px_rgba(239,68,68,0.15)] border border-red-200/50 backdrop-blur-sm transition-all duration-300 ease-in-out">
              <p className="text-sm text-red-700 font-medium">{analysisError}</p>
                  </div>
                )}

          <div className="space-y-6">
                  <div>
              <div className="flex items-center justify-between mb-3">
                      <label
                        htmlFor="ingredients"
                        className="block text-sm font-normal text-gray-700"
                      >
                        Paste ingredient text
                      </label>
                      {speechRecognitionSupported && (
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={
                              listening
                                ? handleStopListening
                                : handleStartListening
                            }
                            aria-label={
                              listening
                                ? "Stop recording"
                                : "Start voice recording"
                            }
                            aria-pressed={listening}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-in-out ${
                              listening
                          ? "bg-gradient-to-r from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200 hover:shadow-[0_4px_16px_rgba(239,68,68,0.2)] hover:ring-2 hover:ring-red-300/40 active:scale-95 animate-[pulse_2s_ease-in-out_infinite]"
                          : "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:ring-2 hover:ring-gray-300/40 active:scale-95"
                            }`}
                          >
                            <span className={listening ? "animate-pulse" : ""}>
                              🎙
                            </span>
                            {listening ? "Stop" : "Record"}
                          </button>
                          {micError && (
                      <div className="rounded-lg bg-gradient-to-r from-red-50 to-red-100 border border-red-200/50 p-3 shadow-[0_2px_8px_rgba(239,68,68,0.15)] backdrop-blur-sm animate-slide-in">
                        <div className="flex items-start gap-3">
                                <svg
                            className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <p className="text-xs text-red-800">
                                  {micError}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {!speechRecognitionSupported && (
                        <p className="text-xs text-gray-600">
                          Voice input not supported in this browser
                        </p>
                      )}
                    </div>
                    {listening && (
                      <p
                  className="mb-4 text-xs text-gray-600"
                        aria-live="polite"
                      >
                        Listening...
                      </p>
                    )}
                    <textarea
                      id="ingredients"
                rows={8}
                      value={ingredients}
                      onChange={(e) => setIngredients(e.target.value)}
                      placeholder="Enter ingredients here..."
                className="block w-full rounded-lg border-0 px-4 py-3 text-gray-900 shadow-[0_2px_8px_rgba(173,216,230,0.2)] ring-1 ring-inset ring-blue-200/50 placeholder:text-gray-500 transition-all duration-300 ease-in-out focus:ring-2 focus:ring-inset focus:ring-blue-400 focus:shadow-[0_4px_16px_rgba(173,216,230,0.3)] bg-white/70 backdrop-blur-sm sm:text-sm sm:leading-6 overflow-y-auto resize-none min-h-[120px]"
                style={{ maxHeight: '200px' }}
                    />
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={!ingredients.trim() || analyzing || listening}
                    aria-label={
                      analyzing
                        ? "Analyzing ingredients"
                        : "Analyze ingredients"
                    }
              className={`w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-base font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.3)] transition-all duration-300 ease-in-out hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_6px_24px_rgba(59,130,246,0.4)] hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-blue-600 disabled:hover:shadow-[0_4px_16px_rgba(59,130,246,0.3)] disabled:hover:scale-100 ${
                      analyzing ? "animate-[pulse_2s_ease-in-out_infinite]" : ""
                    }`}
                  >
                    {analyzing ? (
                <span className="flex items-center justify-center gap-3">
                        <svg
                    className="animate-spin h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Analyzing...
                      </span>
                    ) : (
                "Analyze Ingredients"
                    )}
                  </button>

                  {speaking && (
              <div className="mt-8 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 p-6 shadow-[0_4px_16px_rgba(147,51,234,0.15)] border border-purple-200/50 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                  <p className="text-base text-purple-700 font-medium">Speaking...</p>
                        <button
                          onClick={handleStopSpeaking}
                          aria-label="Stop speech playback"
                    className="rounded-lg bg-gradient-to-r from-red-50 to-red-100 px-4 py-2 text-sm font-medium text-red-700 shadow-[0_2px_8px_rgba(239,68,68,0.2)] transition-all duration-300 ease-in-out hover:from-red-100 hover:to-red-200 hover:shadow-[0_4px_16px_rgba(239,68,68,0.3)] hover:ring-2 hover:ring-red-300/40 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                        >
                          Stop
                        </button>
                      </div>
                    </div>
                  )}

                  {analysisResult && (
              <div className="mt-8 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 p-8 shadow-[0_4px_16px_rgba(59,130,246,0.15)] border border-blue-200/50 backdrop-blur-sm transition-all duration-300 ease-in-out">
                <h3 className="text-lg font-medium text-blue-800 mb-6">
                        Analysis Result
                      </h3>
                <div className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">
                        {analysisResult}
                      </div>
                    </div>
                  )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-blue-100/50 mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm font-bold">L</span>
                </div>
                <span className="ml-2 text-lg font-semibold text-gray-800">LabelSense</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Advanced AI-powered food analysis for healthier eating. Understand your ingredients,
                make informed choices, and discover the nutritional value of your meals.
              </p>
              <div className="flex items-center text-xs text-gray-500">
                <span>© {new Date().getFullYear()} LabelSense. All rights reserved.</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    Feedback
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    Help Center
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-blue-100/50 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center space-x-6 mb-4 sm:mb-0">
              <a href="#" className="text-gray-500 hover:text-blue-600 transition-colors duration-200">
                <span className="sr-only">Facebook</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-500 hover:text-blue-600 transition-colors duration-200">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-500 hover:text-blue-600 transition-colors duration-200">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>

            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>Version 1.0.0</span>
              <span>•</span>
              <span>Last updated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
