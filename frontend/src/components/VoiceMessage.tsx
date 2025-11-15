import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import type { Message } from "../types/ui";

interface VoiceMessageProps {
  message: Message;
}

export function VoiceMessage({ message }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (message.audioUrl) {
      audioRef.current = new Audio(message.audioUrl);

      // Set up event listeners
      audioRef.current.addEventListener("ended", () => {
        setIsPlaying(false);
        setProgress(0);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      });

      audioRef.current.addEventListener("error", (e) => {
        console.error("Audio playback error:", e);
        setIsPlaying(false);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [message.audioUrl]);

  const handlePlayPause = () => {
    if (!audioRef.current) {
      // Fallback to simulation if no audio URL
      if (isPlaying) {
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        const duration = message.duration || 0;
        const interval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              clearInterval(interval);
              setIsPlaying(false);
              return 0;
            }
            return prev + (100 / duration) * 0.1;
          });
        }, 100);
      }
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    } else {
      audioRef.current.play();
      setIsPlaying(true);

      // Update progress bar
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          const current = audioRef.current.currentTime;
          const duration = audioRef.current.duration;
          setProgress((current / duration) * 100);
        }
      }, 100);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`max-w-[70%] px-3 py-2 ${
        message.role === "user"
          ? "rounded-tl-lg rounded-tr-lg rounded-bl-lg"
          : "rounded-tl-lg rounded-tr-lg rounded-br-lg"
      }`}
      style={{
        backgroundColor:
          message.role === "user" ? "var(--primary)" : "var(--card)",
        boxShadow: "var(--elevation-sm)",
      }}
    >
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor:
              message.role === "user"
                ? "rgba(255, 255, 255, 0.2)"
                : "var(--muted)",
          }}
        >
          {isPlaying ? (
            <Pause
              className="w-4 h-4"
              style={{
                color:
                  message.role === "user"
                    ? "var(--primary-foreground)"
                    : "var(--foreground)",
              }}
            />
          ) : (
            <Play
              className="w-4 h-4"
              style={{
                color:
                  message.role === "user"
                    ? "var(--primary-foreground)"
                    : "var(--foreground)",
              }}
            />
          )}
        </button>

        {/* Waveform Visualization */}
        <div className="flex-1 flex items-center gap-0.5 h-8">
          {[...Array(20)].map((_, i) => {
            // Fixed heights based on index to create a consistent waveform pattern
            const heights = [
              12, 18, 24, 20, 16, 28, 22, 18, 14, 20, 26, 22, 16, 18, 24, 20,
              16, 12, 18, 14,
            ];
            const height = heights[i];
            const isActive = (i / 20) * 100 <= progress;
            return (
              <div
                key={i}
                className="w-1 rounded-full transition-colors duration-200"
                style={{
                  height: `${height}px`,
                  backgroundColor: isActive
                    ? message.role === "user"
                      ? "var(--primary-foreground)"
                      : "var(--primary)"
                    : message.role === "user"
                      ? "rgba(255, 255, 255, 0.3)"
                      : "var(--border)",
                }}
              />
            );
          })}
        </div>

        {/* Duration */}
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--font-weight-medium)",
            color:
              message.role === "user"
                ? "var(--primary-foreground)"
                : "var(--muted-foreground)",
          }}
        >
          {formatDuration(message.duration || 0)}
        </span>
      </div>

      {/* Timestamp */}
      <span
        className="block text-right mt-1"
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "var(--text-xs)",
          color:
            message.role === "user"
              ? "var(--primary-foreground)"
              : "var(--muted-foreground)",
          opacity: 0.8,
        }}
      >
        {message.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}
