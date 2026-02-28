let currentDevice = null;
let lastWirelessAddr = null;
let currentPath = '/sdcard';
let scrcpyRunning = false;
let appsCache = [];
// Per-device root state cache for UI
let rootState = {};

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initDeviceList();
  initApps();
  initFiles();
  initScrcpy();
  initTools();
  initFastboot();
  
  setInterval(refreshDevices, 5000);
});

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      const page = item.dataset.page;
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(`page-${page}`).classList.add('active');
      
      if (page === 'files' && currentDevice) {
        loadFiles(currentPath);
      }
    });
  });
}

async function refreshDevices() {
  const btn = document.getElementById('btn-refresh-devices');
  if (btn) btn.disabled = true;
  
  try {
    const devices = await window.api.adb.getDevices();
    renderDeviceList(devices);
  } catch (error) {
    showToast('刷新设备失败', 'error');
  }
  
  if (btn) btn.disabled = false;
}

function renderDeviceList(devices) {
  const container = document.getElementById('device-list');
  
  if (!devices || devices.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔌</span>
        <p>未检测到设备，请连接 Android 设备</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = devices.map(device => `
    <div class="device-card ${currentDevice?.serial === device.serial ? 'selected' : ''}" 
         data-serial="${device.serial}">
      <div class="device-header">
        <span class="device-icon">📱</span>
        <div>
          <div class="device-name">${device.product || 'Android Device'}</div>
          <div class="device-serial">${device.serial}</div>
        </div>
        <span class="device-state online">${device.state}</span>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.device-card').forEach(card => {
    card.addEventListener('click', () => selectDevice(card.dataset.serial));
  });
}

async function selectDevice(serial) {
  currentDevice = { serial };
  rootState[serial] = { enabled: false, available: false };
  
  document.querySelectorAll('.device-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`[data-serial="${serial}"]`).classList.add('selected');
  
  const info = await window.api.adb.getDeviceInfo(serial);
  // Probe root capability for this device
  try {
    const can = await window.api.adb.canRoot(serial);
    rootState[serial].available = !!can;
  } catch (e) {
    rootState[serial].available = false;
  }
  renderDeviceInfo(info);

  // Bind Root toggle and Wireless controls and Reboot button for current device
  // Root toggle: persistent listener per device
  const rootToggle = document.getElementById('root-toggle');
  if (rootToggle) {
    // Ensure serial is bound to the control
    rootToggle.dataset.serial = info.serial || serial;
    rootToggle.checked = !!(rootState[info.serial]?.enabled);
    rootToggle.onchange = async (e) => {
      const s = e.currentTarget.dataset.serial || info.serial;
      if (e.target.checked) {
        const r = await window.api.adb.rootEnable(s);
        if (r && r.enabled) {
          rootState[s] = rootState[s] || {};
          rootState[s].enabled = true;
          showToast('Root 已启用', 'success');
        } else {
          e.target.checked = false;
          showToast('无法启用 Root: ' + (r?.message || ''), 'error');
        }
      } else {
        rootState[s] = rootState[s] || {};
        rootState[s].enabled = false;
        showToast('Root 已禁用', 'info');
      }
    };
  }

  // Reboot button
  const rebootBtn = document.getElementById('btn-reboot');
  if (rebootBtn) {
    rebootBtn.onclick = async () => {
      try {
        await window.api.adb.reboot(info.serial, 'normal');
        showToast('正在重启设备', 'success');
      } catch (err) {
        showToast('重启失败: ' + (err?.message || err), 'error');
      }
    };
  }

  // Wireless controls
  const wIp = document.getElementById('wireless-ip');
  const wPort = document.getElementById('wireless-port');
  const wEnable = document.getElementById('btn-wireless-enable');
  const wConnect = document.getElementById('btn-wireless-connect');
  const wDisconnect = document.getElementById('btn-wireless-disconnect');
  if (wEnable) {
    wEnable.onclick = async () => {
      const portVal = wPort?.value || '5555';
      const r = await window.api.adb.enableWireless(info.serial, parseInt(portVal, 10));
      if (r && r.success) { showToast('无线启用成功', 'success'); }
      else { showToast('无线启用失败: ' + (r?.error ?? ''), 'error'); }
    };
  }
  if (wConnect) {
    wConnect.onclick = async () => {
      const ip = wIp?.value;
      const portVal = wPort?.value || '5555';
      if (!ip) { showToast('请填写设备 IP', 'error'); return; }
      const r = await window.api.adb.connectWireless(ip, parseInt(portVal, 10));
      if (r && r.success) {
        showToast('无线连接已建立', 'success');
        lastWirelessAddr = `${ip}:${portVal}`;
      } else {
        showToast('无线连接失败: ' + (r?.error ?? ''), 'error');
      }
    };
  }
  if (wDisconnect) {
    wDisconnect.onclick = async () => {
      if (typeof lastWirelessAddr !== 'undefined' && lastWirelessAddr) {
        const r = await window.api.adb.disconnectWireless(lastWirelessAddr);
        if (r && r.success) {
          showToast('无线断开', 'success');
          lastWirelessAddr = null;
        } else {
          showToast('断开失败: ' + (r?.error ?? ''), 'error');
        }
      } else {
        showToast('当前无无线连接', 'info');
      }
    };
  }

  showToast('已选择设备', 'success');
  // Bind root toggle if present
  const rootToggle = document.getElementById('root-toggle');
  if (rootToggle) {
    rootToggle.disabled = !rootState[serial]?.available;
    rootToggle.checked = !!rootState[serial]?.enabled;
    // Bind one-time listener
    rootToggle.addEventListener('change', async (e) => {
      if (e.target.checked) {
        const r = await window.api.adb.enableRoot(serial);
        if (r && r.enabled) {
          rootState[serial].enabled = true;
          showToast('Root 已启用', 'success');
        } else {
          showToast('无法启用 Root: ' + (r?.message || ''), 'error');
          e.target.checked = false;
        }
      } else {
        rootState[serial].enabled = false;
        showToast('Root 已禁用', 'info');
      }
    }, { once: true });
  }
}

function renderDeviceInfo(info) {
  const container = document.getElementById('device-info');
  const grid = document.getElementById('info-grid');
  
  container.style.display = 'block';
  
  grid.innerHTML = `
    <div class="info-item">
      <div class="info-label">型号</div>
      <div class="info-value">${info.model || 'Unknown'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">品牌</div>
      <div class="info-value">${info.brand || 'Unknown'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">设备</div>
      <div class="info-value">${info.device || 'Unknown'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Android 版本</div>
      <div class="info-value">${info.androidVersion || 'Unknown'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">SDK 版本</div>
      <div class="info-value">${info.sdkVersion || 'Unknown'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">分辨率</div>
      <div class="info-value">${info.resolution || 'Unknown'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">显示密度</div>
      <div class="info-value">${info.density || 'Unknown'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">电量</div>
      <div class="info-value">${info.battery || 'Unknown'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">状态</div>
      <div class="info-value">${info.state || 'Unknown'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">序列号</div>
      <div class="info-value">${info.serialNumber || 'Unknown'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Root 模式</div>
      <div class="info-value" id="root-toggle-container">
        <input type="checkbox" id="root-toggle" data-serial="${info.serial || ''}"> 启用 Root
      </div>
    </div>
    <div class="info-item">
      <div class="info-label">无线调试</div>
      <div class="info-value" id="wireless-controls" style="display:flex; gap:8px; align-items:center;">
        <input id="wireless-ip" class="input" placeholder="设备IP" style="width:140px;">
        <input id="wireless-port" class="input" placeholder="端口" value="5555" style="width:90px;">
        <button id="btn-wireless-enable" class="btn btn-secondary">启用无线</button>
        <button id="btn-wireless-connect" class="btn btn-secondary">连接</button>
        <button id="btn-wireless-disconnect" class="btn btn-secondary">断开</button>
      </div>
    </div>
    <div class="info-item">
      <div class="info-label">操作</div>
      <div class="info-value">
        <button id="btn-reboot" class="btn btn-warning">重启设备</button>
      </div>
    </div>
    <div class="info-item">
      <div class="info-label">Bootloader</div>
      <div class="info-value">${info.bootloader || 'Unknown'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">CPU</div>
      <div class="info-value">${info.cpuAbi || 'Unknown'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">存储空间</div>
      <div class="info-value">${info.freeStorage || 'Unknown'} / ${info.totalStorage || 'Unknown'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">内存</div>
      <div class="info-value">${info.freeRam || 'Unknown'} / ${info.totalRam || 'Unknown'}</div>
    </div>
  `;
}

function initDeviceList() {
  document.getElementById('btn-refresh-devices').addEventListener('click', refreshDevices);
  refreshDevices();
}

async function loadApps() {
  if (!currentDevice) {
    showToast('请先选择设备', 'error');
    return;
  }
  
  showToast('正在加载应用列表...');
  
  const packages = await window.api.adb.getPackages(currentDevice.serial);
  appsCache = packages;
  
  renderApps(packages);
}

function renderApps(packages) {
  const container = document.getElementById('apps-grid');
  
  if (!packages || packages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📦</span>
        <p>未找到应用</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = packages.map(pkg => `
    <div class="app-card" data-package="${pkg}">
      <div class="app-icon">📦</div>
      <div class="app-name">${pkg}</div>
      <div class="app-info">用户应用</div>
      <div class="app-actions">
        <button class="btn btn-danger btn-sm" data-action="uninstall">卸载</button>
        <button class="btn btn-warning btn-sm" data-action="freeze">冻结</button>
      </div>
    </div>
  `).join('');
  
  container.querySelectorAll('[data-action="uninstall"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pkg = btn.closest('.app-card').dataset.package;
      if (confirm(`确定要卸载 ${pkg} 吗?`)) {
        const result = await window.api.adb.uninstallPackage(currentDevice.serial, pkg);
        if (result.error) {
          showToast('卸载失败: ' + result.error, 'error');
        } else {
          showToast('卸载成功', 'success');
          loadApps();
        }
      }
    });
  });
  
  container.querySelectorAll('[data-action="freeze"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pkg = btn.closest('.app-card').dataset.package;
      const result = await window.api.adb.freezePackage(currentDevice.serial, pkg);
      if (result.error) {
        showToast('冻结失败: ' + result.error, 'error');
      } else {
        showToast('已冻结', 'success');
      }
    });
  });
}

function initApps() {
  document.getElementById('btn-refresh-apps').addEventListener('click', loadApps);
  document.getElementById('btn-install-app').addEventListener('click', installApp);
  document.getElementById('btn-install-apps').addEventListener('click', installApps);
  document.getElementById('btn-batch-uninstall').addEventListener('click', batchUninstall);
  
  document.getElementById('app-search').addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = appsCache.filter(pkg => pkg.toLowerCase().includes(keyword));
    renderApps(filtered);
  });
}

async function installApp() {
  if (!currentDevice) {
    showToast('请先选择设备', 'error');
    return;
  }
  
  const path = await window.api.dialog.openFile([{name: 'APK', extensions: ['apk']}]);
  if (!path) return;
  
  showToast('正在安装...');
  const result = await window.api.adb.installApk(currentDevice.serial, path);
  
  if (result.error) {
    showToast('安装失败: ' + result.error, 'error');
  } else {
    showToast('安装成功', 'success');
    loadApps();
  }
}

async function installApps() {
  if (!currentDevice) {
    showToast('请先选择设备', 'error');
    return;
  }
  
  const paths = await window.api.dialog.openFiles([{name: 'APK', extensions: ['apk']}]);
  if (!paths || paths.length === 0) return;
  
  const progressPanel = document.getElementById('batch-progress');
  progressPanel.style.display = 'block';
  
  const progressText = document.getElementById('batch-progress-text');
  const progressBar = document.getElementById('batch-progress-bar');
  
  const result = await window.api.adb.installApks(currentDevice.serial, paths, (current, total, file) => {
    progressText.textContent = `正在安装 ${file} (${current}/${total})`;
    progressBar.style.width = `${(current / total) * 100}%`;
  });
  
  progressPanel.style.display = 'none';
  progressBar.style.width = '0%';
  
  let msg = `完成: ${result.results.filter(r => r.success).length}/${paths.length} 成功`;
  showToast(msg, 'success');
  loadApps();
}

let selectedApps = new Set();

function renderApps(packages) {
  const container = document.getElementById('apps-grid');
  
  if (!packages || packages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📦</span>
        <p>未找到应用</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = packages.map(pkg => `
    <div class="app-card ${selectedApps.has(pkg) ? 'selected' : ''}" data-package="${pkg}">
      <div class="app-checkbox" data-package="${pkg}">
        <input type="checkbox" ${selectedApps.has(pkg) ? 'checked' : ''}>
      </div>
      <div class="app-icon">📦</div>
      <div class="app-name">${pkg}</div>
      <div class="app-actions">
        <button class="btn btn-danger btn-sm" data-action="uninstall">卸载</button>
        <button class="btn btn-warning btn-sm" data-action="freeze">冻结</button>
        <button class="btn btn-info btn-sm" data-action="uninstall-keep">保留数据</button>
      </div>
    </div>
  `).join('');
  
  container.querySelectorAll('.app-checkbox').forEach(cb => {
    cb.addEventListener('click', (e) => {
      const pkg = cb.dataset.package;
      if (selectedApps.has(pkg)) {
        selectedApps.delete(pkg);
      } else {
        selectedApps.add(pkg);
      }
      renderApps(packages);
    });
  });
  
  container.querySelectorAll('[data-action="uninstall"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pkg = btn.closest('.app-card').dataset.package;
      if (confirm(`确定要卸载 ${pkg} 吗?`)) {
        const result = await window.api.adb.uninstallPackage(currentDevice.serial, pkg);
        if (result.error) {
          showToast('卸载失败: ' + result.error, 'error');
        } else {
          showToast('卸载成功', 'success');
          loadApps();
        }
      }
    });
  });
  
  container.querySelectorAll('[data-action="uninstall-keep"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pkg = btn.closest('.app-card').dataset.package;
      if (confirm(`确定要卸载 ${pkg} 并保留数据吗?`)) {
        const result = await window.api.adb.uninstallPackageKeepData(currentDevice.serial, pkg);
        if (result.error) {
          showToast('卸载失败: ' + result.error, 'error');
        } else {
          showToast('卸载成功，数据已保留', 'success');
          loadApps();
        }
      }
    });
  });
  
  container.querySelectorAll('[data-action="freeze"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pkg = btn.closest('.app-card').dataset.package;
      const result = await window.api.adb.freezePackage(currentDevice.serial, pkg);
      if (result.error) {
        showToast('冻结失败: ' + result.error, 'error');
      } else {
        showToast('已冻结', 'success');
      }
    });
  });
}

async function batchUninstall() {
  if (!currentDevice) {
    showToast('请先选择设备', 'error');
    return;
  }
  
  if (selectedApps.size === 0) {
    showToast('请先选择要卸载的应用', 'error');
    return;
  }
  
  const packages = Array.from(selectedApps);
  if (!confirm(`确定要卸载选中的 ${packages.length} 个应用吗?`)) return;
  
  const progressPanel = document.getElementById('batch-progress');
  progressPanel.style.display = 'block';
  
  const progressText = document.getElementById('batch-progress-text');
  const progressBar = document.getElementById('batch-progress-bar');
  
  const result = await window.api.adb.uninstallPackages(currentDevice.serial, packages, (current, total, pkg) => {
    progressText.textContent = `正在卸载 ${pkg} (${current}/${total})`;
    progressBar.style.width = `${(current / total) * 100}%`;
  });
  
  progressPanel.style.display = 'none';
  progressBar.style.width = '0%';
  
  selectedApps.clear();
  showToast(result.summary, 'success');
  loadApps();
}

async function loadFiles(path) {
  if (!currentDevice) return;
  
  currentPath = path;
  document.getElementById('breadcrumbs').innerHTML = `<span>${path}</span>`;
  
  const serial = currentDevice?.serial;
  const files = await (rootState[serial]?.enabled
    ? window.api.adb.listFilesRoot(serial, path)
    : window.api.adb.listFiles(serial, path));
  renderFiles(files);
}

function renderFiles(files) {
  const container = document.getElementById('file-list');
  
  if (!files || files.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📁</span>
        <p>空文件夹</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = files.map(file => `
    <div class="file-item" data-name="${file.name}" data-isdir="${file.isDir}">
      <span class="file-icon">${file.isDir ? '📁' : '📄'}</span>
      <span class="file-name">${file.name}</span>
      <span class="file-size">${file.size || ''}</span>
    </div>
  `).join('');
  
  container.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => {
      const name = item.dataset.name;
      const isDir = item.dataset.isdir === 'true';
      
      if (isDir) {
        loadFiles(currentPath + '/' + name);
      }
    });
  });
}

function initFiles() {
  document.getElementById('btn-refresh-files').addEventListener('click', () => loadFiles(currentPath));
  document.getElementById('btn-upload-file').addEventListener('click', uploadFile);
}

async function uploadFile() {
  if (!currentDevice) {
    showToast('请先选择设备', 'error');
    return;
  }
  
  const path = await window.api.dialog.openFile([]);
  if (!path) return;
  
  const fileName = path.split(/[/\\]/).pop();
  const remotePath = currentPath + '/' + fileName;
  
  showToast('正在上传...');
  const result = await window.api.adb.pushFile(currentDevice.serial, path, remotePath);
  
  if (result.error) {
    showToast('上传失败: ' + result.error, 'error');
  } else {
    showToast('上传成功', 'success');
    loadFiles(currentPath);
  }
}

function initScrcpy() {
  document.getElementById('btn-start-scrcpy').addEventListener('click', startScrcpy);
  document.getElementById('btn-stop-scrcpy').addEventListener('click', stopScrcpy);
  document.getElementById('btn-set-resolution').addEventListener('click', setResolution);
  document.getElementById('btn-set-density').addEventListener('click', setDensity);
  document.getElementById('btn-reset-resolution').addEventListener('click', resetResolution);
  document.getElementById('btn-reset-density').addEventListener('click', resetDensity);
}

async function startScrcpy() {
  if (!currentDevice) {
    showToast('请先选择设备', 'error');
    return;
  }
  
  const fps = document.getElementById('scrcpy-fps').value;
  const bitrate = document.getElementById('scrcpy-bitrate').value;
  const maxSize = document.getElementById('scrcpy-size').value;
  
  showToast('正在启动投屏...');
  
  const result = await window.api.scrcpy.start(currentDevice.serial, {
    fps: parseInt(fps),
    bitrate: parseInt(bitrate),
    maxSize: parseInt(maxSize)
  });
  
  if (result.error) {
    showToast('启动失败: ' + result.error, 'error');
  } else {
    scrcpyRunning = true;
    document.getElementById('btn-start-scrcpy').style.display = 'none';
    document.getElementById('btn-stop-scrcpy').style.display = 'inline-flex';
    document.getElementById('scrcpy-status').innerHTML = '<p style="color: var(--success);">投屏已启动</p>';
    showToast('投屏已启动', 'success');
  }
}

async function stopScrcpy() {
  await window.api.scrcpy.stop();
  scrcpyRunning = false;
  document.getElementById('btn-start-scrcpy').style.display = 'inline-flex';
  document.getElementById('btn-stop-scrcpy').style.display = 'none';
  document.getElementById('scrcpy-status').innerHTML = '<p>投屏已停止</p>';
}

async function setResolution() {
  if (!currentDevice) {
    showToast('请先选择设备', 'error');
    return;
  }
  
  const width = document.getElementById('resolution-width').value;
  const height = document.getElementById('resolution-height').value;
  
  if (!width || !height) {
    showToast('请输入分辨率', 'error');
    return;
  }
  
  const result = await window.api.adb.setScreenResolution(currentDevice.serial, width, height);
  if (result.error) {
    showToast('设置失败: ' + result.error, 'error');
  } else {
    showToast(result.message, 'success');
    refreshDeviceInfo();
  }
}

async function setDensity() {
  if (!currentDevice) {
    showToast('请先选择设备', 'error');
    return;
  }
  
  const density = document.getElementById('density-value').value;
  
  if (!density) {
    showToast('请输入密度值', 'error');
    return;
  }
  
  const result = await window.api.adb.setScreenDensity(currentDevice.serial, density);
  if (result.error) {
    showToast('设置失败: ' + result.error, 'error');
  } else {
    showToast(result.message, 'success');
    refreshDeviceInfo();
  }
}

async function resetResolution() {
  if (!currentDevice) return;
  const result = await window.api.adb.resetScreenResolution(currentDevice.serial);
  showToast(result.message, 'success');
  refreshDeviceInfo();
}

async function resetDensity() {
  if (!currentDevice) return;
  const result = await window.api.adb.resetScreenDensity(currentDevice.serial);
  showToast(result.message, 'success');
  refreshDeviceInfo();
}

async function refreshDeviceInfo() {
  if (currentDevice) {
    const info = await window.api.adb.getDeviceInfo(currentDevice.serial);
    renderDeviceInfo(info);
  }
}

function initTools() {
  document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => {
      if (!currentDevice) {
        showToast('请先选择设备', 'error');
        return;
      }
      const tool = card.dataset.tool;
      openTool(tool);
    });
  });
}

async function openTool(tool) {
  const panel = document.getElementById('tool-panel');
  panel.style.display = 'block';
  
  switch(tool) {
    case 'screenshot':
      await takeScreenshot();
      break;
    case 'shell':
      showShellPanel(panel);
      break;
    case 'reboot':
      showRebootPanel(panel);
      break;
    case 'shizuku':
      showShizukuPanel(panel);
      break;
  }
}

async function takeScreenshot() {
  try {
    const savePath = await window.api.dialog.saveFile('screenshot.png', [{name: 'Images', extensions: ['png']}]);
    if (!savePath) return;
    
    const result = await window.api.adb.screenshot(currentDevice.serial, savePath);
    if (result.error) {
      showToast('截图失败: ' + result.error, 'error');
    } else {
      showToast('截图已保存: ' + result.path, 'success');
    }
  } catch (error) {
    showToast('截图失败: ' + error.message, 'error');
  }
}

function showShellPanel(panel) {
  panel.innerHTML = `
    <div class="tool-panel-header">
      <h3 class="tool-panel-title">Shell 命令</h3>
    </div>
    <textarea id="shell-command" class="input" rows="3" placeholder="输入命令，如: ls -la /sdcard/"></textarea>
    <button id="btn-run-shell" class="btn btn-primary" style="margin-top: 10px;">执行</button>
    <pre id="shell-output" style="margin-top: 15px; background: #0f0f1a; padding: 15px; border-radius: 8px; overflow: auto; max-height: 300px; font-family: monospace; font-size: 12px; white-space: pre-wrap;"></pre>
  `;
  
  document.getElementById('btn-run-shell').addEventListener('click', async () => {
    const cmd = document.getElementById('shell-command').value;
    if (!cmd) return;
    
    const output = document.getElementById('shell-output');
    output.textContent = '执行中...';
    
    const result = await window.api.adb.shell(currentDevice.serial, cmd);
    if (result.error) {
      output.textContent = '错误: ' + result.error;
    } else {
      output.textContent = result;
    }
  });
}

function showRebootPanel(panel) {
  panel.innerHTML = `
    <div class="tool-panel-header">
      <h3 class="tool-panel-title">重启设备</h3>
    </div>
    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
      <button class="btn btn-warning" data-mode="normal">普通重启</button>
      <button class="btn btn-warning" data-mode="recovery">重启到 Recovery</button>
      <button class="btn btn-warning" data-mode="bootloader">重启到 Bootloader</button>
    </div>
  `;
  
  panel.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const mode = btn.dataset.mode;
      await window.api.adb.reboot(currentDevice.serial, mode);
      showToast('正在重启...', 'success');
      currentDevice = null;
      document.getElementById('device-info').style.display = 'none';
      refreshDevices();
    });
  });
}

async function showShizukuPanel(panel) {
  panel.innerHTML = `
    <div class=\"tool-panel-header\"><h3 class=\"tool-panel-title\">Shizuku 激活</h3></div>
    <div style=\"display:flex; align-items:center; gap:10px;\">
      <button id=\"btn-shizuku-activate\" class=\"btn btn-primary\">激活 Shizuku</button>
      <span id=\"shizuku-status\" class=\"info-value\"></span>
    </div>
  `;
  document.getElementById('btn-shizuku-activate').addEventListener('click', async () => {
    if (!currentDevice) { showToast('请先选择设备', 'error'); return; }
    const res = await window.api.shizuku.activate(currentDevice.serial);
    const status = document.getElementById('shizuku-status');
    if (res && res.success) {
      status.textContent = res.output || '激活请求已发送';
    } else {
      status.textContent = '激活失败: ' + (res?.error || '未知错误');
    }
  });
}

function initFastboot() {
  document.getElementById('btn-scan-fastboot').addEventListener('click', scanFastboot);
  document.getElementById('btn-fastboot-unlock').addEventListener('click', () => fastbootAction('unlock'));
  document.getElementById('btn-fastboot-unlock-oem').addEventListener('click', () => fastbootAction('unlock-oem'));
  document.getElementById('btn-fastboot-lock').addEventListener('click', () => fastbootAction('lock'));
  document.getElementById('btn-fastboot-lock-oem').addEventListener('click', () => fastbootAction('lock-oem'));
  document.getElementById('btn-flash-boot').addEventListener('click', flashPartition);
  document.getElementById('btn-flash-initboot').addEventListener('click', flashPartition);
  document.getElementById('btn-flash-custom').addEventListener('click', flashPartition);
  document.getElementById('btn-run-fastboot-cmd').addEventListener('click', runFastbootCmd);
}

let currentFastbootDevice = null;

async function scanFastboot() {
  const devices = await window.api.fastboot.devices();
  const container = document.getElementById('fastboot-devices');
  
  if (devices.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary);">未检测到 Fastboot 设备</p>';
    document.getElementById('fastboot-actions').style.display = 'none';
    currentFastbootDevice = null;
    return;
  }
  
  currentFastbootDevice = devices[0];
  container.innerHTML = `<p>发现 Fastboot 设备: ${devices.join(', ')}</p>`;
  document.getElementById('fastboot-actions').style.display = 'flex';
  showToast('设备已连接', 'success');
}

async function fastbootAction(action) {
  if (!currentFastbootDevice) {
    showToast('请先扫描 Fastboot 设备', 'error');
    return;
  }
  
  showToast('执行中...');
  
  let result;
  switch (action) {
    case 'unlock':
      result = await window.api.fastboot.unlock();
      break;
    case 'unlock-oem':
      result = await window.api.fastboot.unlockOem();
      break;
    case 'lock':
      result = await window.api.fastboot.lock();
      break;
    case 'lock-oem':
      result = await window.api.fastboot.lockOem();
      break;
  }
  
  if (result.error) {
    showToast('执行失败: ' + result.error, 'error');
  } else {
    showToast('执行成功', 'success');
  }
}

async function flashPartition(event) {
  if (!currentFastbootDevice) {
    showToast('请先扫描 Fastboot 设备', 'error');
    return;
  }
  
  // Use the element that triggered the click to determine the partition
  const btn = event?.currentTarget;
  let partition = btn?.dataset?.partition;
  
  let imagePath;
  if (partition === 'custom') {
    const customPartition = document.getElementById('custom-partition-name').value;
    if (!customPartition) {
      showToast('请输入分区名称', 'error');
      return;
    }
    imagePath = await window.api.dialog.openFile([{name: 'Image', extensions: ['img']}]);
    if (!imagePath) return;
    partition = customPartition;
  } else {
    imagePath = await window.api.dialog.openFile([{name: 'Image', extensions: ['img']}]);
    if (!imagePath) return;
  }
  
  showToast('正在刷入...');
  
  const result = await window.api.fastboot.flashPartition(partition, imagePath);
  
  if (result.error) {
    showToast('刷入失败: ' + result.error, 'error');
  } else {
    showToast('刷入成功', 'success');
  }
}

async function runFastbootCmd() {
  if (!currentFastbootDevice) {
    showToast('请先扫描 Fastboot 设备', 'error');
    return;
  }
  
  const cmd = document.getElementById('fastboot-cmd-input').value;
  if (!cmd) {
    showToast('请输入命令', 'error');
    return;
  }
  
  const output = document.getElementById('fastboot-cmd-output');
  output.textContent = '执行中...';
  
  const args = cmd.split(' ').filter(a => a.trim());
  const result = await window.api.fastboot.command(args);
  
  if (result.error) {
    output.textContent = '错误: ' + result.error;
  } else {
    output.textContent = result.output;
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
