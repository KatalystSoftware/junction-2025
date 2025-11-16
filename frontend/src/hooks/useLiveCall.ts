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
  language?: "english" | "finnish" | "swedish";
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
  const { sessionId, characterId, language = "english", onCallEnded, onError, onCharacterMessage } = options;

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

        // Send start call message with language preference
        ws.send(JSON.stringify({
          type: "start_call",
          sessionId,
          characterId,
          language,
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
          console.log('🎵 Received audio chunk, length:', message.data.length);
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

      console.log('📤 Sending audio chunk to backend, size:', audioData.byteLength, 'bytes, base64 length:', base64Audio.length);

      wsRef.current.send(JSON.stringify({
        type: "audio_chunk",
        data: base64Audio,
        format: "pcm",
      }));
    } else {
      console.warn('⚠️ Cannot send audio - WebSocket not open, state:', wsRef.current?.readyState);
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
      console.log('🔊 Attempting to play audio chunk...');

      // Initialize AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🎵 Created new AudioContext');
      }

      const audioContext = audioContextRef.current;

      // Decode base64 to ArrayBuffer (raw PCM from ElevenLabs)
      const pcmData = base64ToArrayBuffer(base64Audio);
      console.log('📦 Decoded PCM data, size:', pcmData.byteLength, 'bytes');

      // Convert raw PCM to WAV format (needed for AudioContext.decodeAudioData)
      const wavData = pcmToWav(pcmData, 16000, 1); // 16kHz, mono
      console.log('🎵 Converted to WAV, size:', wavData.byteLength, 'bytes');

      // Decode and play audio
      audioContext.decodeAudioData(wavData.slice(0)).then((audioBuffer) => {
        console.log('✅ Audio decoded successfully, duration:', audioBuffer.duration, 's');
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
        console.log('▶️ Audio playing');
      }).catch((error) => {
        console.error('❌ Failed to decode audio data:', error);
        console.error('   WAV data size:', wavData.byteLength);
        console.error('   First 20 bytes:', new Uint8Array(wavData.slice(0, 20)));
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

/**
 * Helper: Convert raw PCM data to WAV format
 * ElevenLabs sends PCM 16kHz mono audio, but browsers need WAV headers
 */
function pcmToWav(pcmData: ArrayBuffer, sampleRate: number, numChannels: number): ArrayBuffer {
  const pcmBytes = new Int16Array(pcmData);
  const wavHeaderSize = 44;
  const wavBuffer = new ArrayBuffer(wavHeaderSize + pcmData.byteLength);
  const view = new DataView(wavBuffer);

  // Write WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.byteLength, true); // File size - 8
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, pcmData.byteLength, true); // Subchunk2Size

  // Copy PCM data
  const wavBytes = new Int16Array(wavBuffer, wavHeaderSize);
  wavBytes.set(pcmBytes);

  return wavBuffer;
}
