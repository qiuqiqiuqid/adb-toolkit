let currentDevice = null;
let currentPath = '/sdcard';
let scrcpyRunning = false;
let appsCache = [];

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
  
  document.querySelectorAll('.device-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`[data-serial="${serial}"]`).classList.add('selected');
  
  const info = await window.api.adb.getDeviceInfo(serial);
  renderDeviceInfo(info);
  
  showToast('已选择设备', 'success');
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
      <div class="info-label">电量</div>
      <div class="info-value">${info.battery || 'Unknown'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">状态</div>
      <div class="info-value">${info.state || 'Unknown'}</div>
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

async function loadFiles(path) {
  if (!currentDevice) return;
  
  currentPath = path;
  document.getElementById('breadcrumbs').innerHTML = `<span>${path}</span>`;
  
  const files = await window.api.adb.listFiles(currentDevice.serial, path);
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

function initFastboot() {
  document.getElementById('btn-scan-fastboot').addEventListener('click', scanFastboot);
}

async function scanFastboot() {
  const devices = await window.api.fastboot.devices();
  const container = document.getElementById('fastboot-devices');
  
  if (devices.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary);">未检测到 Fastboot 设备</p>';
    return;
  }
  
  container.innerHTML = `<p>发现 ${devices.length} 个 Fastboot 设备: ${devices.join(', ')}</p>`;
  document.getElementById('fastboot-actions').style.display = 'flex';
  
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      await window.api.fastboot.reboot(action);
      showToast('已发送命令', 'success');
    });
  });
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
