/**
 * Live Call Dialog Component
 *
 * Full-screen dialog for live voice/video calls with AI characters
 */

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { PhoneOff, VideoOff } from "lucide-react";
import { useLiveCall } from "../hooks/useLiveCall";
import { useAudioCapture, useVideoCapture } from "../hooks/useAudioCapture";
import type { Contact } from "./WhatsAppInterface";

interface LiveCallDialogProps {
  contact: Contact;
  sessionId: string;
  isVideoCall: boolean;
  onClose: () => void;
}

function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function LiveCallDialog({
  contact,
  sessionId,
  isVideoCall,
  onClose,
}: LiveCallDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [characterSpeaking, setCharacterSpeaking] = useState<string | null>(null);

  // Initialize live call
  const {
    state: callState,
    startCall,
    endCall,
    sendAudioChunk,
    sendVideoChunk,
  } = useLiveCall({
    sessionId,
    characterId: contact.id,
    onCallEnded: (reason) => {
      console.log("📞 Call ended:", reason);
      onClose();
    },
    onError: (error) => {
      console.error("❌ Call error:", error);
      setErrorMessage(error);
    },
    onCharacterMessage: (message, isFinal) => {
      setCharacterSpeaking(isFinal ? null : message);
    },
  });

  // Initialize audio/video capture
  const audioCapture = useAudioCapture({
    onAudioChunk: (audioData) => {
      if (callState.isCallActive) {
        sendAudioChunk(audioData);
      }
    },
  });

  const videoCapture = useVideoCapture({
    onVideoChunk: (videoData) => {
      if (callState.isCallActive && isVideoCall) {
        sendVideoChunk(videoData);
      }
    },
  });

  // Start call on mount
  useEffect(() => {
    const initCall = async () => {
      try {
        // Request permissions first
        if (isVideoCall) {
          await videoCapture.requestPermission();
        } else {
          await audioCapture.requestPermission();
        }

        // Start the call
        await startCall();

        // Start recording
        if (isVideoCall) {
          await videoCapture.startRecording();
        } else {
          await audioCapture.startRecording();
        }
      } catch (error) {
        console.error("❌ Failed to initialize call:", error);
        setErrorMessage(error instanceof Error ? error.message : "Failed to start call");
      }
    };

    initCall();

    return () => {
      // Cleanup on unmount
      audioCapture.stopRecording();
      videoCapture.stopRecording();
      endCall();
    };
  }, []);

  // Handle hang up
  const handleHangUp = () => {
    audioCapture.stopRecording();
    videoCapture.stopRecording();
    endCall();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.9)",
      }}
    >
      <div className="w-full max-w-md mx-4 p-8 flex flex-col items-center">
        {/* Character Avatar */}
        <div className="mb-6">
          <Avatar className="w-64 h-64">
            <AvatarImage src={contact.avatarImage} alt={contact.name} />
            <AvatarFallback
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                fontFamily: "Inter, sans-serif",
                fontWeight: "var(--font-weight-medium)",
                fontSize: "4rem",
              }}
            >
              {contact.avatar}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Character Name */}
        <h3
          className="mb-2"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "var(--text-2xl)",
            fontWeight: "var(--font-weight-semibold)",
            color: "white",
          }}
        >
          {contact.name}
        </h3>

        {/* Call Duration */}
        <p
          className="mb-4"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "var(--text-lg)",
            color: "rgba(255, 255, 255, 0.7)",
            fontWeight: "var(--font-weight-medium)",
          }}
        >
          {formatCallDuration(callState.callDuration)}
        </p>

        {/* Status Indicator */}
        <div className="flex flex-col items-center gap-4 mb-6">
          {!callState.isCallActive && !errorMessage && (
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{
                  backgroundColor: "var(--chart-3)",
                }}
              />
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-sm)",
                  color: "rgba(255, 255, 255, 0.7)",
                }}
              >
                Connecting...
              </p>
            </div>
          )}

          {callState.isCallActive && !errorMessage && (
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{
                  backgroundColor: "var(--chart-1)",
                }}
              />
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-sm)",
                  color: "rgba(255, 255, 255, 0.9)",
                }}
              >
                {isVideoCall ? "Video" : "Voice"} call in progress...
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="text-center">
              <p
                className="mb-2"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-sm)",
                  color: "var(--destructive)",
                }}
              >
                Error: {errorMessage}
              </p>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-xs)",
                  color: "rgba(255, 255, 255, 0.5)",
                }}
              >
                Please check your microphone permissions and try again.
              </p>
            </div>
          )}

          {/* Character speaking indicator */}
          {characterSpeaking && (
            <div
              className="max-w-md text-center p-4 rounded-lg mt-4"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-sm)",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontStyle: "italic",
                }}
              >
                "{characterSpeaking}"
              </p>
            </div>
          )}
        </div>

        {/* Permission status */}
        {!callState.isCallActive && !audioCapture.state.hasPermission && !videoCapture.state.hasPermission && (
          <p
            className="mb-4 text-center"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-sm)",
              color: "rgba(255, 255, 255, 0.6)",
            }}
          >
            Requesting {isVideoCall ? "camera and microphone" : "microphone"} access...
          </p>
        )}

        {/* Hang Up Button */}
        <Button
          onClick={handleHangUp}
          variant="destructive"
          size="lg"
          className="mt-4 w-16 h-16"
          style={{
            borderRadius: "9999px",
          }}
        >
          {isVideoCall ? (
            <VideoOff className="w-6 h-6" />
          ) : (
            <PhoneOff className="w-6 h-6" />
          )}
        </Button>

        {/* Debug info (can be removed in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div
            className="mt-8 p-4 rounded text-xs text-left max-w-md"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: "rgba(255, 255, 255, 0.5)",
            }}
          >
            <p>🔧 Debug Info:</p>
            <p>• Connected: {callState.isConnected ? "✅" : "❌"}</p>
            <p>• Call Active: {callState.isCallActive ? "✅" : "❌"}</p>
            <p>• Audio Permission: {audioCapture.state.hasPermission ? "✅" : "❌"}</p>
            <p>• Recording: {audioCapture.state.isRecording || videoCapture.state.isRecording ? "✅" : "❌"}</p>
            {callState.error && <p>• Error: {callState.error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
