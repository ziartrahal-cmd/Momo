export type LiveVoiceName = "Zephyr" | "Kore" | "Puck" | "Charon" | "Fenrir";

export interface LiveVoiceOption {
  id: LiveVoiceName;
  label: string;
}

export const LIVE_VOICE_OPTIONS: LiveVoiceOption[] = [
  { id: "Zephyr", label: "Zephyr (متوازن وواضح)" },
  { id: "Kore", label: "Kore (هادئ وناعم)" },
  { id: "Puck", label: "Puck (حيوي وسريع)" },
  { id: "Charon", label: "Charon (عميق ورسمي)" },
  { id: "Fenrir", label: "Fenrir (دافئ وعملي)" },
];

export interface LiveTranscriptItem {
  id: string;
  role: "user" | "model";
  text: string;
}

export function isValidLiveVoice(value: string | null | undefined): value is LiveVoiceName {
  return LIVE_VOICE_OPTIONS.some((v) => v.id === value);
}

/**
 * Downsamples or resamples mono Float32 PCM samples to a target sample rate
 * using linear interpolation.
 */
export function resampleFloat32(
  input: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (fromRate <= 0 || toRate <= 0 || fromRate === toRate || input.length === 0) {
    return input;
  }

  const ratio = fromRate / toRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcPos = i * ratio;
    const low = Math.floor(srcPos);
    const high = Math.min(low + 1, input.length - 1);
    const frac = srcPos - low;
    output[i] = input[low] * (1 - frac) + input[high] * frac;
  }

  return output;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes Float32 samples [-1, 1] into base64 little-endian 16-bit PCM.
 */
export function float32ToInt16Base64(samples: Float32Array): string {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(i * 2, int16, true);
  }

  return bytesToBase64(new Uint8Array(buffer));
}

/**
 * Decodes base64 little-endian 16-bit PCM into Float32 samples [-1, 1].
 */
export function base64Int16ToFloat32(base64: string): Float32Array {
  const bytes = base64ToBytes(base64);
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
  const output = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const int16 = view.getInt16(i * 2, true);
    output[i] = int16 / (int16 < 0 ? 0x8000 : 0x7fff);
  }

  return output;
}

/**
 * Appends incremental live transcript chunks cleanly by merging consecutive
 * chunks from the same speaker role.
 */
export function appendTranscriptChunk(
  items: LiveTranscriptItem[],
  role: "user" | "model",
  chunk: string
): LiveTranscriptItem[] {
  const cleanChunk = chunk;
  if (!cleanChunk.trim()) return items;

  const last = items[items.length - 1];
  if (last && last.role === role) {
    const needsSpace =
      last.text.length > 0 &&
      !/\s$/.test(last.text) &&
      !/^\s/.test(cleanChunk);
    const mergedText = needsSpace ? `${last.text} ${cleanChunk}` : `${last.text}${cleanChunk}`;
    return [
      ...items.slice(0, -1),
      { ...last, text: mergedText },
    ];
  }

  return [
    ...items,
    {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role,
      text: cleanChunk.trimStart(),
    },
  ];
}
