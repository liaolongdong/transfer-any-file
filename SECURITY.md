# 安全策略

简体中文 · [English](SECURITY.en.md)

## 支持的版本

只支持 `main` 上的最新构建。没有旧版本维护清单：扩展以单个自包含包发布，每一次安装跑的都是同一份代码，所以「修复」就是下一次发布。

## 攻击面到底是什么

下面这些结论是**结构性、可核对**的，也解释了为什么多数常见类别的报告并不适用于本项目。

| 属性         | 状态                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 权限         | 只有一项：`storage`。无 `host_permissions`、无 `<all_urls>`、无 content script。                                                                                    |
| 网络调用     | 自身不发起任何调用。`fetch` / `XMLHttpRequest` / `WebSocket` / `EventSource` / `sendBeacon` 在 `entrypoints/`、`components/`、`composables/`、`utils/` 中均不出现。 |
| 远程代码     | 无。不引用 CDN 资源、无 `eval`、无 `new Function`。                                                                                                                 |
| 文件内容落盘 | 从不写入任何位置。转换期间只存在于该标签页的内存中，结果以下载的形式交还用户。                                                                                      |
| 历史记录     | 只保存文件名、格式与体积，写在 `chrome.storage.local`，留在本机。                                                                                                   |
| 不可信输入   | 上传的文件、剪贴板内容、ZIP 条目与已存储的值都在边界处校验；由它们生成的 HTML / SVG / Markdown 在渲染前一律经 DOMPurify 净化。                                      |

验证方法：`pnpm verify:offline:source` 负责源码层——在那四个第一方目录里 grep 上述请求入口，并检查 `wxt.config.ts` 是否仍然只声明 `storage`、没有 `host_permissions`；`pnpm verify:offline`（CI 在 `pnpm build` 之后跑的那条，本地也须先构建）在此之上再断言浏览器实际加载的 `.output/chrome-mv3/manifest.json` 权限仍然只有 `storage`，产物缺失时直接失败而不是跳过。对 `.output/chrome-mv3` 做 grep 并不是正确的检查方式：打包进来的转换库确实**在扩展永远不会进入的路径上**带着请求代码。而即使真的走到那些路径，也做不成任何有意义的事——没有 host 权限、没有 content script 时，扩展页面发出的请求就是一个受 CORS 限制的普通网页请求，既读不到响应，也碰不到任何网站的数据。真正撑得住这条保证的是第一点：**第一方代码没有任何一处调用请求 API**。

## 报告漏洞

优先使用**私密安全通告**：[仓库的 Security 页](https://github.com/liaolongdong/transfer-any-file/security/policy)提供「Report a vulnerability」入口，可以让细节不进入公开的 issue 列表。如果该表单在本仓库暂不可用，请发邮件到 `924902324@qq.com`。

请一并给出：

- 版本标识（`git rev-parse HEAD`）或商店版本号。
- 什么东西被攻陷、是从谁的位置出发的——转换器产出了错误的文件是 **bug**，不是漏洞；读取用户从未选择的文件、或把数据传出本机，才是**漏洞**。
- 复现步骤。如果复现需要用到敏感文件，请描述它，不要把它附上来。

一人维护的项目没有正式的响应时限承诺，但排序很简单：一个已确认、可能泄露或损坏用户数据的问题，优先级高于待办队列里的一切。

转换报错、界面问题、格式需求请开普通 [issue](https://github.com/liaolongdong/transfer-any-file/issues)——它们不属于安全报告。
