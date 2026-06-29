# Lyra User Interface

Graphic client for Lyra on Desktop (GNU/Linux).

Electron desktop client for Lyra — an open source AI assistant for GNU/Linux.

Communicates with `lyra-server` via Unix socket. Renders markdown responses,
displays system metrics (RAM, CPU, disk), and manages conversation sessions.

### Requirements

- Node.js 20+
- pnpm
- GNU/Linux x86_64
- `lyra-server` running as a daemon

## Development

### Installation

```bash
git clone https://github.com/lyra-ai-assistant/lyra-ui
cd lyra-ui
pnpm install
pnpm start
```

The lyra-ui will attempt to start lyra-server automatically if the daemon is not running.

### Build
```bash
pnpm build
# Output: dist/lyra-ui-<version>.tar.gz
```

## Architecture

### File system
```bash
lyra-ui
├── eventHandlers/  # Renderer logic: prompt, navbar, widgets, daemon status
├── OS/             # System metrics: RAM, CPU, disk (Node.js os module)
├── preloader/      # contextBridge: secure API exposed to renderer
├── server/         # Unix socket client (lyraSocket.js)
├── styles/         # CSS partials
├── utils/          # Config, localStorage handler
├── index.html      # Base HTML, CSP, Chart.js CDN import
└── main.js         # Main process: BrowserWindow, IPC handlers, markdown render
```

### IPC channels

| Channel | Direction | Description |
|---------|-----------|-------------|
| `send-query` | renderer → main | Send query to daemon, returns rendered HTML |
| `get-ram-usage` | renderer → main | RAM metrics |
| `get-cpu-usage` | renderer → main | CPU metrics |
| `get-disk-usage` | renderer → main | Disk metrics |
| `retry-daemon` | renderer → main | Retry daemon connection |
| `new-chat` | renderer → main | Reset session |
| `daemon-status` | main → renderer | Push: connecting / ready / error |

### Socket protocol

```
Request:  {"query": "...", "session_id": "uuid|null"}
Response: {"response": "markdown string", "session_id": "uuid"}
```

#### Stack

| Component | Technology |
|-----------|------------|
| Framework | Electron 30.5.1 |
| Node.js | 20.16.0 |
| Package manager | pnpm |
| Build | electron-builder 24.13.3 |
| Markdown | markdown-it 14.2.0 |
| Charts | Chart.js |

## License

(AGPL-3.0 license)[https://github.com/lyra-ai-assistant/lyra-ui?tab=AGPL-3.0-1-ov-file]
```
