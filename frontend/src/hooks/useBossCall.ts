/**
 * Boss Call Hook using ElevenLabs SDK
 *
 * Uses the official SDK for reliable voice calls with the boss
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation } from '@elevenlabs/client';

export interface BossCallState {
  isConnected: boolean;
  isCallActive: boolean;
  callDuration: number;
  error: string | null;
  status: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'disconnected';
}

export interface UseBossCallReturn {
  state: BossCallState;
  startCall: () => Promise<void>;
  endCall: () => void;
}

export interface BossCallOptions {
  onCallEnded?: (duration: number) => void;
  reviewData?: any; // Review data to pass to ElevenLabs as variables
  language?: string; // User's preferred language
}

export function useBossCall(options?: BossCallOptions): UseBossCallReturn {
  const { onCallEnded, reviewData, language } = options || {};
  const [state, setState] = useState<BossCallState>({
    isConnected: false,
    isCallActive: false,
    callDuration: 0,
    error: null,
    status: 'idle',
  });

  const conversationRef = useRef<any>(null);
  const callStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCall = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, status: 'connecting', error: null }));
      console.log('🎙️ Starting boss call with ElevenLabs SDK...');

      // Get signed URL from backend with review data
      const response = await fetch('/api/game/elevenlabs-signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          review: reviewData,
          language: language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get signed URL from server');
      }

      const { signedUrl } = await response.json();
      console.log('✅ Got signed URL from server');
      if (reviewData) {
        console.log('📊 Review data passed to backend for ElevenLabs variables');
      }

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');

      // Start conversation using ElevenLabs SDK
      const conversation = await Conversation.startSession({
        signedUrl,
        connectionType: 'websocket', // Use WebSocket (can also use 'webrtc' for better quality)
        onConnect: () => {
          console.log('✅ Boss call connected');
          setState(prev => ({ ...prev, isConnected: true, isCallActive: true, status: 'connected' }));
          callStartTimeRef.current = Date.now();
          startDurationTimer();
        },
        onDisconnect: () => {
          console.log('📞 Boss call disconnected');
          const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
          setState(prev => ({ ...prev, isConnected: false, isCallActive: false, status: 'disconnected' }));
          stopDurationTimer();
          onCallEnded?.(duration);
        },
        onModeChange: (mode) => {
          console.log('🎙️ Mode changed:', mode);
          setState(prev => ({ ...prev, status: mode === 'speaking' ? 'speaking' : 'listening' }));
        },
        onError: (error) => {
          console.error('❌ Boss call error:', error);
          setState(prev => ({ ...prev, error: error.message || 'Call error', status: 'idle' }));
        },
        onMessage: (message) => {
          // Optional: Handle transcriptions and responses
          console.log('💬 Message:', message);
        },
      });

      conversationRef.current = conversation;
      console.log('✅ Boss call started successfully');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start call';
      console.error('❌ Failed to start boss call:', errorMsg);
      setState(prev => ({ ...prev, error: errorMsg, status: 'idle' }));
    }
  }, [onCallEnded, reviewData, language]);

  const endCall = useCallback(async () => {
    if (conversationRef.current) {
      console.log('📞 Ending boss call...');
      try {
        await conversationRef.current.endSession();
        conversationRef.current = null;
      } catch (error) {
        console.error('❌ Error ending call:', error);
      }
    }

    const duration = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
      : 0;

    setState(prev => ({
      ...prev,
      isCallActive: false,
      isConnected: false,
      status: 'disconnected',
    }));

    stopDurationTimer();
    onCallEnded?.(duration);
  }, [onCallEnded]);

  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    durationIntervalRef.current = setInterval(() => {
      const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      setState(prev => ({ ...prev, callDuration: duration }));
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  return {
    state,
    startCall,
    endCall,
  };
}
