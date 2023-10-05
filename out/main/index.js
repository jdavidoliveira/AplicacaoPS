"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const utils = require("@electron-toolkit/utils");
const pdfPoppler = require("pdf-poppler");
const sharp = require("sharp");
const icon = path.join(__dirname, "../../resources/icon.png");
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 900,
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
electron.ipcMain.on("convert-pdf-to-image", (event, { pdfPath, outputPath }) => {
  const absoluteDesktopPath = outputPath || electron.app.getPath("desktop");
  const absoluteOutputPath = path.join(absoluteDesktopPath, "/codabar/");
  try {
    if (!fs.existsSync(absoluteOutputPath)) {
      fs.mkdirSync(absoluteOutputPath);
    } else {
      console.log("Diretorio ja existe");
    }
  } catch (error) {
    console.error(error);
  }
  console.log(absoluteDesktopPath);
  const options = {
    format: "jpeg",
    out_dir: absoluteOutputPath,
    out_prefix: path.basename(pdfPath, ".pdf"),
    page: 1
  };
  pdfPoppler.convert(pdfPath, options).then(() => {
    const convertedImagePath = path.resolve(absoluteOutputPath + path.basename(pdfPath, ".pdf") + "-1.jpg");
    console.log(convertedImagePath);
    sharp(convertedImagePath).extract({ left: 0, top: 63, width: 323, height: 170 }).resize({ width: 495 }).rotate(-90).toBuffer().then((rotatedBuffer) => {
      const outputWidth = 787;
      const outputHeight = 551;
      sharp({
        create: {
          width: outputWidth,
          height: outputHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
          // Cor de fundo branca
        }
      }).composite([
        {
          input: rotatedBuffer,
          // Imagem original rotacionada
          left: 130,
          // Posição da imagem original na esquerda
          top: 30
        },
        {
          input: rotatedBuffer,
          // Imagem rotacionada
          left: 520,
          // Posição da imagem rotacionada à direita da original
          top: 30
        }
      ]).toFile(absoluteOutputPath + path.basename(pdfPath, ".pdf") + ".jpg", (err) => {
        if (err) {
          event.sender.send("conversion-complete", { success: false, error: err.message });
        } else {
          event.sender.send("conversion-complete", { success: true, outputPath: `${path.basename(pdfPath, ".pdf")}.jpg` });
          fs.unlinkSync(convertedImagePath);
        }
      });
    }).catch((error) => {
      event.sender.send("conversion-complete", { success: false, error: error.message });
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
