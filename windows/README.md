# Windows 开发指南

[安装与使用](../docs/WINDOWS.md) · [项目主页](../README.md) · [贡献约定](../CONTRIBUTING.md)

`windows/` 是 codexU 的 Tauri + Rust 适配实现，前端使用 React/Vite，覆盖 macOS 版中 Codex 相关功能的子集。目前不支持 Claude Code。欢迎贡献 Codex 相关功能的 Windows 适配。

本文面向开发者，介绍工程结构、环境配置、本地运行、验证和打包入口。下载安装包请看[Windows 使用说明](../docs/WINDOWS.md)。

## 工程结构

```text
windows/
├── Cargo.toml                        # Rust workspace
├── apps/codexu-tauri/
│   ├── src-tauri/                    # 桌面窗口、IPC、刷新调度与应用配置
│   └── web/                          # React/Vite Dashboard 与前端测试
├── crates/
│   ├── codexu-core/                  # Codex 数据读取、统计与缓存
│   └── codexu-cli/                   # codexu-probe 数据探针
└── scripts/                         # Windows 验证与原生视觉采集脚本
```

## 开发环境

需要 Windows、MSVC 构建工具及 Windows SDK、Rust/rustup、Node.js 22.12 或更新版本和 npm。运行桌面应用需要 WebView2 Runtime。

以下命令从仓库根目录运行。Rust override 设置在 `windows/`，不改变全局默认 toolchain；Tauri CLI 版本与仓库发布脚本一致。

```powershell
rustup toolchain install stable-x86_64-pc-windows-msvc --profile minimal --component rustfmt
Push-Location windows
rustup override set stable-x86_64-pc-windows-msvc
cargo +stable-x86_64-pc-windows-msvc install tauri-cli --version 2.6.2 --locked
Pop-Location

npm --prefix windows/apps/codexu-tauri/web ci
```

## 本地运行

### 桌面应用

从仓库根目录运行：

```powershell
Push-Location windows/apps/codexu-tauri
cargo +stable-x86_64-pc-windows-msvc tauri dev
Pop-Location
```

Tauri 配置中的开发钩子会启动 Vite。该模式读取本机 Codex 数据；修改读取或刷新逻辑时，应注意保留原始日志和账户状态。

### 数据探针

只检查数据读取时，可以构建 CLI，无需启动桌面窗口。从仓库根目录运行：

```powershell
cargo +stable-x86_64-pc-windows-msvc build --release --manifest-path windows/Cargo.toml -p codexu-cli
$env:RUST_LOG="info"
.\windows\target\release\codexu-probe.exe --codex-root "$env:USERPROFILE\.codex" --summary
```

## 验证

### Rust 与前端

从仓库根目录运行：

```powershell
cargo +stable-x86_64-pc-windows-msvc test --manifest-path windows/Cargo.toml --workspace
npm --prefix windows/apps/codexu-tauri/web run build
npm --prefix windows/apps/codexu-tauri/web run test:contracts
npm --prefix windows/apps/codexu-tauri/web run test:visual
```

常规 Dashboard UI 改动使用 Playwright 验证。默认运行使用合成 fixture，可在没有本机 Codex 历史的 runner 上复现。截图和 manifest 写入 Git 忽略的 `.local-artifacts/`。

需要以本机只读聚合数据复核时，从仓库根目录运行：

```powershell
$env:CODEXU_VISUAL_LIVE="1"
$env:CODEXU_VISUAL_SURFACE="inference"
try {
    npm --prefix windows/apps/codexu-tauri/web run test:visual
} finally {
    Remove-Item Env:CODEXU_VISUAL_LIVE, Env:CODEXU_VISUAL_SURFACE
}
```

### 原生窗口验证

需要验证真实 Tauri 窗口、HWND、DPI 或窗口层级时，使用[Windows 原生视觉工作流](../docs/windows-port/WINDOWS_NATIVE_VISUAL_WORKFLOW.md)。采集实例必须保持最大化、non-activating，并保留用户当前前台窗口；截图、日志和临时数据留在 `.local-artifacts/`。

原生验证与 Playwright 的前端验证分别记录，不相互替代。开发和验证只能清理本任务启动并确认归属的进程。

## 安装包构建

[分发说明](../DISTRIBUTION.md)介绍 MSI/NSIS 构建、校验和签名边界；仓库入口是 [`scripts/build-windows-release.ps1`](../scripts/build-windows-release.ps1)。发布使用项目的发布流程，不在日常开发中修改版本号。
