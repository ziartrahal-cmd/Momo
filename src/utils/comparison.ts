export interface ComparisonCandidateInput {
  id: string;
  label: string;
  modelId?: string;
  text: string;
}

export interface ComparisonColumnData {
  id: string;
  label: string;
  modelId: string;
  text: string;
  wordCount: number;
  charCount: number;
  paragraphCount: number;
  roleLabel: string;
}

const FALLBACK_MODEL_IDS: Record<string, string> = {
  hydrogen: "gemini-4-hydrogen",
  "flash-lite": "gemini-3.1-flash-lite",
};

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function countParagraphs(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean).length;
}

export function buildComparisonColumns(
  candidates: ComparisonCandidateInput[],
  winnerLabel?: string
): ComparisonColumnData[] {
  return candidates.map((cand) => {
    const trimmed = cand.text.trim();
    const isDirectWinner = Boolean(winnerLabel && winnerLabel === cand.label);

    return {
      id: cand.id,
      label: cand.label,
      modelId: cand.modelId ?? FALLBACK_MODEL_IDS[cand.id] ?? cand.id,
      text: trimmed,
      wordCount: countWords(trimmed),
      charCount: trimmed.length,
      paragraphCount: countParagraphs(trimmed),
      roleLabel: isDirectWinner ? "الإجابة المعتمدة" : "مشارك في الترجيح",
    };
  });
}
