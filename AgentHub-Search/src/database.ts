import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { excerpt } from "./presentation";

const run = promisify(execFile);
export interface Hit {
  id: number; sessionId: number; sessionUuid: string; title: string; source: string;
  project: string; timestamp: string; role: string; seq: number; filePath: string;
  text: string; snippet: string;
  msgUuid: string | null;
  fingerprint: string;
}
export interface Message { id: number; role: string; text: string; seq: number; timestamp: string }
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
export const expandPath = (value: string) => value.startsWith("~/") ? `${homedir()}/${value.slice(2)}` : value;

async function query<T>(database: string, sql: string): Promise<T[]> {
  const path = expandPath(database);
  if (!existsSync(path)) throw new Error("找不到 AgentHub 数据库，请先启动 AgentHub 并同步记录，或检查扩展设置中的路径。");
  try {
    const { stdout } = await run("/usr/bin/sqlite3", ["-readonly", "-safe", "-cmd", ".timeout 3000", "-json", path, sql], { timeout: 8000, maxBuffer: 16 * 1024 * 1024 });
    return stdout.trim() ? JSON.parse(stdout) : [];
  } catch (error) {
    if (String((error as {stderr?: string}).stderr).includes("unable to open database file"))
      throw new Error("数据库暂时无法只读打开。请先启动 AgentHub 后重试；数据库权限或 WAL 辅助文件可能不可用。");
    throw error;
  }
}

export async function search(database: string, input: string, source = "all"): Promise<Hit[]> {
  const terms = input.trim().split(/\s+/u).filter(Boolean);
  const where = ["m.is_sidechain=0", "m.role IN ('user','assistant')"];
  if (source !== "all") where.push(`src.name=${quote(source)}`);
  let from = "messages m";
  let snippet = "substr(m.content_text,1,240)";
  if (terms.length) {
    const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(input);
    const short = terms.some(t => [...t].length < 3);
    if (cjk && short) {
      where.push(...terms.map(t => `m.content_text LIKE ${quote(`%${t.replace(/[\\%_]/g, c => `\\${c}`)}%`)} ESCAPE '\\'`));
    } else {
      const table = cjk ? "messages_fts_trigram" : "messages_fts";
      from = `${table} JOIN messages m ON m.id=${table}.rowid`;
      const match = terms.map(t => `"${t.replaceAll('"', '""')}"${cjk ? "" : "*"}`).join(" AND ");
      where.push(`${table} MATCH ${quote(match)}`);
      snippet = `snippet(${table},0,'','', '…',32)`;
    }
  }
  const rows = await query<Hit & { fullText: string }>(database, `SELECT m.id,m.session_id AS sessionId,s.session_uuid AS sessionUuid,
    COALESCE(s.title,'未命名会话') AS title,src.name AS source,p.display_path AS project,
    m.msg_uuid AS msgUuid,m.timestamp,m.role,m.seq,s.file_path AS filePath,substr(m.content_text,1,20000) AS text,m.content_text AS fullText,${snippet} AS snippet
    FROM ${from} JOIN sessions s ON s.id=m.session_id JOIN sources src ON src.id=s.source_id
    JOIN projects p ON p.id=s.project_id WHERE ${where.join(" AND ")}
    ORDER BY m.timestamp DESC,m.id DESC LIMIT 100;`);
  // Do not show stale index entries whose original session has been removed.
  const hits: Hit[] = rows.filter(row => existsSync(sourcePath(row.filePath)) || existsSync(`${row.filePath}.zst`)).slice(0, 50)
    .map(({fullText, ...row}) => ({...row, text: excerpt(fullText, input, 20000), snippet: excerpt(fullText, input, 240), fingerprint: createHash("sha256")
      .update(JSON.stringify([row.role, row.timestamp, fullText])).digest("hex")}));
  const codexDb = join(process.env.CODEX_HOME || join(homedir(), ".codex"), "state_5.sqlite");
  if (hits.some(hit => hit.source === "codex") && existsSync(codexDb)) {
    const titles = await query<{id: string; title: string}>(codexDb,
      `SELECT id,COALESCE(NULLIF(name,''),title) AS title FROM threads WHERE id IN (${hits.filter(h => h.source === "codex").map(h => quote(h.sessionUuid)).join(",")});`);
    const byId = new Map(titles.map(row => [row.id, row.title]));
    for (const hit of hits) if (hit.source === "codex" && byId.get(hit.sessionUuid)) hit.title = byId.get(hit.sessionUuid)!;
  }
  return hits;
}

export interface ContextWindow { messages: Message[]; hasBefore: boolean; hasAfter: boolean }
export async function contextWindow(database: string, hit: Hit, before = 2, after = 2): Promise<ContextWindow> {
  if (!Number.isSafeInteger(hit.sessionId) || !Number.isSafeInteger(hit.seq)) throw new Error("消息定位信息无效。");
  if (![before, after].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 500)) throw new Error("上下文加载范围无效。");
  const fields = "id,role,substr(content_text,1,20000) AS text,seq,timestamp";
  const base = `FROM messages WHERE session_id=${hit.sessionId} AND is_sidechain=0`;
  const rows = await query<Message>(database, `SELECT * FROM (SELECT ${fields} ${base} AND seq<${hit.seq} ORDER BY seq DESC LIMIT ${before + 1})
    UNION ALL SELECT ${fields} ${base} AND seq=${hit.seq}
    UNION ALL SELECT * FROM (SELECT ${fields} ${base} AND seq>${hit.seq} ORDER BY seq LIMIT ${after + 1}) ORDER BY seq;`);
  const earlier = rows.filter(m => m.seq < hit.seq), later = rows.filter(m => m.seq > hit.seq);
  return { messages: [...(before ? earlier.slice(-before) : []), ...rows.filter(m => m.seq === hit.seq), ...later.slice(0, after)],
    hasBefore: earlier.length > before, hasAfter: later.length > after };
}
export async function context(database: string, hit: Hit): Promise<Message[]> {
  return (await contextWindow(database, hit)).messages;
}

/** The file on disk behind an indexed session. Database-backed sources (Hermes, OpenClaw,
 *  OpenCode) index `<database>#<session>`; the database file is what exists. */
export function sourcePath(filePath: string): string {
  const at = filePath.indexOf("#");
  return at === -1 ? filePath : filePath.slice(0, at);
}

/** Cache the locator with the search result so AgentHub can also be launched from a stopped state. */
export async function agentHubLink(_database: string, hit: Hit): Promise<string> {
  if (!Number.isSafeInteger(hit.seq)) throw new Error("消息序号无效。");
  const fingerprint = hit.fingerprint;
  if (!/^[a-f0-9]{64}$/u.test(fingerprint)) throw new Error("消息指纹无效，请重新搜索。");
  const parameters = new URLSearchParams(hit.msgUuid ? { message: hit.msgUuid, fingerprint }
    : { seq: String(hit.seq), fingerprint });
  return `agenthub://session/${encodeURIComponent(hit.sessionUuid)}?${parameters}`;
}
