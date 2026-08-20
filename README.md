# dsh-quick-restart

One-click restart button for the DeepSeek Harness Web UI.

Adds a small circular restart button (↻) to the sidebar footer, next to Settings. A single click immediately restarts the dsh web process — the page disconnects for ~15–20 seconds, then you refresh and everything is back (sessions are persisted on disk and recover automatically). The button is persistent: it survives the restart it triggers.

## Features

- **Single-click restart** — no confirmation step, no double-click dance.
- **Persistent** — survives the DSH restart it triggers (installed as a bundle-layer plugin, not a dynamic session plugin).
- **Small footprint** — sits beside the Settings trigger in the sidebar footer; icon-only in the 56px rail, icon + label in the wide sidebar.
- **In-flight feedback** — the button turns red and shows "重启中…" → "已触发" while the request is being processed.
- **Re-entry guard** — a second click while a restart is already in flight is rejected.
- **Online status dot** — the button also shows DSH liveness — a green dot polls `GET /dsh-health` every 5s (red when the harness is unreachable/restarting).

## Install

From local directory:

```sh
dsh plugin --profile web add D:/dsh/dsh-quick-restart
```

From GitHub:

```sh
dsh plugin --profile web add github:zhuifengqug/dsh-quick-restart
```

Then restart dsh web once so the bundle layer loads.

## How it works

| Layer | File | What it does |
|-------|------|--------------|
| Host | `index.js` | Registers `POST /dsh-quick-restart` and `GET /dsh-health` routes on the webServer; spawns a detached Node relay that waits for the current process to exit before launching the replacement. |
| Client | `client.js` | Registers the sidebar footer button (slot `sidebar.footer.action`); single click fetches `POST /dsh-quick-restart`; polls `GET /dsh-health` every 5s for the status dot. |
| Bundle | `cordis.patch.yml` | The loader row that mounts both halves. |

The host routes return before the restart happens (~1s host timer), giving the browser time to render the "restarting" state before the page drops.

## Slash command fallback

The plugin also registers `/restart` as a slash command for environments without the Web UI.

## Compatibility

DeepSeek Harness 0.1.0-rc.7+ (web profile).

## License

MIT
