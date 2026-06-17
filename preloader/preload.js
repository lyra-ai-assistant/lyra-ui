const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  getCPUUsage: () => ipcRenderer.invoke("get-cpu-usage"),
  getRAMUsage: () => ipcRenderer.invoke("get-ram-usage"),
  getDiskUsage: () => ipcRenderer.invoke("get-disk-usage"),

  sendQuery: (text) => ipcRenderer.invoke("send-query", text),
  retryDaemon: () => ipcRenderer.invoke("retry-daemon"),

  // status: "connecting" | "ready" | "error"
  onDaemonStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("daemon-status", listener);
    return () => ipcRenderer.removeListener("daemon-status", listener);
  },
});

const attachContextData = () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };
  for (const type of ["chrome", "node", "electron"]) {
    replaceText(`${type}-version`, process.versions[type]);
  }
};
window.addEventListener("DOMContentLoaded", () => attachContextData());
