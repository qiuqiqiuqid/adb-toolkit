const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  adb: {
    getDevices: () => ipcRenderer.invoke('adb:getDevices'),
    getDeviceInfo: (serial) => ipcRenderer.invoke('adb:getDeviceInfo', serial),
    installApk: (serial, path) => ipcRenderer.invoke('adb:installApk', serial, path),
    installApks: (serial, paths) => ipcRenderer.invoke('adb:installApks', serial, paths),
    uninstallPackage: (serial, pkg) => ipcRenderer.invoke('adb:uninstallPackage', serial, pkg),
    uninstallPackageKeepData: (serial, pkg) => ipcRenderer.invoke('adb:uninstallPackageKeepData', serial, pkg),
    uninstallPackages: (serial, pkgs) => ipcRenderer.invoke('adb:uninstallPackages', serial, pkgs),
    getPackages: (serial) => ipcRenderer.invoke('adb:getPackages', serial),
    getPackageInfo: (serial, pkg) => ipcRenderer.invoke('adb:getPackageInfo', serial, pkg),
    freezePackage: (serial, pkg) => ipcRenderer.invoke('adb:freezePackage', serial, pkg),
    unfreezePackage: (serial, pkg) => ipcRenderer.invoke('adb:unfreezePackage', serial, pkg),
    screenshot: (serial, path) => ipcRenderer.invoke('adb:screenshot', serial, path),
    setScreenResolution: (serial, w, h) => ipcRenderer.invoke('adb:setScreenResolution', serial, w, h),
    setScreenDensity: (serial, density) => ipcRenderer.invoke('adb:setScreenDensity', serial, density),
    resetScreenResolution: (serial) => ipcRenderer.invoke('adb:resetScreenResolution', serial),
    resetScreenDensity: (serial) => ipcRenderer.invoke('adb:resetScreenDensity', serial),
    getScreenInfo: (serial) => ipcRenderer.invoke('adb:getScreenInfo', serial),
    shell: (serial, cmd) => ipcRenderer.invoke('adb:shell', serial, cmd),
    reboot: (serial, mode) => ipcRenderer.invoke('adb:reboot', serial, mode),
    pushFile: (serial, local, remote) => ipcRenderer.invoke('adb:pushFile', serial, local, remote),
    pullFile: (serial, remote, local) => ipcRenderer.invoke('adb:pullFile', serial, remote, local),
    listFiles: (serial, path) => ipcRenderer.invoke('adb:listFiles', serial, path)
  },
  fastboot: {
    devices: () => ipcRenderer.invoke('fastboot:devices'),
    reboot: (mode) => ipcRenderer.invoke('fastboot:reboot', mode),
    command: (args) => ipcRenderer.invoke('fastboot:command', args),
    unlock: () => ipcRenderer.invoke('fastboot:unlock'),
    unlockOem: () => ipcRenderer.invoke('fastboot:unlockOem'),
    lock: () => ipcRenderer.invoke('fastboot:lock'),
    lockOem: () => ipcRenderer.invoke('fastboot:lockOem'),
    flashBoot: (path) => ipcRenderer.invoke('fastboot:flashBoot', path),
    flashInitboot: (path) => ipcRenderer.invoke('fastboot:flashInitboot', path),
    flashPartition: (partition, path) => ipcRenderer.invoke('fastboot:flashPartition', partition, path),
    getVar: (varName) => ipcRenderer.invoke('fastboot:getVar', varName),
    erasePartition: (partition) => ipcRenderer.invoke('fastboot:erasePartition', partition),
    formatPartition: (partition) => ipcRenderer.invoke('fastboot:formatPartition', partition)
  },
  scrcpy: {
    start: (serial, options) => ipcRenderer.invoke('scrcpy:start', serial, options),
    stop: () => ipcRenderer.invoke('scrcpy:stop')
  },
  root: {
    can: (serial) => ipcRenderer.invoke('adb:rootCan', serial),
    enable: (serial) => ipcRenderer.invoke('adb:rootEnable', serial),
    run: (serial, cmd, args) => ipcRenderer.invoke('adb:rootRun', serial, cmd, args),
    runScript: (serial, scriptPath) => ipcRenderer.invoke('adb:rootRunScript', serial, scriptPath),
    pushFile: (serial, local, remote) => ipcRenderer.invoke('adb:pushFileRoot', serial, local, remote),
    listFiles: (serial, remote) => ipcRenderer.invoke('adb:listFilesRoot', serial, remote)
  },
  dialog: {
    openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
    openFiles: (filters) => ipcRenderer.invoke('dialog:openFiles', filters),
    saveFile: (path, filters) => ipcRenderer.invoke('dialog:saveFile', path, filters)
  },
  shell: {
    openPath: (path) => ipcRenderer.invoke('shell:openPath', path)
  }
});
