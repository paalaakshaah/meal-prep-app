import type { RecognitionResult } from 'expo-mlkit-ocr';

// Heuristic extraction of macro values from OCR'd nutrition-label text.
// This is a best-effort first draft, not a reliable parse — glare, curved
// packaging, and small print all degrade recognition quality unpredictably.
// Every value this produces is meant to prefill an editable form for the
// user to verify against the photo, never to be saved unreviewed.
export type ParsedNutrition = {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
};

type PositionedLine = { text: string; centerX: number; centerY: number; height: number };

function flattenLines(result: RecognitionResult): PositionedLine[] {
  const lines: PositionedLine[] = [];
  for (const block of result.blocks) {
    for (const line of block.lines) {
      const { x, y, width, height } = line.boundingBox;
      lines.push({ text: line.text, centerX: x + width / 2, centerY: y + height / 2, height });
    }
  }
  return lines;
}

function extractFirstNumber(text: string): number | null {
  const match = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const n = parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Indian nutrition labels are almost always two columns — a label column and
// a value column — which ML Kit frequently reads as two separate regions
// (all labels, then all values) rather than interleaving them row by row.
// So instead of trusting text order, find the label line, then look for a
// number-only line vertically aligned with it (same "row" by Y-position,
// to its right) — that's a real table-row match, not a text-stream guess.
function findNumberOnSameRow(lines: PositionedLine[], keyword: RegExp): number | null {
  const labelLine = lines.find((l) => keyword.test(l.text));
  if (!labelLine) return null;

  const inline = extractFirstNumber(labelLine.text.replace(keyword, ''));
  if (inline !== null) return inline;

  const tolerance = Math.max(labelLine.height * 0.9, 14);
  let best: { n: number; dist: number } | null = null;
  for (const line of lines) {
    if (line === labelLine || keyword.test(line.text)) continue;
    const n = extractFirstNumber(line.text);
    if (n === null) continue;
    if (line.centerX < labelLine.centerX) continue; // value should sit to the right of its label
    const dy = Math.abs(line.centerY - labelLine.centerY);
    if (dy > tolerance) continue;
    if (!best || dy < best.dist) best = { n, dist: dy };
  }
  if (best) return best.n;

  // Fallback for single-column layouts: nearest number after the label in
  // reading order, when nothing lined up spatially.
  const idx = lines.indexOf(labelLine);
  for (let j = idx + 1; j < Math.min(idx + 3, lines.length); j++) {
    if (keyword.test(lines[j].text)) continue;
    const n = extractFirstNumber(lines[j].text);
    if (n !== null) return n;
  }
  return null;
}

export function parseNutritionLabel(result: RecognitionResult): ParsedNutrition {
  const lines = flattenLines(result);

  // Energy: a number explicitly tagged "kcal" is unambiguous regardless of
  // column layout — search the whole text for it rather than row-matching.
  let kcal: number | null = null;
  const m = result.text.match(/(\d+(?:[.,]\d+)?)\s*k?cal\b/i);
  if (m) kcal = parseFloat(m[1].replace(',', '.'));
  if (kcal === null) kcal = findNumberOnSameRow(lines, /energy|calories/i);

  return {
    kcal,
    protein: findNumberOnSameRow(lines, /protein/i),
    carbs: findNumberOnSameRow(lines, /carbohydrate/i),
    fat: findNumberOnSameRow(lines, /\bfat\b/i),
    fiber: findNumberOnSameRow(lines, /fib(er|re)/i),
    sugar: findNumberOnSameRow(lines, /sugar/i),
  };
}
