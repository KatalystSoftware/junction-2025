/**
 * AudioWorklet processor for capturing raw PCM audio
 * This runs in the audio worklet thread (separate from main thread)
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Buffer for accumulating audio chunks (send ~100ms chunks)
    // At 16kHz, 100ms = 1600 samples = 3200 bytes
    this.buffer = [];
    this.bufferSize = 1600; // 100ms at 16kHz
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (input && input.length > 0) {
      const channelData = input[0]; // Mono channel

      if (channelData && channelData.length > 0) {
        // Convert Float32Array to Int16Array PCM
        const pcmData = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
          // Clamp to [-1, 1] and convert to 16-bit
          const s = Math.max(-1, Math.min(1, channelData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Add to buffer
        this.buffer.push(...pcmData);

        // Send when buffer is full enough
        if (this.buffer.length >= this.bufferSize) {
          const chunk = new Int16Array(this.buffer);
          this.port.postMessage(chunk.buffer, [chunk.buffer]);
          this.buffer = [];
        }
      }
    }

    // Return true to keep processor alive
    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
