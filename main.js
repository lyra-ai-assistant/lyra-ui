const {
  app,
  shell,
  screen,
  ipcMain,
  BrowserWindow,
  Menu,
} = require("electron/main");
const path = require("node:path");
const config = require("./utils/config");
const MarkdownIt = require("markdown-it");
const { getRAMUsage } = require("./OS/RAM");
const { getCPUUsage } = require("./OS/CPU");
const { getDiskUsage } = require("./OS/Disk");
const lyraSocket = require("./server/lyraSocket");
const { resetSession } = require("./server/lyraSocket");

let mainWindow;
const md = new MarkdownIt();

function pushDaemonStatus(status, detail) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("daemon-status", { status, detail });
}

/**
 * Makes sure the daemon is reachable, pushing status updates to the
 * renderer along the way ("connecting" -> "ready" | "error").
 * Safe to call multiple times (e.g. on retry from the UI).
 */
async function initDaemon() {
  if (await lyraSocket.isDaemonRunning()) {
    pushDaemonStatus("ready");
    return;
  }

  pushDaemonStatus("connecting");
  try {
    await lyraSocket.ensureDaemonRunning();
    pushDaemonStatus("ready");
  } catch (err) {
    pushDaemonStatus("error", err.message);
  }
}

function createWindow() {
  const { height } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width: 800,
    minWidth: 362,
    height: height,
    minHeight: height / 2,
    webPreferences: {
      focusStyle: false,
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "./preloader/preload.js"),
    },
    icon: path.join(__dirname, "assets/app/logo.png"),
  });

  mainWindow = win;

  if (config.nodeEnv === "production") {
    Menu.setApplicationMenu(null);
  }
  if (config.nodeEnv === "development") {
    win.webContents.openDevTools();
  }

  win.loadFile("index.html");

  win.webContents.on("did-finish-load", () => {
    initDaemon();
  });

  win.webContents.on("will-navigate", (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("new-chat", () => {
  resetSession();
});

ipcMain.handle("get-ram-usage", async () => await getRAMUsage());
ipcMain.handle("get-cpu-usage", async () => await getCPUUsage());
ipcMain.handle("get-disk-usage", async () => await getDiskUsage());

ipcMain.handle("send-query", async (_event, text) => {
  await lyraSocket.ensureDaemonRunning();
  const result = await lyraSocket.sendQuery(text);
  return md.render(result);
});

ipcMain.handle("retry-daemon", async () => {
  await initDaemon();
});
