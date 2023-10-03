"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const pdfPoppler = require("pdf-poppler");
const sharp = require("sharp");
const icon = path.join(__dirname, "../../resources/icon.png");
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.electron");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });
});
electron.ipcMain.on("convert-pdf-to-image", (event, { pdfPath, outputPath = "./testes/" }) => {
  const options = {
    format: "jpeg",
    out_dir: path.dirname(outputPath),
    out_prefix: path.basename(pdfPath),
    page: 1
  };
  pdfPoppler.convert(pdfPath, options).then(() => {
    const outputImagePath = path.join(outputPath, "conversao-1.jpg");
    sharp(outputImagePath).extract({ left: 0, top: 0, width: 340, height: 170 }).rotate(-90).toFile(path.join(outputPath, `RDM ${path.basename(pdfPath), path.extname(pdfPath)}`), (err, info) => {
      if (err) {
        event.sender.send("conversion-complete", { success: false, error: err.message });
      } else {
        event.sender.send("conversion-complete", { success: true, outputPath: `RDM ${path.basename(pdfPath), path.extname(pdfPath)}` });
      }
    });
  }).catch((error) => {
    event.sender.send("conversion-complete", { success: false, error: error.message });
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
