const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  adb: {
    getDevices: () => ipcRenderer.invoke('adb:getDevices'),
    getDeviceInfo: (serial) => ipcRenderer.invoke('adb:getDeviceInfo', serial),
    installApk: (serial, path) => ipcRenderer.invoke('adb:installApk', serial, path),
    uninstallPackage: (serial, pkg) => ipcRenderer.invoke('adb:uninstallPackage', serial, pkg),
    getPackages: (serial) => ipcRenderer.invoke('adb:getPackages', serial),
    getPackageInfo: (serial, pkg) => ipcRenderer.invoke('adb:getPackageInfo', serial, pkg),
    freezePackage: (serial, pkg) => ipcRenderer.invoke('adb:freezePackage', serial, pkg),
    unfreezePackage: (serial, pkg) => ipcRenderer.invoke('adb:unfreezePackage', serial, pkg),
    screenshot: (serial, path) => ipcRenderer.invoke('adb:screenshot', serial, path),
    shell: (serial, cmd) => ipcRenderer.invoke('adb:shell', serial, cmd),
    reboot: (serial, mode) => ipcRenderer.invoke('adb:reboot', serial, mode),
    pushFile: (serial, local, remote) => ipcRenderer.invoke('adb:pushFile', serial, local, remote),
    pullFile: (serial, remote, local) => ipcRenderer.invoke('adb:pullFile', serial, remote, local),
    listFiles: (serial, path) => ipcRenderer.invoke('adb:listFiles', serial, path)
  },
  fastboot: {
    devices: () => ipcRenderer.invoke('fastboot:devices'),
    reboot: (mode) => ipcRenderer.invoke('fastboot:reboot', mode)
  },
  scrcpy: {
    start: (serial, options) => ipcRenderer.invoke('scrcpy:start', serial, options),
    stop: () => ipcRenderer.invoke('scrcpy:stop')
  },
  dialog: {
    openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
    saveFile: (path, filters) => ipcRenderer.invoke('dialog:saveFile', path, filters)
  },
  shell: {
    openPath: (path) => ipcRenderer.invoke('shell:openPath', path)
  }
});
