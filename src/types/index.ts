export type VocalRegister =
  | 'narrative'
  | 'energy'
  | 'explanatory'
  | 'intimate'
  | 'conversational';

export type StudioStepId = 'teleprompter' | 'samples' | 'guide' | 'editor' | 'production';

export interface StudioStepInfo {
  id: StudioStepId;
  stepNumber: number;
  label: string;
  shortTitle: string;
  description: string;
  requirementToUnlockNext: string;
}

export interface TeleprompterSentence {
  text: string;
  cue: string; // e.g. "Sonríe y proyecta calidez", "Baja el volumen a un susurro", "Pausa de 1 segundo"
  emphasisWords?: string[];
}

export interface TeleprompterScriptItem {
  id: string;
  title: string;
  register: VocalRegister;
  categoryName: string;
  durationTargetSec: number;
  emotionLabel: string;
  phoneticPurpose: string;
  generalDirectorNote: string;
  sentences: TeleprompterSentence[];
}

export interface AudioQualityMetrics {
  peakDb: number;
  averageDb: number;
  clippingDetected: boolean;
  silenceRatio: number; // 0 to 1
  sampleRate: number;
  status: 'optimal' | 'low_volume' | 'clipped' | 'too_noisy';
  feedback: string;
}

export interface RecordedSample {
  id: string;
  scriptId: string;
  title: string;
  register: VocalRegister;
  durationSec: number;
  timestamp: number;
  blobUrl: string;
  audioBlob: Blob;
  qualityMetrics: AudioQualityMetrics;
}

export interface ElevenLabsSettings {
  apiKey: string;
  voiceId: string;
  voiceName?: string;
  stability: number; // 0 to 1, default ~0.42
  similarityBoost: number; // 0 to 1, default ~0.82
  style: number; // 0 to 1, default ~0.12
  useSpeakerBoost: boolean;
  modelId: string; // 'eleven_multilingual_v2'
}

export interface ScriptSection {
  name: string;
  directorNotes: string;
  text: string;
}

export interface PodcastScript {
  id: string;
  title: string;
  topic: string;
  estimatedDuration: string;
  characterCount: number;
  toneSummary: string;
  fullScript: string;
  sections: ScriptSection[];
  createdAt: number;
}

export interface GeneratedEpisodeAudio {
  id: string;
  scriptTitle: string;
  date: string;
  durationSec: number;
  audioUrl: string;
  engineUsed: 'ElevenLabs' | 'Gemini TTS' | 'F5-TTS / XTTS';
  modelOrVoice: string;
  settingsSnapshot?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
  };
}
