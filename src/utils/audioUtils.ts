import { AudioQualityMetrics } from '../types';

/**
 * Encodes an AudioBuffer into a standard 16-bit PCM WAV Blob
 * Standard RIFF header, uncompressed PCM audio format.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    result = new Float32Array(left.length + right.length);
    for (let i = 0; i < left.length; i++) {
      result[i * 2] = left[i];
      result[i * 2 + 1] = right[i];
    }
  } else {
    result = buffer.getChannelData(0);
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = result.length * bytesPerSample;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + dataSize, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, format, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate
  view.setUint32(28, byteRate, true);
  // block align
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, dataSize, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < result.length; i++) {
    // Clamp to -1..1
    const s = Math.max(-1, Math.min(1, result[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Calculates acoustic quality metrics on an AudioBuffer
 */
export function analyzeAudioBuffer(buffer: AudioBuffer): AudioQualityMetrics {
  const data = buffer.getChannelData(0);
  let peak = 0;
  let sumSquares = 0;
  let clippedCount = 0;
  let silenceCount = 0;
  const silenceThreshold = 0.015; // roughly -36 dB

  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) peak = abs;
    sumSquares += abs * abs;

    if (abs >= 0.98) {
      clippedCount++;
    }
    if (abs < silenceThreshold) {
      silenceCount++;
    }
  }

  const rms = Math.sqrt(sumSquares / data.length);
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -90;
  const avgDb = rms > 0 ? 20 * Math.log10(rms) : -90;
  const silenceRatio = silenceCount / data.length;
  const clippingDetected = clippedCount > (buffer.sampleRate * 0.005); // > 5ms of clip

  let status: AudioQualityMetrics['status'] = 'optimal';
  let feedback = 'Calidad acústica óptima. Rango dinámico y nivel adecuados para ElevenLabs.';

  if (clippingDetected || peakDb > -0.5) {
    status = 'clipped';
    feedback = '¡Alerta de saturación (clipping)! Tu voz ha rozado el límite superior. Aléjate 5 cm del micrófono o baja la ganancia.';
  } else if (peakDb < -18 || avgDb < -32) {
    status = 'low_volume';
    feedback = 'Volumen bajo. Para que la IA capte tus matices, habla con mayor proyección o acércate 5 cm al micrófono.';
  } else if (silenceRatio > 0.65) {
    status = 'too_noisy';
    feedback = 'Pausas excesivamente largas o baja relación señal-ruido. Procura leer de forma más continua.';
  }

  return {
    peakDb: Math.round(peakDb * 10) / 10,
    averageDb: Math.round(avgDb * 10) / 10,
    clippingDetected,
    silenceRatio: Math.round(silenceRatio * 100) / 100,
    sampleRate: buffer.sampleRate,
    status,
    feedback,
  };
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
}
