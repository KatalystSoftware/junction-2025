/**
 * Custom React hook for capturing audio from microphone
 *
 * Handles MediaRecorder API for real-time audio streaming
 */

import { useState, useRef, useCallback, useEffect } from "react";

export interface AudioCaptureState {
  isRecording: boolean;
  hasPermission: boolean;
  error: string | null;
}

export interface UseAudioCaptureOptions {
  onAudioChunk?: (audioData: ArrayBuffer) => void;
  sampleRate?: number;
  chunkDuration?: number; // milliseconds
}

export interface UseAudioCaptureReturn {
  state: AudioCaptureState;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook for capturing audio from user's microphone
 */
export function useAudioCapture(options: UseAudioCaptureOptions = {}): UseAudioCaptureReturn {
  const { onAudioChunk, sampleRate = 16000, chunkDuration = 100 } = options;

  const [state, setState] = useState<AudioCaptureState>({
    isRecording: false,
    hasPermission: false,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: sampleRate,
        },
      });

      streamRef.current = stream;
      setState(prev => ({ ...prev, hasPermission: true, error: null }));

      console.log('🎤 Microphone permission granted');
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to access microphone';
      console.error('❌ Microphone permission denied:', errorMsg);
      setState(prev => ({ ...prev, hasPermission: false, error: errorMsg }));
      return false;
    }
  }, [sampleRate]);

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    try {
      // Request permission if not already granted
      if (!streamRef.current) {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error('Microphone permission required');
        }
      }

      const stream = streamRef.current!;

      // Create AudioContext for raw PCM processing
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: sampleRate,
        });
      }

      const audioContext = audioContextRef.current;

      // Load AudioWorklet module
      await audioContext.audioWorklet.addModule('/audio-processor.js');
      console.log('✅ AudioWorklet module loaded');

      // Create worklet node
      const workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');

      // Listen for audio data from worklet
      workletNode.port.onmessage = (event) => {
        if (onAudioChunk && event.data) {
          console.log('🎤 Captured PCM audio chunk, size:', event.data.byteLength, 'bytes');
          onAudioChunk(event.data);
        }
      };

      // Connect stream to worklet
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      // Store references for cleanup
      (mediaRecorderRef.current as any) = { workletNode, source };

      setState(prev => ({ ...prev, isRecording: true, error: null }));
      console.log('🎤 Recording started (AudioWorklet mode)');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start recording';
      console.error('❌ Failed to start recording:', errorMsg);
      setState(prev => ({ ...prev, error: errorMsg, isRecording: false }));
    }
  }, [onAudioChunk, chunkDuration, requestPermission]);

  /**
   * Stop recording audio
   */
  const stopRecording = useCallback(() => {
    // Clean up AudioWorklet and AudioContext
    if (mediaRecorderRef.current) {
      const refs = mediaRecorderRef.current as any;
      if (refs.workletNode) {
        refs.workletNode.disconnect();
        refs.source.disconnect();
        console.log('🛑 AudioWorklet disconnected');
      } else if (refs.processor) {
        // Legacy ScriptProcessor cleanup
        refs.processor.disconnect();
        refs.source.disconnect();
      } else if (mediaRecorderRef.current.state !== 'inactive') {
        // Old MediaRecorder cleanup
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    setState(prev => ({ ...prev, isRecording: false }));
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopRecording();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    state,
    startRecording,
    stopRecording,
    requestPermission,
  };
}

/**
 * Hook for video capture (for video calls)
 */
export interface UseVideoCaptureOptions {
  onVideoChunk?: (videoData: ArrayBuffer) => void;
  chunkDuration?: number;
}

export function useVideoCapture(options: UseVideoCaptureOptions = {}): UseAudioCaptureReturn {
  const { onVideoChunk, chunkDuration = 100 } = options;

  const [state, setState] = useState<AudioCaptureState>({
    isRecording: false,
    hasPermission: false,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Request camera + microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setState(prev => ({ ...prev, hasPermission: true, error: null }));

      console.log('📹 Camera permission granted');
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to access camera';
      console.error('❌ Camera permission denied:', errorMsg);
      setState(prev => ({ ...prev, hasPermission: false, error: errorMsg }));
      return false;
    }
  }, []);

  /**
   * Start recording video
   */
  const startRecording = useCallback(async () => {
    try {
      if (!streamRef.current) {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error('Camera permission required');
        }
      }

      const stream = streamRef.current!;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && onVideoChunk) {
          event.data.arrayBuffer().then((arrayBuffer) => {
            onVideoChunk(arrayBuffer);
          });
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setState(prev => ({ ...prev, error: 'Recording error', isRecording: false }));
      };

      mediaRecorder.onstop = () => {
        console.log('📹 Recording stopped');
        setState(prev => ({ ...prev, isRecording: false }));
      };

      mediaRecorder.start(chunkDuration);
      setState(prev => ({ ...prev, isRecording: true, error: null }));

      console.log('📹 Recording started');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start recording';
      console.error('❌ Failed to start recording:', errorMsg);
      setState(prev => ({ ...prev, error: errorMsg, isRecording: false }));
    }
  }, [onVideoChunk, chunkDuration, requestPermission]);

  /**
   * Stop recording video
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setState(prev => ({ ...prev, isRecording: false }));
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopRecording();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    state,
    startRecording,
    stopRecording,
    requestPermission,
  };
}
