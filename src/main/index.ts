import { app, BrowserWindow } from "electron";
import path from "node:path";
import { registerIpc } from "./ipc/router";
import { logError, logInfo } from "./log";
import { startHookServer, stopHookServer } from "./hooks/server";

const isDev = !app.isPackaged;

process.on("uncaughtException", (err) => {
  void logError("uncaughtException", err);
});
process.on("unhandledRejection", (reason) => {
  void logError("unhandledRejection", reason);
});

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "AgentBoard",
    backgroundColor: "#fafaf9",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, "../preload/index.js"),
    },
  });

  win.webContents.on("render-process-gone", (_e, details) => {
    void logError("renderer-gone", new Error(`reason=${details.reason}`));
  });

  if (isDev) {
    await win.loadURL("http://localhost:5173");
  } else {
    await win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  registerIpc();
  try {
    await startHookServer();
  } catch (err) {
    void logError("hooks:start", err);
  }
  await logInfo("startup", `agent-board booting (dev=${isDev})`);
  await createWindow();
});

app.on("before-quit", () => {
  void stopHookServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
