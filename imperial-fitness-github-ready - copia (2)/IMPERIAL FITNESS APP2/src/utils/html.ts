const HTML_ENTITIES: Record<string, string> = {
  '&quot;': '"',
  '&#34;': '"',
  '&#x22;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&#x27;': "'",
  '&amp;': '&',
  '&#38;': '&',
  '&#x26;': '&',
  '&lt;': '<',
  '&#60;': '<',
  '&#x3c;': '<',
  '&gt;': '>',
  '&#62;': '>',
  '&#x3e;': '>',
};

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(quot|apos|amp|lt|gt);|&#(34|39|38|60|62);|&#x(22|27|26|3c|3e);/gi, match => {
    const normalized = match.toLowerCase();
    return HTML_ENTITIES[normalized] ?? match;
  });
}
