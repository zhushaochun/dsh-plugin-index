# dsh-plugin-index

DSH 插件市场「发现」索引源（format 1），数据来自社区目录
[awesome-dsh-plugin](https://github.com/dsh-market/dsh-market)（5065 条），
筛出其中有 npm 包名的 **2608** 个插件，可直接作为
`@deepseek-ai/dsh-plugin-market` 的 `indexes` 配置项。

索引地址（GitHub Pages，直接返回 JSON）：

```
https://zhushaochun.github.io/dsh-plugin-index/index.json
```

## 注册到 DSH

在 profile 的 `cordis.patch.yml` 中加入（`fetchTimeoutMs` 见下文注意事项）：

```yaml
- id: plugin-market
  name: "@deepseek-ai/dsh-plugin-market"
  config:
    fetchTimeoutMs: 180000
    indexes:
      - https://zhushaochun.github.io/dsh-plugin-index/index.json
```

也可在 Web GUI 的 **插件 → 发现 → 索引源** 里直接添加。注意：index.json 约
2.08 MB，从国内网络经 GitHub Pages 下载需 18–92 秒，默认 `fetchTimeoutMs`
为 15 秒会直接失败，所以必须一并调高超时；文档被 Host 缓存 10 分钟
（`cacheTtlMs`），之后切换标签页不再重新下载。

## 内容统计

| 项 | 数 |
|---|---|
| 目录总条目 | 5065 |
| 进入索引 | 2608 |
| 无 npm 包名（无法安装，跳过） | 2457 |
| 带图标 | 735 |
| 分类 | 23 |
| 版本时间戳 | 真实 npm 发布时间，2026-08-13 → 2026-10-17 |

字段映射：`name` / `version` 取目录的 npm 包名与最新 SemVer；`title` /
`description` 为 `{en, zh}` 本地化文本；`source` 统一 `{type:"npm"}`；
`publishTimestamp` 为 `Math.floor(Date.parse(time[v])/1000)`；
`icon` 取第一张 `^https://[^\s?#]+$` 的截图；`homepage` 取目录的页面链接。

## 重新生成

```bash
node build-index.cjs <plugins.json>       # 生成 index.json
node fetch-times.cjs index.json           # 只为缺失 publishTimestamp 的包补时间
node validate.cjs index.json              # 用官方解析器校验
node check-charset.cjs index.json         # 检查 latin-1 补充区残留字符
```

- `build-index.cjs` 的输入是 npm 包 `dsh-plugin-catalog` 解包出的 `plugins.json`。
- `fetch-times.cjs` 读 `https://registry.npmjs.org/<name>` 的**完整文档**
  （accept: application/json；缩写文档没有 `time` 字段），结果缓存进
  `times-cache.json`，可断点续跑。
- `validate.cjs` require 本机安装的
  `@deepseek-ai/dsh-plugin-market-index`，校验 `parseMarketIndex` 与
  `marketInstallTarget`。
