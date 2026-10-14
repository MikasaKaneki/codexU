# codexU v1.4.0

codexU v1.4.0 统一两平台模型定价，并在 Windows 改进历史刷新、剩余额度与 AI 领导力展示。

## 主要更新

- macOS 与 Windows 共享本地模型定价，按回合实际模型及服务档位计价。
- Windows 流式处理合法大历史记录，持续追加时保留完整统计，修复额度查询相关磁盘增长与进程残留。
- Windows 剩余额度环与分级领导力轨道加入动效，并响应失焦、不可见、减少动态效果及节能设置。
- Windows 修复有效主 Agent 漏计；领导力详情支持今日、近 7 天、近 28 天，全部字段跟随所选报告，缺失时明确提示。
- Windows 精简 Dashboard 文案与正常额度标志，保留来源提示和上次结果状态；任务栏目随中英文界面语言显示。

## 冻结候选

版本 1.4.0，macOS build 30。四个安装包均来自源码 `51e03cc5905a897a6d409f1778ed0f4e81938aea`，由[双平台构建与安装验收任务 38654065193](https://github.com/shanggqm/codexU/actions/runs/38654065193)产出。Windows 程序 SHA-256：`671cfca8363e07e87b96d11c262bca3bd33b1ec1d00fae58541331d2b1518ddf`。

本次最终验收及发布必须复用这批冻结文件，不用 tag 触发的重建包替换已验收字节。

## 验证

- 全局内存风险扫描及生命周期人工复核 PASS。门禁现会在缺少扫描依赖、扫描报错或清单读取错误时失败，并执行对应回归；macOS runner 显式安装 ripgrep。macOS 包装执行完整自测、两架构构建、DMG 校验、挂载、Mach-O 和 ad-hoc 签名验证，并执行合成 Claude 大输入完整性与峰值 RSS 检查。
- Windows runner 执行 Rust workspace 测试、Web 构建和 MSI/NSIS 打包；两个独立一次性 runner 分别通过全新安装、1.3.4 升级、数据保留及卸载，安装后的程序 hash 绑定同一 manifest。
- 本地受影响前端构建、37 项合同与 10 项 Playwright 场景通过，覆盖八个表面及中英文、浅深色、空与非空任务栏目。未受栏目标签修改影响的额度/领导力检查复用精确上一候选证据，不将测试数相加为新组合结果。
- 解包核对新 MSI/NSIS 的版本、x64/AMD64 架构和相同程序 SHA-256；运行新包内程序，使用独立设置和缓存验证真实本地额度、完整历史、栏目中文、三个周期、手动刷新、重启和正常退出，PASS。本机未执行安装；实际程序验证使用独立设置和缓存。
- 四个安装包和四份 checksum 汇总核对 PASS。
- [冻结包最终门禁任务 38656362151](https://github.com/shanggqm/codexU/actions/runs/38656362151)通过，使用原任务的安装包，源码一致性、`make release-check` 和两个安装验收矩阵均 PASS。

## 签名与边界

Windows MSI/NSIS 为 **NotSigned**，未做 Authenticode 签名。macOS 为 **ad-hoc 签名，未 notarize**。未将 macOS 打包和合成探测描述为登录账户的 GUI 实机验收；未进行真实硬件省电切换或 HWND/DPI 验收。

## 安装包与 SHA-256

```text
f1bb1d4787d6128d9bb68c50f5e0e720b2e927d8ecf8bcf212d32a47ec96b5ff  codexU-1.4.0-mac-arm64.dmg
bcc7fe2950e2ad54e7e212695cf65a87190f2a8be9806384ef62632006b66ea7  codexU-1.4.0-mac-x86_64.dmg
9a0eab17adfbe821a8207ccd2486b454b2ca951b5aa902956c994bb3fc151f69  codexU-1.4.0-windows-x86_64.msi
89beda76138aa85646372eb92bd48eab327feb99c8ae4932dae1f3bf0d43852f  codexU-1.4.0-windows-x86_64-setup.exe
```
