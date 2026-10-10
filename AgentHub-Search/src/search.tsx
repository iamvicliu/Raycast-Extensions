import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { agentHubLink, ContextWindow, contextWindow, Hit, search, sourcePath } from "./database";
import { excerpt, groupSessions, highlight, literal } from "./presentation";

// Same sources and labels as AgentHub's filter bar.
const sources: Record<string, string> = { all: "全部来源", claude: "Claude Code", codex: "Codex CLI", cursor: "Cursor", dsh: "DeepSeek Harness", gemini: "Gemini CLI", hermes: "Hermes", openclaw: "OpenClaw", opencode: "OpenCode", pi: "Pi", workbuddy: "WorkBuddy" };
const role = (value: string) => value === "user" ? "用户" : value === "assistant" ? "助手" : value;
const databasePath = () => getPreferenceValues<{ database: string }>().database || "~/.agenthub/agenthub.db";

function MessageDetail({ hit, input }: { hit: Hit; input: string }) {
  const [window, setWindow] = useState<ContextWindow>({ messages: [], hasBefore: false, hasAfter: false });
  const [before, setBefore] = useState(2), [after, setAfter] = useState(2);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    contextWindow(databasePath(), hit, before, after).then(rows => { if (active) setWindow(rows); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [hit, before, after]);
  const markdown = error ? `读取失败：${literal(error)}` : `# ${literal(hit.title)}\n\n**加载上下文：⌘⇧P 前面 5 条 · ⌘⇧N 后面 5 条**\n\n到达会话边界时，对应加载操作不可用。\n\n${input ? `### 命中段落\n\n${highlight(excerpt(hit.text, input), input)}\n\n---\n\n` : ""}${window.hasBefore ? "*⌘⇧P：加载前面 5 条消息。*\n\n" : ""}${window.messages.map(m =>
    `### ${m.id === hit.id ? "→ 命中消息 · " : ""}${role(m.role)}\n\n${highlight(m.id === hit.id ? hit.text : m.text, input)}\n\n---`).join("\n\n")}${window.hasAfter ? "\n\n*⌘⇧N：加载后面 5 条消息。*" : ""}${before === 500 || after === 500 ? "\n\n*单侧最多显示 500 条；完整会话可在 AgentHub 查看。*" : ""}`;
  return <Detail isLoading={loading} markdown={markdown} actions={<Actions hit={hit} input={input} inContext
    onBefore={window.hasBefore && before < 500 ? () => { if (!loading) setBefore(n => Math.min(500, n + 5)); } : undefined}
    onAfter={window.hasAfter && after < 500 ? () => { if (!loading) setAfter(n => Math.min(500, n + 5)); } : undefined}
  />} />;
}

function Actions({ hit, input, inContext = false, onBefore, onAfter }: { hit: Hit; input: string; inContext?: boolean; onBefore?: () => void; onAfter?: () => void }) {
  return <ActionPanel>
    {!inContext && <Action.Push title="查看消息上下文" icon={Icon.Text} target={<MessageDetail hit={hit} input={input} />} />}
    {onBefore && <Action title="加载前面 5 条消息" icon={Icon.ArrowUp} shortcut={{ modifiers: ["cmd", "shift"], key: "p" }} onAction={onBefore} />}
    {onAfter && <Action title="加载后面 5 条消息" icon={Icon.ArrowDown} shortcut={{ modifiers: ["cmd", "shift"], key: "n" }} onAction={onAfter} />}
    <Action title="在 AgentHub 查看" icon="agenthub.png" onAction={async () => {
      try { await open(await agentHubLink(databasePath(), hit), "/Applications/AgentHub.app"); }
      catch (error) { await showToast({ style: Toast.Style.Failure, title: "无法打开 AgentHub", message: String(error) }); }
    }} />
    <Action.CopyToClipboard title="复制命中消息（最多两万字）" content={hit.text} />
    {hit.source === "codex" && <Action.OpenInBrowser title="在 Codex 打开会话" url={`codex://threads/${encodeURIComponent(hit.sessionUuid)}`} />}
    <Action.CopyToClipboard title="复制会话 ID" content={hit.sessionUuid} />
    <Action.ShowInFinder title="显示原始记录文件" path={sourcePath(hit.filePath)} />
  </ActionPanel>;
}

function SessionHits({ hits, input }: { hits: Hit[]; input: string }) {
  return <List isShowingDetail navigationTitle={hits[0].title} searchBarPlaceholder="筛选本会话已加载的消息">
    <List.Section title={hits[0].title} subtitle={`${hits.length} 条已加载消息`}>
      {hits.map(hit => <List.Item key={hit.id} title={hit.snippet.replace(/\s+/gu, " ")} subtitle={role(hit.role)}
        keywords={[hit.text]} detail={<List.Item.Detail markdown={highlight(excerpt(hit.text, input, 3000), input)} />}
        actions={<Actions hit={hit} input={input} />} />)}
    </List.Section>
  </List>;
}

export default function Command() {
  const [input, setInput] = useState("");
  const [source, setSource] = useState("all");
  const [rows, setRows] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef(0);
  useEffect(() => {
    const id = ++request.current;
    setLoading(true); setError("");
    const timer = setTimeout(() => search(databasePath(), input, source).then(hits => {
      if (id === request.current) setRows(hits);
    }).catch(e => { if (id === request.current) { setRows([]); setError(e.message); } })
      .finally(() => { if (id === request.current) setLoading(false); }), 200);
    return () => { clearTimeout(timer); request.current++; };
  }, [input, source]);
  const groups = groupSessions(rows);
  return <List isLoading={loading} filtering={false} onSearchTextChange={setInput}
    searchBarPlaceholder="搜索消息正文；留空查看最近会话" searchBarAccessory={<List.Dropdown tooltip="来源" onChange={setSource}>
      {Object.entries(sources).map(([value, title]) => <List.Dropdown.Item key={value} value={value} title={title} />)}
    </List.Dropdown>}>
    {error ? <List.EmptyView icon={Icon.ExclamationMark} title="读取失败" description={error} /> :
      rows.length === 0 ? <List.EmptyView title="没有匹配消息" description="只搜索 AgentHub 已同步的用户和助手消息；请检查数据源并在 AgentHub 同步。" /> :
        <List.Section title={input ? "命中会话" : "最近会话"} subtitle={`${groups.length} 个会话 · 按最近 50 条消息合并`}>
          {groups.map(hits => <List.Item key={hits[0].sessionId} title={hits[0].title} subtitle={sources[hits[0].source] || hits[0].source}
            accessories={[{ text: `${hits.length} 条`, tooltip: "本次搜索已加载的消息数，并非会话总数" }]}
            actions={<ActionPanel><Action.Push title="查看会话中的命中消息" icon={Icon.Text} target={<SessionHits hits={hits} input={input} />} /></ActionPanel>} />)}
        </List.Section>}
  </List>;
}
