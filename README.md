# Raycast Extensions

我自己写的 [Raycast](https://www.raycast.com/) 扩展合集。每个扩展一个目录，点进去看功能和安装方法。

## 扩展列表

| 扩展 | 在 Raycast 里的名字 | 做什么 |
| --- | --- | --- |
| [AgentHub-Search](./AgentHub-Search) | AgentHub会话搜索 | 不用打开 [AgentHub](https://github.com/iamvicliu/AgentHub)，在 Raycast 里搜 Claude Code、Codex、Cursor 等 10 种 AI Agent 的历史会话，并跳回 AgentHub 定位到那条消息 |

## 怎么安装

不用懂开发，也不用事先装 Node.js 或 Git。先装好 [Raycast](https://www.raycast.com/)，然后打开「终端」，粘贴下面这行按回车：

```bash
curl -fsSL https://raw.githubusercontent.com/iamvicliu/Raycast-Extensions/main/install.sh | bash
```

默认安装 AgentHub-Search。以后要装其他扩展，在命令末尾加 `-s 扩展目录名`，例如 `... | bash -s AgentHub-Search`。

**更新**：再运行一次同样的命令。Raycast 里已经设置好的快捷键、别名和扩展设置都会保留。

这行命令会临时下载 Node.js 官方版本（校验 SHA-256，装完即删，不装进系统）、下载本仓库源码、构建并装进 Raycast。脚本内容见 [install.sh](install.sh)。每个扩展可能还有自己的前提条件，以它目录里的 README 为准。

## 许可证

[MIT](LICENSE)。本仓库与 Raycast 官方无关联。

---

## English

My collection of [Raycast](https://www.raycast.com/) extensions. Each extension lives in its own folder with its own README.

| Extension | Name in Raycast | What it does |
| --- | --- | --- |
| [AgentHub-Search](./AgentHub-Search) | AgentHub会话搜索 (AgentHub Session Search) | Search sessions from 10 AI coding agents (Claude Code, Codex, Cursor, and more) indexed by [AgentHub](https://github.com/iamvicliu/AgentHub), right inside Raycast |

Not yet on the Raycast Store. Install with one command in Terminal — no Node.js or Git needed:

```bash
curl -fsSL https://raw.githubusercontent.com/iamvicliu/Raycast-Extensions/main/install.sh | bash
```

Run it again to update. MIT licensed; not affiliated with Raycast.
