"use client";

import { useState, useEffect, useRef } from "react";
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

  const handleAnalyze = async () => {
    if (!ingredients.trim()) {
      setAnalysisError("Please enter ingredients to analyze");
      setAiState("warning");
      // Auto-reset warning after 3 seconds
      setTimeout(() => setAiState("idle"), 3000);
      return;
    }

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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                aria-label="Sign out of your account"
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-200 ease-in-out hover:bg-gray-200 hover:shadow-md hover:shadow-gray-400/30 hover:ring-2 hover:ring-gray-300/30 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Three-Column Layout */}
      <div className="mx-auto max-w-[1920px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Context Wing */}
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-white/30 backdrop-blur-lg shadow-md rounded-2xl border border-white/20 transition-all duration-300 ease-in-out hover:shadow-lg">
              <div className="px-8 py-8 sm:px-10 sm:py-10">
                <h2 className="text-xl font-light leading-7 text-gray-900 mb-6">
                  Image Upload & Processing
                </h2>

                {error && (
                  <div className="mb-6 rounded-md bg-red-50 p-5 transition-all duration-300 ease-in-out">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="image-upload"
                      className="block text-sm font-normal text-gray-700 mb-3"
                    >
                      Select an image
                    </label>
                    <input
                      ref={fileInputRef}
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="mt-2 text-xs text-gray-600">
                      Maximum file size: 10MB
                    </p>
                  </div>

                  {preview && (
                    <div className="mt-6 transition-all duration-300 ease-in-out">
                      <h3 className="text-sm font-normal text-gray-700 mb-3">
                        Preview
                      </h3>
                      <div className="relative inline-block">
                        <img
                          src={preview}
                          alt="Preview"
                          className="max-h-64 rounded-lg border border-gray-300 transition-all duration-300 ease-in-out hover:shadow-lg"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={handleUpload}
                      disabled={!selectedFile || processing}
                      aria-label={
                        processing
                          ? "Processing image"
                          : "Process uploaded image"
                      }
                      className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-blue-500 hover:shadow-md hover:shadow-blue-500/50 hover:ring-2 hover:ring-blue-400/30 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:hover:shadow-sm disabled:hover:ring-0"
                    >
                      {processing ? "Processing..." : "Process Image"}
                    </button>
                    {selectedFile && (
                      <button
                        onClick={handleReset}
                        disabled={processing}
                        aria-label="Reset image selection"
                        className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-200 ease-in-out hover:bg-gray-200 hover:shadow-md hover:shadow-gray-400/30 hover:ring-2 hover:ring-gray-300/30 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:ring-0"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {result && (
                    <div className="mt-8 rounded-lg bg-green-50 p-6 transition-all duration-300 ease-in-out">
                      <h3 className="text-sm font-normal text-green-900 mb-4">
                        Processing Results
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-green-800">
                            Labels:{" "}
                          </span>
                          <span className="text-sm text-green-700">
                            {result.labels.join(", ")}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-green-800">
                            Confidence:{" "}
                          </span>
                          <span className="text-sm text-green-700">
                            {(result.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        {result.filename && (
                          <div>
                            <span className="text-sm font-medium text-green-800">
                              Filename:{" "}
                            </span>
                            <span className="text-sm text-green-700">
                              {result.filename}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* History Placeholder */}
            <div className="bg-white/30 backdrop-blur-lg shadow-md rounded-2xl border border-white/20 transition-all duration-300 ease-in-out hover:shadow-lg">
              <div className="px-8 py-8 sm:px-10 sm:py-10">
                <h2 className="text-xl font-light leading-7 text-gray-900 mb-6">
                  History
                </h2>
                <p className="text-sm text-gray-600">
                  History will appear here
                </p>
              </div>
            </div>
          </div>

          {/* Center Column: Mascot Stage */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center py-16 relative">
            {/* Subtle Radial Gradient Background */}
            <div
              className="absolute inset-0 pointer-events-none -z-0"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(191, 219, 254, 0.12) 0%, rgba(199, 210, 254, 0.06) 40%, transparent 70%)",
              }}
            />
            <div className="flex flex-col items-center justify-center relative">
              {/* Outer Glow Aura - Radial Gradient Effect */}
              <div
                className={`absolute rounded-full blur-3xl opacity-40 transition-all duration-500 ${
                  aiState === "idle"
                    ? "bg-blue-400"
                    : aiState === "thinking"
                    ? "bg-purple-400"
                    : aiState === "speaking"
                    ? "bg-green-400 animate-pulse"
                    : aiState === "listening"
                    ? "bg-blue-400 animate-pulse"
                    : aiState === "unsure"
                    ? "bg-yellow-400"
                    : "bg-red-400"
                }`}
                style={{
                  width: "400px",
                  height: "400px",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: `radial-gradient(circle, ${
                    aiState === "idle"
                      ? "rgba(96, 165, 250, 0.4)"
                      : aiState === "thinking"
                      ? "rgba(168, 85, 247, 0.4)"
                      : aiState === "speaking"
                      ? "rgba(74, 222, 128, 0.4)"
                      : aiState === "listening"
                      ? "rgba(96, 165, 250, 0.4)"
                      : aiState === "unsure"
                      ? "rgba(250, 204, 21, 0.4)"
                      : "rgba(248, 113, 113, 0.4)"
                  }, transparent 70%)`,
                }}
              />

              {/* Inner Aura Ring - Changes color based on state */}
              <div
                className={`absolute rounded-full blur-2xl opacity-35 transition-all duration-500 ${
                  aiState === "idle"
                    ? "bg-blue-400"
                    : aiState === "thinking"
                    ? "bg-purple-400"
                    : aiState === "speaking"
                    ? "bg-green-400 animate-pulse"
                    : aiState === "listening"
                    ? "bg-blue-400 animate-pulse"
                    : aiState === "unsure"
                    ? "bg-yellow-400"
                    : "bg-red-400"
                }`}
                style={{
                  width: "360px",
                  height: "360px",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />

              {/* Circular Stage Shadow - Enhanced */}
              <div
                className="absolute rounded-full bg-gradient-to-b from-gray-300/30 via-gray-200/20 to-transparent blur-2xl"
                style={{
                  width: "320px",
                  height: "320px",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />

              {/* Additional Stage Base Shadow */}
              <div
                className="absolute rounded-full bg-gray-200/25 blur-xl"
                style={{
                  width: "300px",
                  height: "100px",
                  top: "calc(50% + 120px)",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />

              {/* Mascot Container - Increased by ~20% (from 150% to 180%) */}
              <div className="relative z-10 scale-[1.8]">
                <Copilot state={aiState} className="mt-6" />
              </div>

              {/* Status Messages */}
              {aiState === "thinking" && (
                <p className="mt-8 text-sm text-gray-500 font-medium animate-pulse">
                  Thinking...
                </p>
              )}
              {aiState === "speaking" && (
                <p className="mt-8 text-sm text-gray-500 font-medium">
                  Speaking...
                </p>
              )}
              {aiState === "listening" && (
                <p className="mt-8 text-sm text-blue-600 font-medium animate-pulse">
                  Listening...
                </p>
              )}
              {aiState === "warning" && (
                <p className="mt-8 text-sm text-red-600 font-medium animate-pulse">
                  ⚠️ Something went wrong
                </p>
              )}
              {aiState === "unsure" && (
                <p className="mt-8 text-sm text-yellow-600 font-medium animate-pulse">
                  🤔 Not quite sure about this one...
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Action Wing */}
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-white/30 backdrop-blur-lg shadow-md rounded-2xl border border-white/20 transition-all duration-300 ease-in-out hover:shadow-lg">
              <div className="px-8 py-8 sm:px-10 sm:py-10">
                <h2 className="text-xl font-light leading-7 text-gray-900 mb-6">
                  Ingredient Analysis
                </h2>

                {analysisError && (
                  <div className="mb-6 rounded-md bg-red-50 p-5 transition-all duration-300 ease-in-out">
                    <p className="text-sm text-red-800">{analysisError}</p>
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
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
                            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-300 ease-in-out ${
                              listening
                                ? "bg-red-100 text-red-700 hover:bg-red-200 hover:shadow-md hover:shadow-red-400/40 hover:ring-2 hover:ring-red-300/40 active:scale-95 animate-[pulse_2s_ease-in-out_infinite]"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md hover:shadow-gray-400/30 hover:ring-2 hover:ring-gray-300/30 active:scale-95"
                            }`}
                          >
                            <span className={listening ? "animate-pulse" : ""}>
                              🎙
                            </span>
                            {listening ? "Stop" : "Record"}
                          </button>
                          {micError && (
                            <div className="rounded-md bg-red-50 border border-red-200 p-2 animate-slide-in">
                              <div className="flex items-start gap-2">
                                <svg
                                  className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0"
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
                        className="mb-3 text-xs text-gray-600"
                        aria-live="polite"
                      >
                        Listening...
                      </p>
                    )}
                    <textarea
                      id="ingredients"
                      rows={6}
                      value={ingredients}
                      onChange={(e) => setIngredients(e.target.value)}
                      placeholder="Enter ingredients here..."
                      className="block w-full rounded-md border-0 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 transition-all duration-200 ease-in-out focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:shadow-md sm:text-sm sm:leading-6"
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
                    className={`w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-blue-500 hover:shadow-md hover:shadow-blue-500/50 hover:ring-2 hover:ring-blue-400/30 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:hover:shadow-sm disabled:hover:ring-0 ${
                      analyzing ? "animate-[pulse_2s_ease-in-out_infinite]" : ""
                    }`}
                  >
                    {analyzing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4 text-white"
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
                      "Analyze"
                    )}
                  </button>

                  {speaking && (
                    <div className="mt-6 rounded-md bg-purple-50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">Speaking...</p>
                        <button
                          onClick={handleStopSpeaking}
                          aria-label="Stop speech playback"
                          className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-all duration-200 ease-in-out hover:bg-red-200 hover:shadow-md hover:shadow-red-400/40 hover:ring-2 hover:ring-red-300/40 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                        >
                          Stop
                        </button>
                      </div>
                    </div>
                  )}

                  {analysisResult && (
                    <div className="mt-8 rounded-lg bg-blue-50 p-6 transition-all duration-300 ease-in-out">
                      <h3 className="text-sm font-normal text-blue-900 mb-4">
                        Analysis Result
                      </h3>
                      <div className="text-sm text-blue-800 whitespace-pre-wrap">
                        {analysisResult}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
