# AgentHub会话搜索 · Raycast 扩展

不用打开 [AgentHub](https://github.com/iamvicliu/AgentHub)，在 Raycast 里就能搜你所有 AI Agent 的历史会话：Claude Code、Codex、Cursor 等 10 种 Agent 的对话一次搜完。

它读取的是 AgentHub 在本机建好的索引，所以要先安装 AgentHub、同步过一次会话。

## 功能

### 搜索

- 输入关键词即时搜索消息正文，中文、英文、多个词都可以。
- 可以按 Agent 筛选，来源列表和 AgentHub 一致。
- 什么都不输入时，显示最近的消息。
- 结果按会话归类，同一个会话里命中的多条消息放在一起。

### 查看

- 右侧预览消息正文，命中的词会高亮。
- 回车查看这条消息的前后文；`⌘⇧P` 往前多加载 5 条，`⌘⇧N` 往后多加载 5 条。

### 跳转和复制

- **在 AgentHub 查看**：打开 AgentHub，直接定位并高亮这条消息。AgentHub 没开着也能唤起。
- **在 Codex 打开会话**：Codex 的会话可以直接回到 Codex 里。
- 复制消息内容或会话 ID，或者在访达中显示原始记录文件。

## 安装

目前没有上架 Raycast Store，需要自己构建安装，大约 2 分钟。

**准备工作**

- macOS，已安装 [Raycast](https://www.raycast.com/)（在 2.7.3 上测试过）。
- 已安装 [AgentHub](https://github.com/iamvicliu/AgentHub/releases) 1.0.0 或更高版本，并且至少打开同步过一次。
- 已安装 [Node.js](https://nodejs.org/) 22.22.2 或更高版本。

**安装步骤**

1. 下载本仓库并进入扩展目录：

   ```bash
   git clone https://github.com/iamvicliu/Raycast-Extensions.git
   cd Raycast-Extensions/AgentHub-Search
   ```

2. 安装依赖并构建，构建完成后扩展会自动装进 Raycast：

   ```bash
   npm install
   npm run build
   ```

3. 打开 Raycast，输入「AgentHub会话搜索」就能用。建议在 Raycast 设置里给它绑一个快捷键或别名。

## 使用方法

1. 打开「AgentHub会话搜索」，输入关键词。
2. 需要时用右上角的下拉框筛选 Agent。
3. 选中一个会话，回车查看里面命中的消息。
4. 选中一条消息，回车查看前后文；按 `⌘K` 打开操作菜单，选择跳转到 AgentHub 或复制。

## 数据与隐私

- **只读，不改数据**：只读取 AgentHub 的索引，不会修改它，也不会动各 Agent 的原始记录。
- **不联网**：所有搜索都在本机完成，不上传任何对话内容。
- 默认读取 `~/.agenthub/agenthub.db`。如果你改过 AgentHub 的数据目录，在 Raycast 的扩展设置里改「AgentHub 数据库路径」。

## 常见问题

**搜不到结果？**
先打开 AgentHub 同步一次。扩展只能搜到 AgentHub 已经同步过的会话。

**提示「数据库暂时无法只读打开」？**
先打开 AgentHub 再搜。AgentHub 完全退出后，系统自带的 SQLite 有时打不开它的数据库；扩展会直接提示，不会改用可写方式去读。

**来源列表里有某个 Agent，但搜不到它的会话？**
列表固定列出 AgentHub 支持的 10 种 Agent，不代表每种都有数据，你没用过的 Agent 自然没有结果。

---

以下是技术说明，普通使用可以跳过。

## 技术说明

### 工作方式

- 通过系统自带的 `/usr/bin/sqlite3` 以只读和安全模式（`-readonly -safe`）查询 AgentHub 的索引。安全模式会关掉 sqlite3 命令行的读写文件、挂载其他数据库、加载扩展等功能。
- 英文用全文索引搜索；中文用三字分词索引，少于三个字的中文词改为逐条匹配正文。
- 最多返回最近的 50 条命中消息，预览和复制最多 20,000 字。
- 原始记录已经被删除的会话不会出现在结果里。
- Codex 会话的标题从 Codex 自己的 `~/.codex/state_5.sqlite` 读取，和 Codex 里显示的一致。

### 跳转链接格式

「在 AgentHub 查看」使用 AgentHub 的链接协议：

```text
agenthub://session/<会话ID>?message=<消息ID>&fingerprint=<SHA-256>
```

- 消息没有 ID 时改用消息序号 `seq`，同样必须带指纹，不使用数据库内部的行号。
- 指纹是 `JSON.stringify([role, timestamp, content_text])` 的 SHA-256，用来确认跳到的是同一条消息。
- 找不到完全匹配的消息时，AgentHub 会明确报错，不会跳到相邻的消息。

### 开发

```bash
npm install
npm test           # 运行测试（全部使用虚构数据）
npm run typecheck  # 类型检查
npm run dev        # 开发模式，改代码后 Raycast 里实时生效
npm run build      # 构建并安装到 Raycast
```

### 代码结构

```text
src/
  search.tsx         Raycast 界面：搜索列表、会话内消息、上下文详情、操作菜单
  database.ts        只读查询 AgentHub 索引、生成跳转链接
  presentation.ts    预览文字的转义、高亮、摘录
  database.test.ts   测试
```

## 许可证

[MIT](LICENSE)

## 免责声明

- 本扩展是第三方工具，与 Raycast 官方无关联。
- AgentHub 基于开源项目 Spool 开发，本扩展与 Spool 官方同样无关联。
