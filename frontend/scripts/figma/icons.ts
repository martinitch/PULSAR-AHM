/* Figma REST bridge → local SVG cache.
   Node only (`npm run figma:icons`). Do not import this file from React:
   the FIGMA_ACCESS_TOKEN token must never carry the VITE_ prefix.

   Export: GET /v1/images/:file_key?ids=…&format=svg
   Published components: GET /v1/files/:file_key/components
   SVGs are written to public/figma-icons/ and read by <FigmaIcon name="…" />. */

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { figmaNodeId, safeIconName } from "../../src/figma/iconName.ts";

const API = "https://api.figma.com/v1";
const TIMEOUT_MS = 20_000;
const MAX_SVG_BYTES = 1_500_000;
const BATCH = 10;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(SCRIPT_DIR, "../..");

const HELP = `Usage
  npm run figma:icons -- --ids 12:34,56:78
  npm run figma:icons -- --components
  npm run figma:icons -- --force --ids 12:34

Identifiants : 12:34 ou 12-34 (forme d’URL Figma).
--components exporte les composants publiés du fichier (plafond FIGMA_MAX_ICONS).

Sources combinées, la dernière complète le nom :
  frontend/scripts/figma/nodes.json   { "nodes": [ { "id": "12:34", "name": "coeur" } ] }
  FIGMA_NODE_IDS=12:34,56:78
  arguments --ids

Les SVG arrivent dans frontend/public/figma-icons/.
Dans l’interface : <FigmaIcon name="coeur" />.
`;

export class FigmaError extends Error {
  readonly code: "config" | "auth" | "api" | "network" | "cache";
  readonly status?: number;
  constructor(code: FigmaError["code"], message: string, status?: number) {
    super(message);
    this.name = "FigmaError";
    this.code = code;
    this.status = status;
  }
}

export type FigmaConfig = {
  token: string;
  fileKey: string;
  cacheDir: string;
  cacheTtlMs: number;
};

export type IconSource = { nodeId: string; name?: string };

export type CachedIcon = {
  nodeId: string;
  name: string;
  file: string;
  sha256: string;
  bytes: number;
  fetchedAt: string;
};

export type CacheResult = {
  cached: CachedIcon[];
  skipped: CachedIcon[];
  errors: { nodeId: string; message: string }[];
};

type ImageResponse = { err?: string | null; images?: Record<string, string | null> };
type ComponentRow = { node_id?: unknown; name?: unknown };
type ComponentsResponse = {
  error?: boolean;
  meta?: { components?: ComponentRow[]; cursor?: unknown };
};

type Manifest = { fileKey: string; icons: CachedIcon[] };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redact(text: string, secret: string): string {
  const hidden = secret ? text.split(secret).join("…") : text;
  return hidden.replace(/figd_[A-Za-z0-9_-]+/g, "…").slice(0, 180);
}

/** Rejects an active SVG (script, handler, external link). Returns the text. */
export function assertSafeSvg(bytes: Uint8Array): string {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_SVG_BYTES) {
    throw new FigmaError("cache", "SVG vide ou trop volumineux.");
  }
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/^\uFEFF/, "");
  if (/<script\b|javascript:|on[a-z]+\s*=|<\s*foreignObject|<\s*iframe|<\s*embed|<\s*object|<!ENTITY|<!DOCTYPE|expression\s*\(/i.test(raw)) {
    throw new FigmaError("cache", "SVG refusé : contenu actif non autorisé.");
  }
  if (/\b(?:xlink:)?href\s*=\s*["']\s*(?:https?:|data:(?:text\/html|image\/svg))/i.test(raw)) {
    throw new FigmaError("cache", "SVG refusé : lien externe.");
  }
  const body = raw.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!/^(?:<\?xml[\s\S]*?\?>\s*)?<svg[\s>]/i.test(body)) {
    throw new FigmaError("cache", "Le fichier reçu n’est pas un SVG.");
  }
  return raw.trim();
}

function assertInside(root: string, target: string): void {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new FigmaError("cache", "Chemin de cache refusé.");
}

/** Applies KEY=VALUE lines. Overwrites a key already set only when override is true. */
export function applyEnvFile(text: string, env: { [key: string]: string | undefined }, override: boolean): void {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const body = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const eq = body.indexOf("=");
    if (eq <= 0) continue;
    const key = body.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = body.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!override && env[key] !== undefined) continue;
    env[key] = value;
  }
}

export async function loadProjectEnv(root = FRONTEND_ROOT): Promise<void> {
  const merged: { [key: string]: string | undefined } = {};
  for (const file of [".env", ".env.local"]) {
    try {
      applyEnvFile(await readFile(path.join(root, file), "utf8"), merged, file === ".env.local");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new FigmaError("config", `Impossible de lire ${file}.`);
      }
    }
  }
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && process.env[key] === undefined) process.env[key] = value;
  }
}

export function readFigmaConfig(env: NodeJS.ProcessEnv, cacheDir: string): FigmaConfig {
  if (env.VITE_FIGMA_ACCESS_TOKEN || env.VITE_FIGMA_FILE_KEY) {
    throw new FigmaError(
      "config",
      "VITE_FIGMA_ACCESS_TOKEN et VITE_FIGMA_FILE_KEY exposeraient le jeton dans le navigateur. Utilisez FIGMA_ACCESS_TOKEN et FIGMA_FILE_KEY, sans préfixe VITE_.",
    );
  }
  const token = (env.FIGMA_ACCESS_TOKEN ?? "").trim();
  const fileKey = (env.FIGMA_FILE_KEY ?? "").trim();
  if (!token || token.length < 8 || /\s/.test(token)) {
    throw new FigmaError("config", "FIGMA_ACCESS_TOKEN est absent ou invalide. Ajoutez-le dans frontend/.env (voir .env.example).");
  }
  if (!/^[A-Za-z0-9]+$/.test(fileKey)) {
    throw new FigmaError("config", "FIGMA_FILE_KEY est absent ou invalide. C’est le segment de l’URL figma.com/design/<clé>/…");
  }
  const rawTtl = (env.FIGMA_CACHE_TTL_HOURS ?? "").trim();
  const ttlHours = rawTtl === "" ? 24 : Number(rawTtl);
  if (!Number.isFinite(ttlHours) || ttlHours < 0) {
    throw new FigmaError("config", "FIGMA_CACHE_TTL_HOURS doit être un nombre d’heures supérieur ou égal à 0.");
  }
  return { token, fileKey, cacheDir, cacheTtlMs: ttlHours * 3_600_000 };
}

function maxIcons(env: NodeJS.ProcessEnv): number {
  const raw = (env.FIGMA_MAX_ICONS ?? "").trim();
  if (raw === "") return 100;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 2000) {
    throw new FigmaError("config", "FIGMA_MAX_ICONS doit être un entier entre 1 et 2000.");
  }
  return n;
}

async function figmaJson<T>(url: string, token: string, attempt = 0): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "X-Figma-Token": token, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new FigmaError("network", "Délai dépassé en contactant l’API Figma.");
    }
    throw new FigmaError("network", "Réseau indisponible : impossible de joindre l’API Figma.");
  }
  if (res.status === 429 && attempt < 3) {
    await res.body?.cancel();
    const header = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(header) && header > 0 ? Math.min(header, 60) * 1000 : 1000 * (attempt + 1);
    await delay(waitMs);
    return figmaJson<T>(url, token, attempt + 1);
  }
  if (res.status === 401 || res.status === 403) {
    throw new FigmaError("auth", "Jeton Figma refusé. Vérifiez FIGMA_ACCESS_TOKEN et le droit de lecture sur ce fichier.", res.status);
  }
  if (res.status === 404) throw new FigmaError("api", "Fichier Figma introuvable. Vérifiez FIGMA_FILE_KEY.", 404);
  if (!res.ok) throw new FigmaError("api", `L’API Figma a répondu HTTP ${res.status}.`, res.status);
  try {
    return (await res.json()) as T;
  } catch {
    throw new FigmaError("api", "Réponse Figma illisible (JSON attendu).");
  }
}

/** Temporary SVG export URLs, indexed by node id. `null` if Figma cannot render the node. */
export async function fetchSvgExportUrls(config: FigmaConfig, nodeIds: readonly string[]): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  for (let i = 0; i < nodeIds.length; i += BATCH) {
    const batch = nodeIds.slice(i, i + BATCH);
    const url = new URL(`${API}/images/${config.fileKey}`);
    url.searchParams.set("ids", batch.join(","));
    url.searchParams.set("format", "svg");
    url.searchParams.set("svg_outline_text", "true");
    const body = await figmaJson<ImageResponse>(url.toString(), config.token);
    if (body.err) throw new FigmaError("api", `Export Figma refusé : ${redact(body.err, config.token)}`);
    if (!body.images || typeof body.images !== "object") {
      throw new FigmaError("api", "Réponse d’export Figma inattendue (champ images absent).");
    }
    for (const id of batch) out[id] = body.images[id] ?? null;
    if (i + BATCH < nodeIds.length) await delay(300);
  }
  return out;
}

function nextCursor(cursor: unknown): string | undefined {
  if (typeof cursor === "string" && cursor) return cursor;
  if (cursor && typeof cursor === "object" && typeof (cursor as { after?: unknown }).after === "string") {
    const after = (cursor as { after: string }).after;
    return after || undefined;
  }
  return undefined;
}

/** Published components of the file (node id + name). */
export async function listPublishedComponents(config: FigmaConfig): Promise<IconSource[]> {
  const found: IconSource[] = [];
  const seen = new Set<string>();
  let after: string | undefined;
  for (let page = 0; page < 20; page++) {
    const url = new URL(`${API}/files/${config.fileKey}/components`);
    if (after) url.searchParams.set("after", after);
    const body = await figmaJson<ComponentsResponse>(url.toString(), config.token);
    if (body.error) throw new FigmaError("api", "L’API Figma n’a pas pu lister les composants de ce fichier.");
    const rows = body.meta?.components ?? [];
    for (const row of rows) {
      if (typeof row.node_id !== "string") continue;
      const nodeId = figmaNodeId(row.node_id);
      if (!nodeId || seen.has(nodeId)) continue;
      seen.add(nodeId);
      found.push({ nodeId, name: typeof row.name === "string" ? row.name : undefined });
    }
    const next = nextCursor(body.meta?.cursor);
    if (!next || next === after || rows.length === 0) return found;
    after = next;
  }
  throw new FigmaError("api", "Liste de composants trop longue. Passez des identifiants avec --ids.");
}

function assertHttps(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new FigmaError("api", "URL d’export Figma invalide.");
  }
  if (parsed.protocol !== "https:") throw new FigmaError("api", "URL d’export Figma refusée.");
  return parsed;
}

async function downloadSvg(url: string): Promise<string> {
  let current = assertHttps(url).toString();
  for (let hop = 0; hop < 3; hop++) {
    let res: Response;
    try {
      res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "TimeoutError" || name === "AbortError") throw new FigmaError("network", "Délai dépassé pendant le téléchargement du SVG.");
      throw new FigmaError("network", "Réseau indisponible pendant le téléchargement du SVG.");
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel();
      if (!location) throw new FigmaError("api", "Redirection SVG sans cible.");
      current = assertHttps(new URL(location, current).toString()).toString();
      continue;
    }
    if (!res.ok) throw new FigmaError("api", `Téléchargement du SVG impossible (HTTP ${res.status}).`, res.status);
    return assertSafeSvg(new Uint8Array(await res.arrayBuffer()));
  }
  throw new FigmaError("api", "Trop de redirections pendant le téléchargement du SVG.");
}

function isCachedIcon(v: unknown): v is CachedIcon {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.nodeId === "string" && typeof o.name === "string" && typeof o.file === "string"
    && typeof o.sha256 === "string" && typeof o.bytes === "number" && typeof o.fetchedAt === "string"
    && safeIconName(o.name) === o.name && o.file === `${o.name}.svg`;
}

async function readManifest(file: string): Promise<Manifest> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { fileKey: "", icons: [] };
    throw new FigmaError("cache", "Impossible de lire le manifeste des icônes.");
  }
  try {
    const raw = JSON.parse(text) as { fileKey?: unknown; icons?: unknown };
    const icons = Array.isArray(raw.icons) ? raw.icons.filter(isCachedIcon) : [];
    return { fileKey: typeof raw.fileKey === "string" ? raw.fileKey : "", icons };
  } catch {
    throw new FigmaError("cache", "public/figma-icons/manifest.json est illisible. Supprimez-le, puis relancez.");
  }
}

async function atomicWrite(root: string, filename: string, contents: string): Promise<void> {
  const target = path.join(root, filename);
  assertInside(root, target);
  const tmp = path.join(root, `.${filename}.${process.pid}.tmp`);
  assertInside(root, tmp);
  try {
    await writeFile(tmp, contents, "utf8");
    await rm(target, { force: true });
    await rename(tmp, target);
  } catch (e) {
    await rm(tmp, { force: true });
    if (e instanceof FigmaError) throw e;
    throw new FigmaError("cache", "Impossible d’écrire le cache des icônes.");
  }
}

function rememberName(raw: string, nodeId: string, used: Set<string>): string {
  const base = safeIconName(raw) ?? safeIconName(`nœud-${nodeId}`) ?? "icone";
  let name = base;
  let n = 2;
  while (used.has(name)) {
    const suffix = `-${n}`;
    name = `${base.slice(0, Math.max(1, 80 - suffix.length))}${suffix}`;
    n += 1;
  }
  used.add(name);
  return name;
}

export async function cacheFigmaIcons(config: FigmaConfig, sources: readonly IconSource[], force: boolean): Promise<CacheResult> {
  await mkdir(config.cacheDir, { recursive: true });
  const manifest = await readManifest(path.join(config.cacheDir, "manifest.json"));
  const byId = new Map(manifest.icons.map((icon) => [icon.nodeId, icon]));
  const now = Date.now();
  const todo: IconSource[] = [];
  const skipped: CachedIcon[] = [];

  for (const src of sources) {
    const prev = byId.get(src.nodeId);
    const fresh = prev && now - Date.parse(prev.fetchedAt) < config.cacheTtlMs;
    if (!force && prev && fresh) {
      const filePath = path.join(config.cacheDir, prev.file);
      try {
        assertInside(config.cacheDir, filePath);
        const bytes = await readFile(filePath);
        const sha = createHash("sha256").update(bytes).digest("hex");
        if (sha === prev.sha256) {
          skipped.push(prev);
          continue;
        }
      } catch (e) {
        if (e instanceof FigmaError) throw e;
      }
    }
    todo.push(src);
  }

  const cached: CachedIcon[] = [];
  const errors: { nodeId: string; message: string }[] = [];
  if (todo.length > 0) {
    const urls = await fetchSvgExportUrls(config, todo.map((item) => item.nodeId));
    const used = new Set(manifest.icons.map((icon) => icon.name));
    for (const src of todo) {
      const url = urls[src.nodeId];
      if (!url) {
        errors.push({ nodeId: src.nodeId, message: "Figma n’a pas renvoyé d’URL pour ce nœud." });
        continue;
      }
      try {
        const svg = await downloadSvg(url);
        const text = svg.endsWith("\n") ? svg : `${svg}\n`;
        const prev = byId.get(src.nodeId);
        const name = prev?.name ?? rememberName(src.name ?? src.nodeId, src.nodeId, used);
        const entry: CachedIcon = {
          nodeId: src.nodeId,
          name,
          file: `${name}.svg`,
          sha256: createHash("sha256").update(text).digest("hex"),
          bytes: Buffer.byteLength(text),
          fetchedAt: new Date().toISOString(),
        };
        await atomicWrite(config.cacheDir, entry.file, text);
        byId.set(src.nodeId, entry);
        cached.push(entry);
      } catch (e) {
        errors.push({ nodeId: src.nodeId, message: e instanceof FigmaError ? e.message : "Échec du téléchargement." });
      }
    }
  }

  const next: Manifest = {
    fileKey: config.fileKey,
    icons: [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "fr")),
  };
  await atomicWrite(config.cacheDir, "manifest.json", `${JSON.stringify(next, null, 2)}\n`);
  return { cached, skipped, errors };
}

async function readNodesFile(file: string): Promise<{ id: string; name?: string }[]> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new FigmaError("config", "Impossible de lire scripts/figma/nodes.json.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new FigmaError("config", "scripts/figma/nodes.json n’est pas du JSON valide.");
  }
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { nodes?: unknown }).nodes)) {
    throw new FigmaError("config", "scripts/figma/nodes.json doit contenir un tableau nodes.");
  }
  return (raw as { nodes: unknown[] }).nodes.map((item, index) => {
    if (!item || typeof item !== "object" || typeof (item as { id?: unknown }).id !== "string") {
      throw new FigmaError("config", `scripts/figma/nodes.json : entrée ${index + 1} sans id.`);
    }
    const row = item as { id: string; name?: unknown };
    return { id: row.id, name: typeof row.name === "string" ? row.name : undefined };
  });
}

function putNode(map: Map<string, IconSource>, idRaw: string, name?: string): void {
  const nodeId = figmaNodeId(idRaw);
  if (!nodeId) throw new FigmaError("config", `Identifiant de nœud invalide : ${idRaw}. Forme attendue : 12:34 ou 12-34.`);
  const prev = map.get(nodeId);
  map.set(nodeId, { nodeId, name: name ?? prev?.name });
}

export async function pullFigmaIcons(options: {
  nodeIds?: readonly string[];
  names?: Readonly<Record<string, string>>;
  components?: boolean;
  force?: boolean;
  /** Read nodes.json and FIGMA_NODE_IDS. Default: true. */
  fromProject?: boolean;
} = {}): Promise<CacheResult> {
  await loadProjectEnv();
  const cacheDir = path.join(FRONTEND_ROOT, "public", "figma-icons");
  const config = readFigmaConfig(process.env, cacheDir);
  const map = new Map<string, IconSource>();
  if (options.fromProject !== false) {
    for (const row of await readNodesFile(path.join(SCRIPT_DIR, "nodes.json"))) putNode(map, row.id, row.name);
    for (const id of (process.env.FIGMA_NODE_IDS ?? "").split(",")) {
      const trimmed = id.trim();
      if (trimmed) putNode(map, trimmed);
    }
  }
  for (const id of options.nodeIds ?? []) {
    const canonical = figmaNodeId(id);
    putNode(map, id, canonical ? options.names?.[canonical] : undefined);
  }
  if (options.components) {
    const published = await listPublishedComponents(config);
    if (published.length === 0 && map.size === 0) {
      throw new FigmaError("api", "Aucun composant publié dans ce fichier. Passez des identifiants de nœuds (--ids).");
    }
    for (const row of published) putNode(map, row.nodeId, map.get(row.nodeId)?.name ?? row.name);
  }
  if (map.size === 0) {
    throw new FigmaError("config", "Aucun nœud à exporter. Utilisez --ids, --components, FIGMA_NODE_IDS ou scripts/figma/nodes.json.");
  }
  const cap = maxIcons(process.env);
  if (map.size > cap) {
    throw new FigmaError("config", `${map.size} nœuds demandés, plafond ${cap} (FIGMA_MAX_ICONS).`);
  }
  return cacheFigmaIcons(config, [...map.values()], options.force === true);
}

type Cli = { ids: string[]; components: boolean; force: boolean; help: boolean };

function parseArgs(argv: readonly string[]): Cli {
  const ids: string[] = [];
  let components = false;
  let force = false;
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    if (arg === "--help" || arg === "-h") help = true;
    else if (arg === "--force") force = true;
    else if (arg === "--components") components = true;
    else if (arg === "--ids" || arg.startsWith("--ids=")) {
      const value = arg.startsWith("--ids=") ? arg.slice("--ids=".length) : argv[++i];
      if (!value) throw new FigmaError("config", "Option --ids sans identifiant.");
      for (const id of value.split(",")) if (id.trim()) ids.push(id.trim());
    } else if (arg.startsWith("-")) {
      throw new FigmaError("config", `Option inconnue : ${arg}. npm run figma:icons -- --help`);
    } else ids.push(arg);
  }
  return { ids, components, force, help };
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(path.resolve(entry)).href === import.meta.url;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  if (cli.help) {
    console.log(HELP);
    return;
  }
  const result = await pullFigmaIcons({ nodeIds: cli.ids, components: cli.components, force: cli.force });
  for (const icon of result.cached) console.log(`enregistré  ${icon.nodeId}  →  public/figma-icons/${icon.file}`);
  for (const icon of result.skipped) console.log(`cache       ${icon.nodeId}  →  public/figma-icons/${icon.file}`);
  for (const err of result.errors) console.error(`échec       ${err.nodeId}  ${err.message}`);
  console.log(`Terminées : ${result.cached.length} enregistrées, ${result.skipped.length} en cache, ${result.errors.length} en échec.`);
  if (result.errors.length > 0) process.exitCode = 1;
}

if (isDirectRun()) {
  main().catch((e: unknown) => {
    console.error(e instanceof FigmaError ? e.message : "Erreur inattendue pendant la récupération des icônes Figma.");
    process.exitCode = 1;
  });
}
