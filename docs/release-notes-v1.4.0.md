# codexU v1.4.0

codexU v1.4.0 统一两平台模型定价，并在 Windows 改进历史刷新、剩余额度与 AI 领导力展示。

## 主要更新

- macOS 与 Windows 共享本地模型定价，按回合实际模型及服务档位计价。
- Windows 流式处理合法大历史记录，持续追加时保留完整统计，修复额度查询相关磁盘增长与进程残留。
- Windows 剩余额度环与分级领导力轨道加入动效，并响应失焦、不可见、减少动态效果及节能设置。
- Windows 修复有效主 Agent 漏计；领导力详情支持今日、近 7 天、近 28 天，全部字段跟随所选报告，缺失时明确提示。
- Windows 精简 Dashboard 文案与正常额度标志，保留来源提示和上次结果状态；任务栏目随中英文界面语言显示。

## 冻结候选

版本 1.4.0，macOS build 30。四个安装包均来自源码 `0c3b2210ab4fa3ac5879707bf99b390ee77118c6`，由[双平台构建与安装验收任务 38650459768](https://github.com/shanggqm/codexU/actions/runs/38650459768)产出。Windows 程序 SHA-256：`54acccbeeedfe2769c91ea1d238315ccbea70c29f34643a7d52717721479e622`。

本次最终验收及发布必须复用这批冻结文件，不用 tag 触发的重建包替换已验收字节。

## 验证

- 全局内存风险扫描及生命周期人工复核 PASS。门禁现会在缺少扫描依赖、扫描报错或清单读取错误时失败，并执行对应回归；macOS runner 显式安装 ripgrep。macOS 包装执行完整自测、两架构构建、DMG 校验、挂载、Mach-O 和 ad-hoc 签名验证，并执行合成 Claude 大输入完整性与峰值 RSS 检查。
- Windows runner 执行 Rust workspace 测试、Web 构建和 MSI/NSIS 打包；两个独立一次性 runner 分别通过全新安装、1.3.4 升级、数据保留及卸载，安装后的程序 hash 绑定同一 manifest。
- 本地受影响前端构建、37 项合同与 10 项 Playwright 场景通过，覆盖八个表面及中英文、浅深色、空与非空任务栏目。未受栏目标签修改影响的额度/领导力检查复用精确上一候选证据，不将测试数相加为新组合结果。
- 解包核对新 MSI/NSIS 的版本、x64/AMD64 架构和相同程序 SHA-256；运行新包内程序，使用独立设置和缓存验证真实本地额度、完整历史、栏目中文、三个周期、手动刷新、重启和正常退出，PASS。原正式安装及设置不变。
- 四个安装包和四份 checksum 汇总核对 PASS。
- 冻结包最终元数据门禁待运行；当前记录用于提交真实 checksum 后触发该门禁，尚未创建 release commit、tag 或公开 Release。

## 签名与边界

Windows MSI/NSIS 为 **NotSigned**，未做 Authenticode 签名。macOS 为 **ad-hoc 签名，未 notarize**。未将 macOS 打包和合成探测描述为登录账户的 GUI 实机验收；未进行真实硬件省电切换或 HWND/DPI 验收。

## 安装包与 SHA-256

```text
9ba58e939a947643273c1a38715b2173f4c40be929dfa0670ab3dae658d7ffd4  codexU-1.4.0-mac-arm64.dmg
33f7cb42b4f3fa3eb92cb92aa21fd231d03cf6c5ed61474243f16b33e9111525  codexU-1.4.0-mac-x86_64.dmg
72e6be0dd2a7db25b80f0a414f8583af0cf3f0efeac5bcdbbfc2ab5323282259  codexU-1.4.0-windows-x86_64.msi
0af6ad67c29efbeb62c93959494a2a0862c0538f03a319289b677d83b0660607  codexU-1.4.0-windows-x86_64-setup.exe
```
