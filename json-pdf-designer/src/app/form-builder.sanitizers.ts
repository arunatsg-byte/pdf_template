const CSS_LENGTH_PATTERN = /^(?:0|[0-9]+(?:\.[0-9]+)?(?:px|mm|cm|in|pt|pc|em|rem|vh|vw|vmin|vmax|%))$/i;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTION_COLOR_PATTERN = /^(?:rgb|rgba|hsl|hsla)\(\s*[-0-9.%\s,/]+\)$/i;
const NAMED_COLORS = new Set(['black', 'white', 'transparent', 'currentcolor']);
const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

interface NormalizeUrlOptions {
  allowRelative?: boolean;
  allowDataImage?: boolean;
  allowedProtocols?: readonly string[];
}

export function normalizeCssLength(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return CSS_LENGTH_PATTERN.test(trimmed) ? trimmed : fallback;
}

export function normalizeCssColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return HEX_COLOR_PATTERN.test(trimmed) || FUNCTION_COLOR_PATTERN.test(trimmed) || NAMED_COLORS.has(trimmed.toLowerCase())
    ? trimmed
    : fallback;
}

export function normalizeFontChoice(value: unknown, fallback: string, allowedChoices: readonly string[]): string {
  return typeof value === 'string' && allowedChoices.includes(value) ? value : fallback;
}

export function normalizeNumberInRange(value: unknown, fallback: number, min: number, max: number): number {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, normalized));
}

export function normalizeUrl(
  value: unknown,
  { allowRelative = false, allowDataImage = false, allowedProtocols = ['http:', 'https:'] }: NormalizeUrlOptions = {}
): string {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (allowDataImage && /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(trimmed)) {
    return trimmed.replace(/\s+/g, '');
  }

  if (!ABSOLUTE_URL_PATTERN.test(trimmed)) {
    if (!allowRelative || trimmed.startsWith('//')) {
      return '';
    }

    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    return allowedProtocols.includes(parsed.protocol) ? trimmed : '';
  } catch {
    return '';
  }
}

export function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}
