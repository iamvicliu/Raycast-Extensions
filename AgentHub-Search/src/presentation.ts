import type { Hit } from "./database";

export const literal = (text: string) => text.replace(/[\\`*_{}[\]()#+.!<>|~-]/g, "\\$&");
export const terms = (input: string) => [...new Set(input.trim().split(/\s+/u).filter(Boolean))];

/** Escape stored Markdown before adding our own highlighting. */
export function highlight(text: string, input: string): string {
  const words = terms(input).sort((a, b) => b.length - a.length);
  if (!words.length) return literal(text);
  const pattern = new RegExp(words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "giu");
  let result = "", start = 0;
  for (const match of text.matchAll(pattern)) {
    result += literal(text.slice(start, match.index)) + `🟨**【${literal(match[0])}】**`;
    start = match.index! + match[0].length;
  }
  return result + literal(text.slice(start));
}

export function excerpt(text: string, input: string, length = 800): string {
  const lower = text.toLowerCase();
  const positions = terms(input).map(t => lower.indexOf(t.toLowerCase())).filter(p => p >= 0);
  const position = positions.length ? Math.min(...positions) : 0;
  const start = Math.max(0, position - Math.floor(length / 4));
  return `${start ? "…" : ""}${text.slice(start, start + length)}${start + length < text.length ? "…" : ""}`;
}

export function groupSessions(hits: Hit[]): Hit[][] {
  const groups = new Map<number, Hit[]>();
  for (const hit of hits) {
    const group = groups.get(hit.sessionId) || [];
    group.push(hit); groups.set(hit.sessionId, group);
  }
  return [...groups.values()];
}
