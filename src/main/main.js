/**
 * ADB Toolkit
 * 作者: qiuqiqiuqid
 * 仓库: https://github.com/qiuqiqiuqid/adb-toolkit
 * 借助 opencode (https://opencode.ai) 开发
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const log = require('electron-log');
const { AdbClient } = require('./adb');
const { ScrcpyController } = require('./scrcpy');

log.transports.file.level = 'info';
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs', 'main.log');

let mainWindow;
let adbClient;
let scrcpyController;

const isDev = process.argv.includes('--dev');

function getBinPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bin');
  }
  return path.join(__dirname, '..', 'bin');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: true,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'renderer', 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  const rendererPath = path.join(__dirname, '..', 'renderer');
  
  mainWindow.loadFile(path.join(rendererPath, 'index.html'));

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  log.info('Application started');
}

app.whenReady().then(async () => {
  const binPath = getBinPath();
  log.info(`Binary path: ${binPath}`);
  
  adbClient = new AdbClient(binPath);
  scrcpyController = new ScrcpyController(binPath);
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('adb:getDevices', async () => {
  try {
    return await adbClient.getDevices();
  } catch (error) {
    log.error('Get devices error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:getDeviceInfo', async (event, serial) => {
  try {
    return await adbClient.getDeviceInfo(serial);
  } catch (error) {
    log.error('Get device info error:', error);
    return { error: error.message };
  }
});

// Root related IPCs
ipcMain.handle('adb:rootEnable', async (event, serial) => {
  try {
    return await adbClient.enableRoot(serial);
  } catch (error) {
    log.error('Root enable error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:rootCan', async (event, serial) => {
  try {
    return await adbClient.canRoot(serial);
  } catch (error) {
    log.error('Root can error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:rootRun', async (event, serial, cmd, args) => {
  try {
    return await adbClient.runRootCommand(serial, cmd, args || []);
  } catch (error) {
    log.error('Root run error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:rootRunScript', async (event, serial, scriptPath) => {
  try {
    return await adbClient.runShScriptRoot(serial, scriptPath);
  } catch (error) {
    log.error('Root run script error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:pushFileRoot', async (event, serial, localPath, remotePath) => {
  try {
    return await adbClient.pushFileRoot(serial, localPath, remotePath);
  } catch (error) {
    log.error('Root push file error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:installApk', async (event, serial, filePath) => {
  try {
    return await adbClient.installApk(serial, filePath);
  } catch (error) {
    log.error('Install APK error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:installApks', async (event, serial, filePaths) => {
  try {
    return await adbClient.installApks(serial, filePaths);
  } catch (error) {
    log.error('Install APKs error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:uninstallPackage', async (event, serial, packageName) => {
  try {
    return await adbClient.uninstallPackage(serial, packageName);
  } catch (error) {
    log.error('Uninstall package error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:uninstallPackageKeepData', async (event, serial, packageName) => {
  try {
    return await adbClient.uninstallPackageKeepData(serial, packageName);
  } catch (error) {
    log.error('Uninstall package keep data error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:uninstallPackages', async (event, serial, packageNames) => {
  try {
    return await adbClient.uninstallPackages(serial, packageNames);
  } catch (error) {
    log.error('Uninstall packages error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:getPackages', async (event, serial) => {
  try {
    return await adbClient.getPackages(serial);
  } catch (error) {
    log.error('Get packages error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:screenshot', async (event, serial, savePath) => {
  try {
    return await adbClient.screenshot(serial, savePath);
  } catch (error) {
    log.error('Screenshot error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:getPackageInfo', async (event, serial, packageName) => {
  try {
    return await adbClient.getPackageInfo(serial, packageName);
  } catch (error) {
    log.error('Get package info error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:freezePackage', async (event, serial, packageName) => {
  try {
    return await adbClient.freezePackage(serial, packageName);
  } catch (error) {
    log.error('Freeze package error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:unfreezePackage', async (event, serial, packageName) => {
  try {
    return await adbClient.unfreezePackage(serial, packageName);
  } catch (error) {
    log.error('Unfreeze package error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:setScreenResolution', async (event, serial, width, height) => {
  try {
    return await adbClient.setScreenResolution(serial, width, height);
  } catch (error) {
    log.error('Set resolution error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:setScreenDensity', async (event, serial, density) => {
  try {
    return await adbClient.setScreenDensity(serial, density);
  } catch (error) {
    log.error('Set density error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:resetScreenResolution', async (event, serial) => {
  try {
    return await adbClient.resetScreenResolution(serial);
  } catch (error) {
    log.error('Reset resolution error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:resetScreenDensity', async (event, serial) => {
  try {
    return await adbClient.resetScreenDensity(serial);
  } catch (error) {
    log.error('Reset density error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:getScreenInfo', async (event, serial) => {
  try {
    return await adbClient.getScreenInfo(serial);
  } catch (error) {
    log.error('Get screen info error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:listFiles', async (event, serial, remotePath) => {
  try {
    return await adbClient.listFiles(serial, remotePath);
  } catch (error) {
    log.error('List files error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:shell', async (event, serial, command) => {
  try {
    return await adbClient.shell(serial, command);
  } catch (error) {
    log.error('Shell error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:reboot', async (event, serial, mode) => {
  try {
    return await adbClient.reboot(serial, mode);
  } catch (error) {
    log.error('Reboot error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:pushFile', async (event, serial, localPath, remotePath) => {
  try {
    return await adbClient.pushFile(serial, localPath, remotePath);
  } catch (error) {
    log.error('Push file error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('adb:pullFile', async (event, serial, remotePath, localPath) => {
  try {
    return await adbClient.pullFile(serial, remotePath, localPath);
  } catch (error) {
    log.error('Pull file error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('fastboot:devices', async () => {
  try {
    return await adbClient.fastbootDevices();
  } catch (error) {
    log.error('Fastboot devices error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('fastboot:reboot', async (event, mode) => {
  try {
    return await adbClient.fastbootReboot(mode);
  } catch (error) {
    log.error('Fastboot reboot error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('fastboot:command', async (event, args) => {
  try {
    return await adbClient.fastbootCommand(args);
  } catch (error) {
    log.error('Fastboot command error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('fastboot:unlock', async () => {
  try {
    return await adbClient.fastbootUnlock();
  } catch (error) {
    log.error('Fastboot unlock error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('fastboot:unlockOem', async () => {
  try {
    return await adbClient.fastbootUnlockOem();
  } catch (error) {
    log.error('Fastboot OEM unlock error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('fastboot:lock', async () => {
  try {
    return await adbClient.fastbootLock();
  } catch (error) {
    log.error('Fastboot lock error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('fastboot:lockOem', async () => {
  try {
    return await adbClient.fastbootLockOem();
  } catch (error) {
    log.error('Fastboot OEM lock error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('fastboot:flashBoot', async (event, imagePath) => {
  try {
    return await adbClient.fastbootFlashBoot(imagePath);
  } catch (error) {
    log.error('Fastboot flash boot error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('fastboot:flashInitboot', async (event, imagePath) => {
  try {
    return await adbClient.fastbootFlashInitboot(imagePath);
  } catch (error) {
    log.error('Fastboot flash initboot error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('fastboot:flashPartition', async (event, partition, imagePath) => {
  try {
    return await adbClient.fastbootFlashPartition(partition, imagePath);
  } catch (error) {
    log.error('Fastboot flash partition error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('fastboot:getVar', async (event, varName) => {
  try {
    return await adbClient.fastbootGetVar(varName);
  } catch (error) {
    log.error('Fastboot getvar error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('fastboot:erasePartition', async (event, partition) => {
  try {
    return await adbClient.fastbootErasePartition(partition);
  } catch (error) {
    log.error('Fastboot erase error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('fastboot:formatPartition', async (event, partition) => {
  try {
    return await adbClient.fastbootFormatPartition(partition);
  } catch (error) {
    log.error('Fastboot format error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('scrcpy:start', async (event, serial, options) => {
  try {
    await scrcpyController.start(serial, options);
    return { success: true };
  } catch (error) {
    log.error('Scrcpy start error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('scrcpy:stop', async () => {
  try {
    await scrcpyController.stop();
    return { success: true };
  } catch (error) {
    log.error('Scrcpy stop error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('dialog:openFile', async (event, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || []
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:openFiles', async (event, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: filters || []
  });
  return result.canceled ? null : result.filePaths;
});

ipcMain.handle('dialog:saveFile', async (event, defaultPath, filters) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: filters || []
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('shell:openPath', async (event, filePath) => {
  return await shell.openPath(filePath);
});
