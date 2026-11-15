/* Safe file names for SVGs cached from Figma.
   Shared by the Node script (scripts/figma/icons.ts) and by <FigmaIcon>. */

const SAFE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** File name (without extension): lowercase, hyphens, no path. */
export function safeIconName(raw: string): string | null {
  const name = raw
    .replace(/\u0153|\u0152/g, "oe")
    .replace(/\u00e6|\u00c6/g, "ae")
    .replace(/\u00df/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return SAFE_NAME.test(name) ? name : null;
}

/** Figma node id `12:34`, or URL form `12-34`. */
export function figmaNodeId(raw: string): string | null {
  const trimmed = raw.trim();
  const id = /^\d+:\d+$/.test(trimmed) ? trimmed : /^\d+-\d+$/.test(trimmed) ? trimmed.replace("-", ":") : null;
  if (!id || id.length > 40) return null;
  return id;
}
