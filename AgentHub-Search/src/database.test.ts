import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { agentHubLink, context, contextWindow, search, sourcePath } from './database';
const root = mkdtempSync(join(process.cwd(), 'test-fixture-'));
after(() => rmSync(root, { recursive: true, force: true }));
const file = join(root,'session.jsonl'); writeFileSync(file,'{}');
const db = join(root,'test.db');
execFileSync('/usr/bin/sqlite3',[db, `
CREATE TABLE sources(id INTEGER,name TEXT); INSERT INTO sources VALUES(1,'codex'),(2,'claude');
CREATE TABLE projects(id INTEGER,display_path TEXT); INSERT INTO projects VALUES(1,'/test');
CREATE TABLE sessions(id INTEGER,session_uuid TEXT,title TEXT,file_path TEXT,source_id INTEGER,project_id INTEGER);
INSERT INTO sessions VALUES(1,'test-session','Fixture','${file}',1,1),(2,'missing','Deleted','${root}/missing.jsonl',2,1);
CREATE TABLE messages(id INTEGER PRIMARY KEY, session_id INTEGER,content_text TEXT,role TEXT,timestamp TEXT,seq INTEGER,is_sidechain INTEGER,msg_uuid TEXT);
INSERT INTO messages(id,session_id,content_text,role,timestamp,seq,is_sidechain) VALUES(1,1,'Raycast DNS 服务器 路由 100% don''t','user','2026-10-06',1,0),
(2,1,'Assistant Raycast reply','assistant','2026-10-07',2,0),(3,2,'Raycast','user','2026-10-08',1,0),
(4,1,'Raycast internal tool','tool','2026-10-09',3,0),(5,1,'Raycast sidechain','assistant','2026-10-10',4,1);
CREATE VIRTUAL TABLE messages_fts USING fts5(content_text,content='messages',content_rowid='id');
CREATE VIRTUAL TABLE messages_fts_trigram USING fts5(content_text,content='messages',content_rowid='id',tokenize='trigram');
INSERT INTO messages_fts(messages_fts) VALUES('rebuild');
INSERT INTO messages_fts_trigram(messages_fts_trigram) VALUES('rebuild');`]);
test('English search excludes tools, sidechains and missing original files', async()=>assert.deepEqual((await search(db,'Raycast')).map(r=>r.id),[2,1]));
test('Chinese short terms, longer terms and multiple terms', async()=>{
 for(const q of ['路由','服务器','DNS 服务器']) assert.deepEqual((await search(db,q)).map(r=>r.id),[1]);
});
test('SQL quotes and LIKE wildcards remain literal', async()=>{
 assert.equal((await search(db,"don't")).length,1);
 assert.equal((await search(db,'路由 100%')).length,1);
 assert.equal((await search(db,"x'; DROP TABLE messages;--")).length,0);
 assert.equal((await search(db,'Raycast')).length,2);
});
test('source filter, empty query, context and missing database', async()=>{
 assert.equal((await search(db,'Raycast','claude')).length,0);
 assert.equal((await search(db,'')).length,2);
 const hit=(await search(db,'服务器'))[0];
 assert.deepEqual((await context(db,hit)).map(m=>m.id),[1,2,4]);
 await assert.rejects(search(join(root,'absent.db'),'x'),/找不到/);
});
test('AgentHub links use guarded seq fallback and never the row ID', async()=>{
 const hit=(await search(db,'服务器'))[0];
 const url=new URL(await agentHubLink(db,hit));
 assert.equal(url.protocol,'agenthub:');
 assert.equal(url.hostname,'session'); assert.equal(url.searchParams.get('seq'),'1');
 assert.match(url.searchParams.get('fingerprint')!,/^[a-f0-9]{64}$/);
 await assert.rejects(agentHubLink(db,{...hit,fingerprint:'invalid'}),/指纹/);
 execFileSync('/usr/bin/sqlite3',[db,"UPDATE messages SET msg_uuid='中文 +?#' WHERE id=1;"]);
 const identified=(await search(db,'服务器'))[0];
 const stable=new URL(await agentHubLink(db,identified));
 assert.equal(stable.searchParams.get('message'),'中文 +?#');
 assert.equal(stable.searchParams.has('seq'),false);
 execFileSync('/usr/bin/sqlite3',[db,'UPDATE messages SET id=900 WHERE id=1;']);
 assert.equal(await agentHubLink(db,identified),stable.href);
 assert.equal(await agentHubLink(join(root,'absent.db'),identified),stable.href);
});

import { excerpt, groupSessions, highlight } from './presentation';
test('session groups preserve newest order and match counts', () => {
 const hits = [{sessionId: 1}, {sessionId: 2}, {sessionId: 1}] as Parameters<typeof groupSessions>[0];
 assert.deepEqual(groupSessions(hits).map(g => g.length), [2,1]);
});
test('highlight escapes stored Markdown and centers late matches', () => {
 assert.equal(highlight('[link](https://x) DNS', 'dns'), '\\[link\\]\\(https://x\\) 🟨**【DNS】**');
 assert.ok(excerpt('x'.repeat(25000) + '路由命中', '路由', 240).includes('路由命中'));
 assert.equal(highlight('a+b [a]', 'a+b'), '🟨**【a\\+b】** \\[a\\]');
});
test('context pagination detects boundaries and tolerates sequence gaps', async () => {
 const hit = (await search(db, 'Assistant'))[0];
 execFileSync('/usr/bin/sqlite3', [db, "UPDATE messages SET seq=20 WHERE id=4;"]);
 const initial = await contextWindow(db, hit, 0, 0);
 assert.deepEqual(initial.messages.map(m => m.id), [hit.id]);
 assert.equal(initial.hasBefore, true); assert.equal(initial.hasAfter, true);
 const expanded = await contextWindow(db, hit, 5, 5);
 assert.equal(expanded.hasBefore, false); assert.equal(expanded.hasAfter, false);
 assert.ok(expanded.messages.some(m => m.seq === 20));
});

test('database-backed sessions resolve to their database file', ()=>{
 assert.equal(sourcePath('/Users/x/.hermes/state.db#local-session=20260412_0052'),'/Users/x/.hermes/state.db');
 assert.equal(sourcePath('/Users/x/.local/share/opencode/opencode.db#session=ses_1'),'/Users/x/.local/share/opencode/opencode.db');
 assert.equal(sourcePath('/Users/x/.claude/projects/p/s.jsonl'),'/Users/x/.claude/projects/p/s.jsonl');
});
