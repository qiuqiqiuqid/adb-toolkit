# ADB Toolkit

一个功能强大的 ADB & Fastboot 工具箱，基于 Electron 开发，支持屏幕投屏、应用管理、文件管理等核心功能。

## 功能特性

### 📱 设备管理
- 自动检测连接的 Android 设备
- 显示设备详细信息（型号、系统版本、分辨率、电量等）

### 📦 应用管理
- 查看所有已安装的第三方应用
- 一键安装 APK
- 卸载应用
- 冻结/停用应用

### 📁 文件管理
- 浏览设备文件系统
- 上传文件到设备
- 支持常用目录导航

### 🖥️ 屏幕投屏
- 基于 scrcpy 的高质量投屏
- 支持自定义帧率（30/60/90 FPS）
- 支持自定义码率和分辨率

### 🔧 工具箱
- 截图功能
- Shell 命令执行
- 设备重启（正常/Recovery/Bootloader）

### ⚡ Fastboot 工具
- Fastboot 设备检测
- 重启到各种模式

## 界面预览

现代化深色主题界面，直观易用。

## 技术栈

- **前端**: HTML5, CSS3, JavaScript
- **后端**: Node.js, Electron
- **核心工具**: ADB, Fastboot, scrcpy

## 构建

```bash
# 安装依赖
npm install

# 开发模式运行
npm start

# 构建 Windows 应用
npm run build
```

## 版本历史

### v1.0.0-test (2026-02-28)
- 初始测试版本
- 设备管理功能
- 应用管理功能（安装/卸载/冻结）
- 文件管理功能
- 屏幕投屏功能（scrcpy）
- 工具箱功能
- Fastboot 工具

## 许可证

GNU General Public License v3.0 (GPLv3)

详见 [LICENSE](LICENSE) 文件。

## 作者

ADB Toolkit Team
