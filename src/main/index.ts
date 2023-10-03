import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, dirname, basename, extname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import pdfPoppler from 'pdf-poppler'
import sharp from 'sharp'; // Adicione o 'sharp' como uma dependência

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
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


ipcMain.on('convert-pdf-to-image', (event, { pdfPath, outputPath = './testes/' }) => {
  const options = {
    format: 'jpeg',
    out_dir: dirname(outputPath),
    out_prefix: basename(pdfPath),
    page: 1,
  };

  pdfPoppler.convert(pdfPath, options)
    .then(() => {
      const outputImagePath = join(outputPath, 'conversao-1.jpg'); // Caminho completo do arquivo de imagem gerado

      // Após a conversão para JPEG, processar a imagem usando o 'sharp'
      sharp(outputImagePath)
        .extract({ left: 0, top: 0, width: 340, height: 170 }) // Coordenadas de corte (ajuste conforme necessário)
        .rotate(-90) // Girar a imagem original em -90 graus (esquerda)
        .toFile(join(outputPath, `RDM ${basename(pdfPath, ".jpg")}`), (err, info) => {
          if (err) {
            event.sender.send('conversion-complete', { success: false, error: err.message });
          } else {
            event.sender.send('conversion-complete', { success: true, outputPath: `RDM ${basename(pdfPath), ".jpg"}` });
          }
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
