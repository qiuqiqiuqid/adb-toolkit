# ADB Toolkit

一个功能强大的 ADB & Fastboot 工具箱，基于 Electron 开发，支持屏幕投屏、应用管理、文件管理等核心功能。

## 功能特性

### 📱 设备管理
- 自动检测连接的 Android 设备
- 显示设备详细信息（型号、品牌、设备名、Android版本、SDK版本、分辨率、显示密度、电量、存储空间、内存、序列号、Bootloader版本、CPU架构等）

### 📦 应用管理
- 查看所有已安装的第三方应用
- 安装 APK（单选/批量多选）
- 卸载应用（支持保留数据卸载）
- 批量卸载（勾选多个应用一键删除）
- 冻结/停用应用

### 📁 文件管理
- 浏览设备文件系统
- 上传文件到设备
- 支持常用目录导航

### 🖥️ 屏幕功能
- **投屏**：基于 scrcpy 的高质量投屏，支持自定义帧率（30/60/90 FPS）、码率和分辨率
- **分辨率设置**：自定义屏幕分辨率
- **显示密度设置**：自定义 DPI
- **一键重置**：快速恢复默认设置

### 🔧 工具箱
- 截图功能
- Shell 命令执行
- 设备重启（正常/Recovery/Bootloader）

### ⚡ Fastboot 专区
- Fastboot 设备检测
- 重启到各种模式
- 解锁命令：flashing unlock / oem unlock
- 加锁命令：flashing lock / oem lock
- 刷入分区：boot / initboot / 自定义分区
- Fastboot 命令行

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

### v1.0.1 (2026-02-28)
- 新增批量安装 APK 功能
- 新增保留数据卸载功能
- 新增批量卸载功能
- 设备信息增加更多内容（设备名、CPU、存储、内存等）
- 屏幕功能增加分辨率/密度设置
- Fastboot 专区增加解锁/加锁命令
- 新增刷入分区功能（boot/initboot/自定义）
- 新增 Fastboot 命令行功能
- 代码精简优化

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

[qiuqiqiuqid](https://github.com/qiuqiqiuqid)

## 致谢

本项目借助 [opencode](https://opencode.ai) AI 编程助手开发。
