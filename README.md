# Raycast Extensions

我自己写的 [Raycast](https://www.raycast.com/) 扩展合集。每个扩展一个目录，点进去看功能和安装方法。

## 扩展列表

| 扩展 | 在 Raycast 里的名字 | 做什么 |
| --- | --- | --- |
| [AgentHub-Search](./AgentHub-Search) | AgentHub会话搜索 | 不用打开 [AgentHub](https://github.com/iamvicliu/AgentHub)，在 Raycast 里搜 Claude Code、Codex、Cursor 等 10 种 AI Agent 的历史会话，并跳回 AgentHub 定位到那条消息 |

## 怎么安装

这些扩展还没有上架 Raycast Store，需要自己构建安装。需要先装好 Raycast 和 [Node.js](https://nodejs.org/) 22.22.2 或更高版本。

```bash
git clone https://github.com/iamvicliu/Raycast-Extensions.git
cd Raycast-Extensions/<扩展目录>
npm install
npm run build
```

构建完成后扩展会自动出现在 Raycast 里。每个扩展可能还有自己的前提条件，以它目录里的 README 为准。

## 更新

```bash
cd Raycast-Extensions
git pull
cd <扩展目录>
npm install
npm run build
```

Raycast 里已经设置好的快捷键、别名和扩展设置都会保留。

## 许可证

[MIT](LICENSE)。本仓库与 Raycast 官方无关联。

---

## English

My collection of [Raycast](https://www.raycast.com/) extensions. Each extension lives in its own folder with its own README.

| Extension | Name in Raycast | What it does |
| --- | --- | --- |
| [AgentHub-Search](./AgentHub-Search) | AgentHub会话搜索 (AgentHub Session Search) | Search sessions from 10 AI coding agents (Claude Code, Codex, Cursor, and more) indexed by [AgentHub](https://github.com/iamvicliu/AgentHub), right inside Raycast |

Not yet on the Raycast Store. To install, clone this repo, `cd` into an extension folder, then run `npm install && npm run build` (requires Node.js 22.22.2+). MIT licensed; not affiliated with Raycast.
