# codexU for Windows

[Back to the main README](../README.en.md) · [中文](WINDOWS.md)

Built with Tauri + Rust, the Windows app adapts a subset of the Swift macOS app’s Codex features, including quota, usage, tasks, and AI leadership. Claude Code is not currently supported.

Data is processed locally. Usage, threads, paths, logs, and account data are not uploaded.

## Requirements

- Windows 10/11 x86_64. Windows ARM64 installers are not yet available.
- Codex installed and used locally, with data under `%USERPROFILE%\.codex\`. Sign in to Codex to view quota.

Existing physical-machine validation was performed on Windows 11 and did not cover Windows 10.

## Install

Download either installer from the [v1.4.0 Release](https://github.com/shanggqm/codexU/releases/tag/v1.4.0):

- `codexU-1.4.0-windows-x86_64-setup.exe`: setup wizard.
- `codexU-1.4.0-windows-x86_64.msi`: Windows Installer package.

Double-click the installer, follow the wizard, then open codexU.

The installers are not code-signed, so Windows may show a security prompt on first launch. Each installer includes a `.sha256` checksum file; see the [distribution guide](../DISTRIBUTION.md) for verification instructions.

## Contribute

Contributions adapting Codex features to Windows are welcome. See the [Windows development guide](../windows/README.md) for setup, build commands, and project structure, and the [contribution guide](../CONTRIBUTING.md) for submission guidelines.
