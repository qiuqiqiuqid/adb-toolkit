# ADB Toolkit - 高级ADB工具箱

## 🚀 功能特性

### 🔧 ADB核心功能
- ✅ 设备连接管理 (USB/Wi-Fi)
- ✅ 设备信息查看
- ✅ 文件管理 (推送/拉取)
- ✅ 应用管理 (安装/卸载/启动)
- ✅ Shell命令执行
- ✅ 屏幕截图
- ✅ 设备重启 (Recovery/Bootloader)

### 🗄️ 高级功能
- ✅ **Root模式** - 切换设备root权限
- ✅ **无线调试** - ADB over Wi-Fi连接
- ✅ **Shizuku激活** - 系统级ADB权限管理
- ✅ **Fastboot支持** - 刷机工具
- ✅ **屏幕投射** - 实时显示设备屏幕

### 🎨 用户界面
- ✅ 现代化桌面应用
- ✅ 实时设备状态显示
- ✅ 拖拽文件上传
- ✅ 一键操作按钮
- ✅ 多设备管理

## 📁 项目结构

```
├── src/
│   ├── main/
│   │   ├── adb.js          # ADB核心逻辑
│   │   └── main.js         # 主进程
│   ├── renderer/
│   │   ├── js/
│   │   │   └── app.js      # 渲染进程
│   │   ├── preload.js      # 预加载脚本
│   │   └── index.html      # 主界面
│   └── bin/
│       ├── adb.exe          # ADB二进制文件
│       ├── fastboot.exe     # Fastboot二进制文件
│       └── scrcpy.exe       # 屏幕投射工具
├── dist/                   # 构建输出目录
├── package.json           # 项目配置
├── CHANGELOG.md          # 更新日志
└── README.md            # 本文档
```

## 🚀 快速开始

### 系统要求
- Windows 7/8/10/11
- .NET Framework 4.0+
- ADB驱动程序

### 安装
1. 下载最新版本
2. 解压到任意目录
3. 运行 `ADB Toolkit.exe`

### 使用方法
1. 连接设备 (USB或Wi-Fi)
2. 等待设备检测
3. 选择需要的功能
4. 点击对应按钮执行操作

## 🛠️ 功能说明

### Root模式
- 检测设备是否已root
- 切换root权限状态
- 支持需要root权限的命令

### 无线调试
- 启用ADB over Wi-Fi
- 通过IP地址连接设备
- 断开无线连接

### Shizuku激活
- 安装Shizuku服务
- 激活系统级ADB权限
- 提升设备管理能力

### 屏幕投射
- 实时显示设备屏幕
- 支持高清投射
- 可保存截图

## 🔧 快捷键

- `F5` - 刷新设备列表
- `Ctrl+S` - 保存当前设置
- `Ctrl+O` - 打开文件
- `Ctrl+Shift+R` - 重新加载应用

## 📚 开发文档

### 构建项目
```bash
npm install
npm run build
```

### 运行开发环境
```bash
npm run dev
```

### 打包发行版
```bash
npm run package
```

## 📝 更新日志

请查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新详情

## 🤝 贡献代码

欢迎提交Issue和Pull Request

## 📄 许可证

MIT License

## 📞 联系方式

- GitHub: https://github.com/qiuqiqiuqid/adb-toolkit
- Issues: https://github.com/qiuqiqiuqid/adb-toolkit/issues

---

*版本: v1.0.3*
*最后更新: 2026年2月28日*
