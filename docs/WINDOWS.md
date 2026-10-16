# codexU Windows 适配版

[返回主页](../README.md) · [English](WINDOWS.en.md)

Windows 版基于 Tauri + Rust 构建，是 Swift macOS 应用的适配版，覆盖其中 Codex 相关功能的子集，包括额度、用量、任务和 AI 领导力。目前不支持 Claude Code。

数据在本机处理，不上传 usage、线程、路径、日志或账户数据。

## 运行要求

- Windows 10/11 x86_64；Windows ARM64 暂未提供安装包。
- 本机已安装并使用过 Codex，已生成 `%USERPROFILE%\.codex\` 下的数据；查看额度需要登录 Codex 账户。

已有实机验证使用 Windows 11，未覆盖 Windows 10。

## 安装

从 [v1.4.0 Release](https://github.com/shanggqm/codexU/releases/tag/v1.4.0) 下载以下任意一种安装包：

- `codexU-1.4.0-windows-x86_64-setup.exe`：安装向导。
- `codexU-1.4.0-windows-x86_64.msi`：Windows Installer 安装包。

双击安装包，按向导完成安装，然后打开 codexU。

当前安装包未进行代码签名，首次运行时可能出现系统安全提示。每个安装包均附有 `.sha256` 校验文件，校验方式见[分发说明](../DISTRIBUTION.md)。

## 参与贡献

欢迎贡献 Codex 相关功能的 Windows 适配。开发环境、构建命令和工程结构见 [Windows 开发文档](../windows/README.md)，提交约定见[贡献指南](../CONTRIBUTING.md)。
