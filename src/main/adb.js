const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class AdbClient {
  constructor(binPath) {
    this.binPath = binPath;
    this.adbPath = path.join(binPath, 'adb.exe');
    this.fastbootPath = path.join(binPath, 'fastboot.exe');
  }

  async runCommand(cmd, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, { windowsHide: true, ...options });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(stderr || `Command failed with code ${code}`));
        }
      });

      proc.on('error', (err) => { reject(err); });
    });
  }

  async getDevices() {
    try {
      const output = await this.runCommand(this.adbPath, ['devices', '-l']);
      const devices = [];
      const lines = output.split('\n').filter(line => line.trim() && !line.startsWith('List'));
      
      for (const line of lines) {
        const parts = line.split(/\s+/);
        const serial = parts[0];
        const state = parts[1];
        
        if (serial && state) {
          const device = { serial, state };
          for (const part of parts) {
            if (part.includes(':')) {
              const [key, value] = part.split(':');
              device[key] = value;
            }
          }
          devices.push(device);
        }
      }
      return devices;
    } catch { return []; }
  }

  async getDeviceInfo(serial) {
    const info = {
      serial, model: '', brand: '', device: '', androidVersion: '', sdkVersion: '',
      resolution: '', density: '', battery: '', state: '', imei: '', serialNumber: '',
      bootloader: '', radio: '', cpuAbi: '', totalStorage: '', freeStorage: '',
      totalRam: '', freeRam: ''
    };

    const props = [
      ['ro.product.model', 'model'], ['ro.product.brand', 'brand'], ['ro.product.device', 'device'],
      ['ro.build.version.release', 'androidVersion'], ['ro.build.version.sdk', 'sdkVersion'],
      ['ro.serialno', 'serialNumber'], ['ro.bootloader', 'bootloader'], ['ro.modem', 'radio'],
      ['ro.product.cpu.abi', 'cpuAbi']
    ];

    for (const [prop, key] of props) {
      try { info[key] = (await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'getprop', prop])).trim(); } catch {}
    }

    try {
      const size = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'wm', 'size']);
      info.resolution = size.replace('Physical size:', '').trim();
    } catch {}

    try {
      const dens = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'wm', 'density']);
      info.density = dens.replace('Physical density:', '').trim();
    } catch {}

    try {
      const bat = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'dumpsys', 'battery']);
      const levelMatch = bat.match(/level: (\d+)/);
      const scaleMatch = bat.match(/scale: (\d+)/);
      if (levelMatch && scaleMatch) {
        info.battery = Math.round((parseInt(levelMatch[1]) / parseInt(scaleMatch[1])) * 100) + '%';
      }
    } catch {}

    try {
      info.state = (await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'getprop', 'sys.boot_completed'])).trim() === '1' ? 'Booted' : 'Unknown';
    } catch {}

    try {
      const storage = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'df', '/data']);
      const m = storage.match(/(\d+)\s+(\d+)\s+(\d+)/);
      if (m) {
        info.totalStorage = (parseInt(m[1]) / 1024 / 1024).toFixed(1) + ' GB';
        info.freeStorage = (parseInt(m[3]) / 1024 / 1024).toFixed(1) + ' GB';
      }
    } catch {}

    try {
      const mem = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'cat', '/proc/meminfo']);
      const tm = mem.match(/MemTotal:\s+(\d+)/);
      const fm = mem.match(/MemFree:\s+(\d+)/);
      if (tm && fm) {
        info.totalRam = (parseInt(tm[1]) / 1024 / 1024).toFixed(1) + ' GB';
        info.freeRam = (parseInt(fm[1]) / 1024 / 1024).toFixed(1) + ' GB';
      }
    } catch {}

    return info;
  }

  async installApk(serial, apkPath) {
    if (!fs.existsSync(apkPath)) throw new Error('APK file not found');
    const output = await this.runCommand(this.adbPath, ['-s', serial, 'install', '-r', apkPath]);
    if (output.includes('Success')) return { success: true, message: 'Success' };
    if (output.includes('Failure')) throw new Error(output);
    return { success: true, message: output };
  }

  async installApks(serial, apkPaths, onProgress) {
    const results = [];
    for (let i = 0; i < apkPaths.length; i++) {
      const apkPath = apkPaths[i];
      const fileName = path.basename(apkPath);
      try {
        if (!fs.existsSync(apkPath)) {
          results.push({ file: fileName, success: false, message: 'File not found' });
          continue;
        }
        const output = await this.runCommand(this.adbPath, ['-s', serial, 'install', '-r', apkPath]);
        results.push({
          file: fileName,
          success: output.includes('Success'),
          message: output.includes('Success') ? 'Success' : output
        });
      } catch (e) { results.push({ file: fileName, success: false, message: e.message }); }
      if (onProgress) onProgress(i + 1, apkPaths.length, fileName);
    }
    return { success: true, results, summary: `Completed: ${results.filter(r => r.success).length}/${apkPaths.length}` };
  }

  async uninstallPackage(serial, packageName) {
    const output = await this.runCommand(this.adbPath, ['-s', serial, 'uninstall', packageName]);
    return output.includes('Success') ? { success: true, message: 'Uninstalled' } : { success: false, message: output };
  }

  async uninstallPackageKeepData(serial, packageName) {
    const output = await this.runCommand(this.adbPath, ['-s', serial, 'uninstall', '-k', packageName]);
    return output.includes('Success') ? { success: true, message: 'Uninstalled, data kept' } : { success: false, message: output };
  }

  async uninstallPackages(serial, packageNames, onProgress) {
    const results = [];
    for (let i = 0; i < packageNames.length; i++) {
      const pkg = packageNames[i];
      try {
        const output = await this.runCommand(this.adbPath, ['-s', serial, 'uninstall', pkg]);
        results.push({ package: pkg, success: output.includes('Success'), message: output.includes('Success') ? 'Success' : output });
      } catch (e) { results.push({ package: pkg, success: false, message: e.message }); }
      if (onProgress) onProgress(i + 1, packageNames.length, pkg);
    }
    return { success: true, results, summary: `Completed: ${results.filter(r => r.success).length}/${packageNames.length}` };
  }

  async getPackages(serial) {
    const output = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'pm', 'list', 'packages', '-3']);
    return output.split('\n').filter(line => line.startsWith('package:')).map(line => line.replace('package:', '').trim());
  }

  async getPackageInfo(serial, packageName) {
    const info = { name: packageName, version: '', size: '', installTime: '' };
    try {
      const p = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'pm', 'path', packageName]);
      const apkPath = p.trim();
      if (apkPath.startsWith('/')) {
        const s = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'ls', '-l', apkPath.replace('.split_config', '').replace('_config', '')]);
        const m = s.match(/(\d+)/);
        if (m) info.size = (parseInt(m[1]) / 1024 / 1024).toFixed(1) + ' MB';
      }
    } catch {}
    try {
      const d = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'dumpsys', 'package', packageName]);
      const vm = d.match(/versionName=([^\s]+)/);
      const im = d.match(/firstInstallTime=([^\s]+)/);
      if (vm) info.version = vm[1];
      if (im) info.installTime = im[1];
    } catch {}
    return info;
  }

  async freezePackage(serial, packageName) {
    try { await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'pm', 'disable-user', packageName]); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  }

  async unfreezePackage(serial, packageName) {
    try { await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'pm', 'enable', packageName]); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  }

  async screenshot(serial, savePath) {
    const remotePath = '/sdcard/screenshot.png';
    const tempPath = path.join(require('os').tmpdir(), `screenshot_${Date.now()}.png`);
    try {
      await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'screencap', '-p', remotePath]);
      await this.runCommand(this.adbPath, ['-s', serial, 'pull', remotePath, tempPath]);
      await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'rm', remotePath]);
      if (fs.existsSync(tempPath)) {
        if (savePath) { fs.copyFileSync(tempPath, savePath); fs.unlinkSync(tempPath); return { success: true, path: savePath }; }
        else { const data = fs.readFileSync(tempPath); fs.unlinkSync(tempPath); return { success: true, data: data.toString('base64') }; }
      }
      throw new Error('Screenshot file not found');
    } catch (e) { throw new Error('Screenshot failed: ' + e.message); }
  }

  async setScreenResolution(serial, width, height) {
    await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'wm', 'size', `${width}x${height}`]);
    return { success: true, message: `Resolution set to ${width}x${height}` };
  }

  async setScreenDensity(serial, density) {
    await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'wm', 'density', density]);
    return { success: true, message: `Density set to ${density}` };
  }

  async resetScreenResolution(serial) {
    await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'wm', 'size', 'reset']);
    return { success: true, message: 'Resolution reset' };
  }

  async resetScreenDensity(serial) {
    await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'wm', 'density', 'reset']);
    return { success: true, message: 'Density reset' };
  }

  async getScreenInfo(serial) {
    const info = { resolution: '', density: '' };
    try { info.resolution = (await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'wm', 'size'])).replace('Physical size:', '').trim(); } catch {}
    try { info.density = (await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'wm', 'density'])).replace('Physical density:', '').trim(); } catch {}
    return info;
  }

  async shell(serial, command) { return await this.runCommand(this.adbPath, ['-s', serial, 'shell', command]); }

  async reboot(serial, mode = 'normal') {
    const targets = { recovery: 'recovery', bootloader: 'bootloader', fastboot: 'fastboot' };
    const target = targets[mode] || '';
    if (target) await this.runCommand(this.adbPath, ['-s', serial, 'reboot', target]);
    else await this.runCommand(this.adbPath, ['-s', serial, 'reboot']);
    return { success: true, message: `Rebooting to ${mode}` };
  }

  async pushFile(serial, localPath, remotePath) {
    await this.runCommand(this.adbPath, ['-s', serial, 'push', localPath, remotePath]);
    return { success: true };
  }

  async pullFile(serial, remotePath, localPath) {
    await this.runCommand(this.adbPath, ['-s', serial, 'pull', remotePath, localPath]);
    return { success: true };
  }

  async listFiles(serial, remotePath) {
    const output = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'ls', '-la', remotePath]);
    const files = [];
    for (const line of output.split('\n').filter(line => line.trim())) {
      const parts = line.split(/\s+/);
      if (parts.length >= 8) {
        const isDir = parts[0].startsWith('d');
        const name = parts.slice(8).join(' ');
        if (name !== '.' && name !== '..') {
          files.push({ name, isDir, size: isDir ? '' : parts[4], date: parts[5] + ' ' + parts[6] + ' ' + parts[7] });
        }
      }
    }
    return files;
  }

  async fastbootDevices() {
    try { return (await this.runCommand(this.fastbootPath, ['devices'])).split('\n').filter(l => l.trim()).map(l => l.split('\t')[0]); }
    catch { return []; }
  }

  async fastbootCommand(args) {
    const output = await this.runCommand(this.fastbootPath, args);
    return { success: true, output };
  }

  async fastbootUnlock() {
    const output = await this.runCommand(this.fastbootPath, ['flashing', 'unlock']);
    return { success: true, output };
  }

  async fastbootUnlockOem() {
    const output = await this.runCommand(this.fastbootPath, ['oem', 'unlock']);
    return { success: true, output };
  }

  async fastbootLock() {
    const output = await this.runCommand(this.fastbootPath, ['flashing', 'lock']);
    return { success: true, output };
  }

  async fastbootLockOem() {
    const output = await this.runCommand(this.fastbootPath, ['oem', 'lock']);
    return { success: true, output };
  }

  async fastbootFlashBoot(imagePath) {
    const output = await this.runCommand(this.fastbootPath, ['flash', 'boot', imagePath]);
    return { success: true, output };
  }

  async fastbootFlashInitboot(imagePath) {
    const output = await this.runCommand(this.fastbootPath, ['flash', 'initboot', imagePath]);
    return { success: true, output };
  }

  async fastbootFlashPartition(partition, imagePath) {
    const output = await this.runCommand(this.fastbootPath, ['flash', partition, imagePath]);
    return { success: true, output };
  }

  async fastbootReboot(mode = 'normal') {
    const modes = { fastboot: [], recovery: ['recovery'], bootloader: ['bootloader'] };
    await this.runCommand(this.fastbootPath, ['reboot', ...(modes[mode] || [])]);
    return { success: true };
  }

  async fastbootErasePartition(partition) {
    const output = await this.runCommand(this.fastbootPath, ['erase', partition]);
    return { success: true, output };
  }

  async fastbootGetVar(variable) {
    const output = await this.runCommand(this.fastbootPath, ['getvar', variable]);
    return { success: true, output };
  }

  async fastbootFormatPartition(partition) {
    const output = await this.runCommand(this.fastbootPath, ['format', partition]);
    return { success: true, output };
  }
}

module.exports = { AdbClient };
