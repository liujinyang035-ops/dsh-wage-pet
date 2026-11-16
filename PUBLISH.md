# 发布 dsh-wage-pet

当前状态（2026-11-16）：

| 项目 | 状态 |
|---|---|
| GitHub 仓库 | ✅ https://github.com/liujinyang035-ops/dsh-wage-pet |
| npm 包 | ✅ `dsh-wage-pet@1.0.0` |
| 市场 PR | ⏳ [#15871](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/15871)，等仓库满 1 天 |

---

## 一、发布到 npm

`npm login` 拿到的 token **不能发布**。npm 现在要求带 `bypass 2FA` 权限的 Granular Access Token，
否则 `npm publish` 会返回：

```
403 Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages.
```

### 创建发布用 token

1. https://www.npmjs.com/settings/liujinyang/tokens → Generate New Token → **Granular Access Token**
2. Token name 随意，例如 `dsh-wage-pet-publish`
3. **勾选 Bypass two-factor authentication (2FA)** ← 不勾会一直 403
4. Permissions → Packages and scopes → **Read and write (publish and stage)**
5. Select packages → All packages（或只选 `dsh-wage-pet`）
6. Expiration 默认 7 天，可选 30 天
7. 生成后复制 `npm_xxxxx`

写入 `~/.npmrc`：

```
//registry.npmjs.org/:_authToken=npm_xxxxx
```

### 发布

```sh
npm whoami --registry=https://registry.npmjs.org   # 确认身份
npm publish --registry=https://registry.npmjs.org --access public
```

首次发布会先出现一个 `0.0.0-stage` 占位版本，这是 npm 预留包名的机制。
等 1–2 分钟 CDN 缓存刷新后，`latest` 才会指向真实版本：

```sh
npm view dsh-wage-pet version --registry=https://registry.npmjs.org
# 期望：1.0.0
```

验证 tarball 可下载、内容完整：

```sh
curl -s -o /dev/null -w "%{http_code} %{size_download}\n" \
  https://registry.npmjs.org/dsh-wage-pet/-/dsh-wage-pet-1.0.0.tgz
```

> 本机默认 npm 源是 `registry.npmmirror.com`（只读镜像），发布必须显式指定官方源。
> 用 `--registry` 参数比改全局配置更安全，不会影响日常安装速度。

### 关于 token 有效期

写权限的 token 最长 90 天，本次设为 30 天（2026-12-16 到期）。到期后发新版需重新生成。
长期方案是改用 **Trusted Publishing**（GitHub Actions OIDC，无需存 token），
npm 在 token 页面也有同样的提示。

---

## 二、GitHub 仓库

已完成。需要维持的两点：

1. **`dsh-plugin` topic** — 已有（`dsh-plugin`、`deepseek-harness`、`desktop-pet`、`salary`）
2. **仓库创建满 1 天** — CI 自动检查。本次创建于 2026-11-16 09:21 UTC，
   达标时间约 2026-11-17 09:21 UTC（北京时间 17:21）

`package.json` 已声明 `dsh.bundle`（收录硬性要求），`cordis.patch.yml` 在根目录。

### `engines.dsh` 的写法要注意

DSH 用 `semver.satisfies(version, range, { includePrerelease: true })` 校验，
**不带显式预发布分支的范围会静默排除所有预发布构建**。当前运行时是 `0.2.2-rc.1`，
下面这些看起来正常的写法实际都会判为不匹配：

```
>=0.2.0-rc.1 <0.3.0-0          ✗ 匹配不到 0.2.2-rc.1
>=0.2.0-0 <0.3.0-0             ✗ 匹配不到 0.2.2-rc.1
```

现在用的是每个版本元组都带预发布标签的写法：

```json
"engines": {
  "dsh": ">=0.2.0-rc.1 <0.3.0-0 || >=0.2.1-rc.1 <0.3.0-0 || >=0.2.2-rc.1 <0.3.0-0 || >=0.2.3-rc.1 <0.3.0-0"
}
```

覆盖 0.2.0-rc.1 到 0.2.9，排除 0.3.0-rc.1。

---

## 三、市场收录

一个 YAML 文件就是一个 PR。已提交：`data/plugins/liujinyang035-ops__dsh-wage-pet.yml`

```yaml
url: https://github.com/liujinyang035-ops/dsh-wage-pet
name: liujinyang035-ops/dsh-wage-pet
category: ui
description:
  en: "..."
  zh: "..."
icon: https://raw.githubusercontent.com/liujinyang035-ops/dsh-wage-pet/main/icon.png
```

要点：

- **只提交这一个文件**，两个 README 是脚本生成的，不要手动改
- `url` 必须和仓库地址完全一致
- 描述里不能有营销词；带数字或 API 名会被逐一核对
- 描述含 `: `（冒号加空格）时整行要加引号
- `icon` 必须是 GitHub 托管的位图（png/jpg/webp），SVG 和第三方图床会被拒

### 本地预检（提 PR 前）

```sh
git clone --depth 1 https://github.com/awesome-dsh-plugin/awesome-dsh-plugin.git repo
cd repo
# 放入条目文件后：
GITHUB_TOKEN=<有 repo 读权限的 token> node scripts/check-submission.mjs --base HEAD~1
```

这会跑和 CI 同一套检查，比等 CI 快。唯一靠等待才能过的是仓库年龄。

### 当前 PR 状态

`Submission gate` 的失败项只有一个：

```
repository is 0.0 days old (needs 1) — nothing to do: this check re-runs
by itself and should clear in about 24h.
```

`regate.yml` 每 6 小时按这条措辞重跑。**不要重开 PR、不要推空提交**，
时间到了会自己变绿。其余 17 个检查步骤（awesome-lint、README 一致性、
Build、三个 test 套件）已全部通过。

---

## 四、验证收录生效

合并后在 DSH 里：

```
Plugins → Discover → Index sources
添加：https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json
```

搜 `wage` 或 `工资` 应该能看到并一键安装。也可以用 agent 工具：

```
dshm_search({ query: "wage" })
```

---

## 五、版本迭代

```sh
npm version patch    # 或 minor / major
npm publish --registry=https://registry.npmjs.org --access public
git push --follow-tags
```

市场索引按 npm 版本抓取，**发新版本不需要再提 PR**，收录条目会自动跟上。

---

## 检查清单

发布前：

- [x] `package.json` 的 `name`、`client.js` 模块 `id`、`cordis.patch.yml` 的 `name` 三处一致
- [x] 没有 `private: true`
- [x] 没有残留 `YOUR_` 占位符
- [x] `npm pack --dry-run` 列出 11 个文件，含 `cordis.patch.yml` 和 `icon.png`
- [x] `dsh.bundle` 存在（不是只有 `dsh.client`）
- [x] `engines.dsh` 覆盖当前运行时版本

提交收录前：

- [x] npm 上能 `npm view dsh-wage-pet version`
- [ ] GitHub 仓库满 1 天 ← 待达标
- [x] 加了 `dsh-plugin` topic
- [x] YAML 文件名是 `<owner>__<repo>.yml`
- [x] 只改了那一个文件
