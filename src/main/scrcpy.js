const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

class ScrcpyController {
  constructor(binPath) {
    this.binPath = binPath;
    // Resolve scrcpy binary with a safe fallback strategy
    const primaryPath = path.join(binPath, 'scrcpy', 'scrcpy-win64-v3.3.4', 'scrcpy.exe');
    const secondaryPath = path.join(binPath, 'scrcpy', 'scrcpy-win64-v3.3.0', 'scrcpy.exe');
    if (fs.existsSync(primaryPath)) {
      this.scrcpyPath = primaryPath;
    } else if (fs.existsSync(secondaryPath)) {
      this.scrcpyPath = secondaryPath;
    } else {
      // Fall back to system PATH if binaries are not found in expected locations
      this.scrcpyPath = 'scrcpy.exe';
    }
    this.process = null;
    this.running = false;
  }

  async start(serial, options = {}) {
    if (this.running) {
      throw new Error('Scrcpy is already running');
    }

    const args = [
      '-s', serial,
      '--window-title', options.title || 'ADB Toolbox - Screen Mirror',
      '--turn-screen-off',
      '--stay-awake',
      '--always-on-top',
      '--max-fps', String(options.fps || 60),
      '--video-bit-rate', `${options.bitrate || 8}M`,
      '-m', String(options.maxSize || 1920),
      '--control', 'yes'
    ];

    log.info(`Starting scrcpy with args: ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      this.process = spawn(this.scrcpyPath, args, {
        detached: false,
        windowsHide: false
      });

      this.process.stdout.on('data', (data) => {
        log.info(`scrcpy: ${data}`);
      });

      this.process.stderr.on('data', (data) => {
        log.info(`scrcpy: ${data}`);
      });

      this.process.on('error', (err) => {
        log.error('Scrcpy error:', err);
        this.running = false;
        reject(err);
      });

      this.process.on('close', (code) => {
        log.info(`Scrcpy closed with code ${code}`);
        this.running = false;
        this.process = null;
      });

      setTimeout(() => {
        this.running = true;
        resolve({ success: true, message: 'Scrcpy started' });
      }, 1000);
    });
  }

  async stop() {
    if (!this.running || !this.process) {
      return { success: true, message: 'Scrcpy is not running' };
    }

    return new Promise((resolve) => {
      this.process.on('close', () => {
        this.running = false;
        this.process = null;
        resolve({ success: true, message: 'Scrcpy stopped' });
      });

      this.process.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
        this.running = false;
        this.process = null;
        resolve({ success: true, message: 'Scrcpy stopped' });
      }, 3000);
    });
  }

  isRunning() {
    return this.running;
  }
}

module.exports = { ScrcpyController };
