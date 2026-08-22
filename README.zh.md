# dsh-quick-restart

DeepSeek Harness Web 界面一键重启按钮。

在侧边栏底部（设置按钮旁边）添加一个圆形重启按钮（↻）。单击立即重启 dsh web 进程——页面会断开约 15–20 秒，刷新后一切恢复正常（会话已持久化到磁盘并自动恢复）。按钮是持久的：它能在自身触发的重启中存活。

## 功能特性

- **单击重启** — 无需二次确认，单击即触发。
- **持久化** — 在自身触发的重启中存活（作为 bundle 层插件安装，而非动态会话插件）。
- **小巧** — 位于侧边栏底部的设置触发器旁边；在 56px 窄栏中仅显示图标，在宽侧边栏中显示图标 + 标签。
- **进行中反馈** — 请求处理时按钮变红并显示"重启中…" → "已触发"。
- **重入守卫** — 重启进行中再次单击会被拒绝。
- **在线状态点** — 按钮旁显示 DSH 存活状态——绿色点每 5 秒轮询 `GET /dsh-health`（harness 不可达或重启中为红色）。

## 安装

从本地目录安装：

```sh
dsh plugin --profile web add D:/dsh/dsh-quick-restart
```

从 GitHub 安装：

```sh
dsh plugin --profile web add github:zhuifengqug/dsh-quick-restart
```

安装后重启一次 dsh web 进程以加载 bundle 层。

## 工作原理

| 层 | 文件 | 作用 |
|----|------|------|
| Host | `index.js` | 在 webServer 上注册 `POST /dsh-quick-restart` 和 `GET /dsh-health` 路由；启动一个分离的独立 Node relay，等待当前进程退出后再启动替代进程。 |
| Client | `client.js` | 注册侧边栏底部按钮（slot `sidebar.footer.action`）；单击时请求 `POST /dsh-quick-restart`；每 5 秒轮询 `GET /dsh-health` 用于状态点。 |
| Bundle | `cordis.patch.yml` | 加载两个半部的插件行。 |

Host 路由在重启发生前返回响应（约 1 秒延迟），让浏览器有时间渲染"重启中"状态后再断开页面。对于 Web 启动，替代进程会自动添加 `--no-open`，因此重启只恢复服务，不会再次打开第二个浏览器窗口或已安装的 Web 应用窗口。

## Slash 命令后备

插件同时注册 `/restart` 作为 slash 命令，用于没有 Web UI 的环境。

## 兼容性

DeepSeek Harness 0.1.0-rc.7+（web profile）。

## 关于 npm 安装

当前插件仅发布到 GitHub，**尚未发布到 npm registry**。要从 npm 安装，需要先发布：

```sh
npm publish
```

发布后即可使用：

```sh
dsh plugin --profile web add dsh-quick-restart
```

## 许可证

MIT
