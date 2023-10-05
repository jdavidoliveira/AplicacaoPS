import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, basename, resolve } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import pdfPoppler from 'pdf-poppler'
import sharp from 'sharp'; // Adicione o 'sharp' como uma dependência

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})


ipcMain.on('convert-pdf-to-image', (event, { pdfPath, outputPath }) => {
  const absoluteDesktopPath = outputPath || app.getPath('desktop');
  const absoluteOutputPath = join(absoluteDesktopPath, '/codabar/');
  try {
    if (!fs.existsSync(absoluteOutputPath)) {
      fs.mkdirSync(absoluteOutputPath);
    } else {
      console.log('Diretorio ja existe')
    }
  } catch (error) {
    console.error(error);
  }
  console.log(absoluteDesktopPath);
  const options = {
    format: 'jpeg',
    out_dir: absoluteOutputPath,
    out_prefix: basename(pdfPath, ".pdf"),
    page: 1,
  };

  pdfPoppler.convert(pdfPath, options)
    .then(() => {
      const convertedImagePath = resolve(absoluteOutputPath + basename(pdfPath, ".pdf") + '-1.jpg'); // Caminho completo do arquivo de imagem gerado
      console.log(convertedImagePath);

      // Após a conversão para JPEG, processar a imagem usando o 'sharp'
      sharp(convertedImagePath)
        .extract({ left: 0, top: 63,  width: 323, height: 170 }) // Coordenadas de corte da imagem original
        .resize({width: 495})
        .rotate(-90) // Girar a imagem original em -90 graus (esquerda)
        .toBuffer().then((rotatedBuffer) => {
          // Criar uma nova imagem com largura suficiente para ambas as imagens
          const outputWidth = 787; // Largura da imagem original + largura da imagem rotacionada
          const outputHeight = 551; // A altura deve ser a mesma da imagem original

          sharp({
            create: {
              width: outputWidth,
              height: outputHeight,
              channels: 3,
              background: { r: 255, g: 255, b: 255 } // Cor de fundo branca
            }
          })
            .composite([
              {
                input: rotatedBuffer, // Imagem original rotacionada
                left: 130, // Posição da imagem original na esquerda
                top: 30
              },
              {
                input: rotatedBuffer, // Imagem rotacionada
                left: 520, // Posição da imagem rotacionada à direita da original
                top: 30
              }
            ])
            .toFile(absoluteOutputPath + basename(pdfPath, ".pdf") + '.jpg', (err) => {
              if (err) {
                event.sender.send('conversion-complete', { success: false, error: err.message });
              } else {
                event.sender.send('conversion-complete', { success: true, outputPath: `${basename(pdfPath, ".pdf")}.jpg` });
                fs.unlinkSync(convertedImagePath);
              }
            });
        })
        .catch(error => {
          event.sender.send('conversion-complete', { success: false, error: error.message });
        });
    })
    .catch(error => {
      event.sender.send('conversion-complete', { success: false, error: error.message });
    });
});


// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
