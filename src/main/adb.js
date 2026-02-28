const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

const execPromise = util.promisify(exec);

class AdbClient {
  constructor(binPath) {
    this.binPath = binPath;
    this.adbPath = path.join(binPath, 'adb.exe');
    this.fastbootPath = path.join(binPath, 'fastboot.exe');
  }

  async runCommand(cmd, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, {
        windowsHide: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(stderr || `Command failed with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
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
    } catch (error) {
      return [];
    }
  }

  async getDeviceInfo(serial) {
    const info = {
      serial,
      model: '',
      brand: '',
      androidVersion: '',
      sdkVersion: '',
      resolution: '',
      battery: '',
      state: ''
    };

    try {
      const model = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'getprop', 'ro.product.model']);
      info.model = model.trim();
    } catch {}

    try {
      const brand = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'getprop', 'ro.product.brand']);
      info.brand = brand.trim();
    } catch {}

    try {
      const version = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'getprop', 'ro.build.version.release']);
      info.androidVersion = version.trim();
    } catch {}

    try {
      const sdk = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'getprop', 'ro.build.version.sdk']);
      info.sdkVersion = sdk.trim();
    } catch {}

    try {
      const size = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'wm size']);
      info.resolution = size.replace('Physical size:', '').trim();
    } catch {}

    try {
      const bat = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'dumpsys', 'battery']);
      const levelMatch = bat.match(/level: (\d+)/);
      const scaleMatch = bat.match(/scale: (\d+)/);
      if (levelMatch && scaleMatch) {
        const level = parseInt(levelMatch[1]);
        const scale = parseInt(scaleMatch[1]);
        info.battery = Math.round((level / scale) * 100) + '%';
      }
    } catch {}

    try {
      const state = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'getprop', 'sys.boot_completed']);
      info.state = state.trim() === '1' ? 'Booted' : 'Unknown';
    } catch {}

    return info;
  }

  async installApk(serial, apkPath) {
    if (!fs.existsSync(apkPath)) {
      throw new Error('APK file not found');
    }
    
    const output = await this.runCommand(this.adbPath, ['-s', serial, 'install', '-r', apkPath]);
    
    if (output.includes('Success')) {
      return { success: true, message: 'APK installed successfully' };
    } else if (output.includes('Failure')) {
      throw new Error(output);
    }
    
    return { success: true, message: output };
  }

  async uninstallPackage(serial, packageName) {
    const output = await this.runCommand(this.adbPath, ['-s', serial, 'uninstall', packageName]);
    
    if (output.includes('Success')) {
      return { success: true, message: 'Package uninstalled' };
    }
    
    return { success: false, message: output };
  }

  async getPackages(serial) {
    const output = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'pm', 'list', 'packages', '-3']);
    const packages = output.split('\n')
      .filter(line => line.startsWith('package:'))
      .map(line => line.replace('package:', '').trim());
    
    return packages;
  }

  async getPackageInfo(serial, packageName) {
    const info = {
      name: packageName,
      label: '',
      version: '',
      size: '',
      installTime: '',
      icon: null
    };

    try {
      const pathOutput = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'pm', 'path', packageName]);
      const apkPath = pathOutput.trim();
      
      if (apkPath.startsWith('/')) {
        const baseApk = apkPath.replace('.split_config', '').replace('_config', '');
        const statOutput = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'ls', '-l', baseApk]);
        const sizeMatch = statOutput.match(/(\d+)/);
        if (sizeMatch) {
          const bytes = parseInt(sizeMatch[1]);
          if (bytes < 1024 * 1024) {
            info.size = (bytes / 1024).toFixed(1) + ' KB';
          } else {
            info.size = (bytes / (1024 * 1024)).toFixed(1) + ' MB';
          }
        }
      }
    } catch {}

    try {
      const dumpsysOutput = await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'dumpsys', 'package', packageName]);
      
      const versionMatch = dumpsysOutput.match(/versionName=([^\s]+)/);
      if (versionMatch) {
        info.version = versionMatch[1];
      }
      
      const installTimeMatch = dumpsysOutput.match(/firstInstallTime=([^\s]+)/);
      if (installTimeMatch) {
        info.installTime = installTimeMatch[1];
      }
    } catch {}

    info.label = packageName;
    
    return info;
  }

  async freezePackage(serial, packageName) {
    try {
      await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'pm', 'disable-user', packageName]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async unfreezePackage(serial, packageName) {
    try {
      await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'pm', 'enable', packageName]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async screenshot(serial, savePath) {
    const remotePath = '/sdcard/screenshot.png';
    const timestamp = Date.now();
    const tempPath = path.join(require('os').tmpdir(), `screenshot_${timestamp}.png`);
    
    try {
      await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'screencap', '-p', remotePath]);
      await this.runCommand(this.adbPath, ['-s', serial, 'pull', remotePath, tempPath]);
      await this.runCommand(this.adbPath, ['-s', serial, 'shell', 'rm', remotePath]);
      
      if (fs.existsSync(tempPath)) {
        if (savePath) {
          fs.copyFileSync(tempPath, savePath);
          fs.unlinkSync(tempPath);
          return { success: true, path: savePath };
        } else {
          const data = fs.readFileSync(tempPath);
          fs.unlinkSync(tempPath);
          return { success: true, data: data.toString('base64') };
        }
      }
      
      throw new Error('Screenshot file not found');
    } catch (error) {
      throw new Error('Screenshot failed: ' + error.message);
    }
  }

  async shell(serial, command) {
    return await this.runCommand(this.adbPath, ['-s', serial, 'shell', command]);
  }

  async reboot(serial, mode = 'normal') {
    let target = '';
    
    switch (mode) {
      case 'recovery':
        target = 'recovery';
        break;
      case 'bootloader':
        target = 'bootloader';
        break;
      case 'fastboot':
        target = 'fastboot';
        break;
      default:
        target = 'normal';
    }
    
    if (target === 'normal') {
      await this.runCommand(this.adbPath, ['-s', serial, 'reboot']);
    } else {
      await this.runCommand(this.adbPath, ['-s', serial, 'reboot', target]);
    }
    
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
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 8) {
        const isDir = parts[0].startsWith('d');
        const name = parts.slice(8).join(' ');
        
        if (name !== '.' && name !== '..') {
          files.push({
            name: name,
            isDir: isDir,
            size: isDir ? '' : parts[4],
            date: parts[5] + ' ' + parts[6] + ' ' + parts[7]
          });
        }
      }
    }
    
    return files;
  }

  async fastbootDevices() {
    try {
      const output = await this.runCommand(this.fastbootPath, ['devices']);
      const devices = output.split('\n')
        .filter(line => line.trim())
        .map(line => line.split('\t')[0]);
      return devices;
    } catch {
      return [];
    }
  }

  async fastbootReboot(mode = 'normal') {
    switch (mode) {
      case 'fastboot':
        await this.runCommand(this.fastbootPath, ['reboot']);
        break;
      case 'recovery':
        await this.runCommand(this.fastbootPath, ['reboot', 'recovery']);
        break;
      case 'bootloader':
        await this.runCommand(this.fastbootPath, ['reboot', 'bootloader']);
        break;
      default:
        await this.runCommand(this.fastbootPath, ['reboot']);
    }
    return { success: true };
  }
}

module.exports = { AdbClient };
