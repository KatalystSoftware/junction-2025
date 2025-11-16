/**
 * Custom React hook for Gemini Live AI voice/video calls
 *
 * Handles WebSocket connection to backend for real-time character calls
 */

import { useState, useEffect, useRef, useCallback } from "react";

export interface LiveCallState {
  isConnected: boolean;
  isCallActive: boolean;
  callDuration: number;
  error: string | null;
  characterMessage: string | null;
}

export interface LiveCallMessage {
  type: "call_started" | "audio_chunk" | "character_message" | "call_ended" | "error" | "pong";
  sessionId?: string;
  character?: {
    name: string;
    age: number;
    occupation: string;
  };
  data?: string; // Base64 encoded audio
  text?: string;
  isFinal?: boolean;
  reason?: string;
  error?: string;
}

export interface UseLiveCallOptions {
  sessionId: string;
  characterId: string;
  onCallEnded?: (reason: string) => void;
  onError?: (error: string) => void;
  onCharacterMessage?: (message: string, isFinal: boolean) => void;
}

export interface UseLiveCallReturn {
  state: LiveCallState;
  startCall: () => Promise<void>;
  endCall: () => void;
  sendAudioChunk: (audioData: ArrayBuffer) => void;
  sendVideoChunk: (videoData: ArrayBuffer) => void;
}

/**
 * Hook for managing live AI calls with characters
 */
export function useLiveCall(options: UseLiveCallOptions): UseLiveCallReturn {
  const { sessionId, characterId, onCallEnded, onError, onCharacterMessage } = options;

  const [state, setState] = useState<LiveCallState>({
    isConnected: false,
    isCallActive: false,
    callDuration: 0,
    error: null,
    characterMessage: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * Start the live call
   */
  const startCall = useCallback(async () => {
    try {
      // Get WebSocket URL from current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/game/live-call`;

      console.log('🎙️ Connecting to live call WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setState(prev => ({ ...prev, isConnected: true, error: null }));

        // Send start call message
        ws.send(JSON.stringify({
          type: "start_call",
          sessionId,
          characterId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: LiveCallMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        const errorMsg = 'Failed to connect to call server';
        setState(prev => ({ ...prev, error: errorMsg, isConnected: false }));
        onError?.(errorMsg);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setState(prev => ({ ...prev, isConnected: false, isCallActive: false }));
        stopDurationTimer();
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to start call:', errorMsg);
      setState(prev => ({ ...prev, error: errorMsg }));
      onError?.(errorMsg);
    }
  }, [sessionId, characterId, onError]);

  /**
   * Handle incoming WebSocket messages
   */
  const handleWebSocketMessage = useCallback((message: LiveCallMessage) => {
    console.log('📥 Received message:', message.type);

    switch (message.type) {
      case "call_started":
        console.log('✅ Call started with character:', message.character?.name);
        setState(prev => ({
          ...prev,
          isCallActive: true,
          error: null
        }));
        callStartTimeRef.current = Date.now();
        startDurationTimer();
        break;

      case "audio_chunk":
        // Play audio chunk from AI character
        if (message.data) {
          playAudioChunk(message.data);
        }
        break;

      case "character_message":
        // Text message from character (for debugging or subtitles)
        if (message.text) {
          setState(prev => ({ ...prev, characterMessage: message.text! }));
          onCharacterMessage?.(message.text, message.isFinal || false);
        }
        break;

      case "call_ended":
        console.log('📞 Call ended:', message.reason);
        setState(prev => ({
          ...prev,
          isCallActive: false,
          isConnected: false
        }));
        stopDurationTimer();
        onCallEnded?.(message.reason || 'unknown');
        wsRef.current?.close();
        break;

      case "error":
        console.error('❌ Call error:', message.error);
        const errorMsg = message.error || 'Unknown error';
        setState(prev => ({ ...prev, error: errorMsg }));
        onError?.(errorMsg);
        break;

      case "pong":
        // Heartbeat response
        break;
    }
  }, [onCallEnded, onError, onCharacterMessage]);

  /**
   * End the call
   */
  const endCall = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_call" }));
      wsRef.current.close();
    }

    setState(prev => ({
      ...prev,
      isCallActive: false,
      isConnected: false
    }));

    stopDurationTimer();
  }, []);

  /**
   * Send audio chunk to backend
   */
  const sendAudioChunk = useCallback((audioData: ArrayBuffer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Convert ArrayBuffer to base64
      const base64Audio = arrayBufferToBase64(audioData);

      wsRef.current.send(JSON.stringify({
        type: "audio_chunk",
        data: base64Audio,
        format: "pcm",
      }));
    }
  }, []);

  /**
   * Send video chunk to backend (for video calls)
   */
  const sendVideoChunk = useCallback((videoData: ArrayBuffer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const base64Video = arrayBufferToBase64(videoData);

      wsRef.current.send(JSON.stringify({
        type: "video_chunk",
        data: base64Video,
        format: "webm",
      }));
    }
  }, []);

  /**
   * Play audio chunk from AI
   */
  const playAudioChunk = useCallback((base64Audio: string) => {
    try {
      // Initialize AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      // Decode base64 to ArrayBuffer
      const audioData = base64ToArrayBuffer(base64Audio);

      // Decode and play audio
      audioContext.decodeAudioData(audioData).then((audioBuffer) => {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
      }).catch((error) => {
        console.error('❌ Failed to decode audio:', error);
      });
    } catch (error) {
      console.error('❌ Failed to play audio chunk:', error);
    }
  }, []);

  /**
   * Start call duration timer
   */
  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    durationIntervalRef.current = setInterval(() => {
      const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      setState(prev => ({ ...prev, callDuration: duration }));
    }, 1000);
  }, []);

  /**
   * Stop call duration timer
   */
  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      endCall();
      stopDurationTimer();

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    state,
    startCall,
    endCall,
    sendAudioChunk,
    sendVideoChunk,
  };
}

/**
 * Helper: Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Helper: Convert base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
