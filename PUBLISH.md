# 发布 dsh-wage-pet

两个占位符先替换成本人信息：

```sh
# 在仓库根目录执行（把名字和 GitHub 用户名换成自己的）
sed -i 's/YOUR_NAME/你的名字/g; s/YOUR_GITHUB/你的GitHub用户名/g' package.json LICENSE
```

验证没有残留：

```sh
grep -n "YOUR_" package.json LICENSE
```

---

## 一、发布到 npm（插件市场索引读的就是 npm）

市场索引 `dsh-plugin-catalog` 只收录 **已发布到 npm 且版本可解析** 的插件，所以这一步是「出现在 Discover / 市场」的前提。

```sh
# 1. 确认 npm 源是官方源（本机当前是 npmmirror，只能装不能发）
npm config set registry https://registry.npmjs.org

# 2. 登录（会打开浏览器授权）
npm login

# 3. 确认身份与包名可用
npm whoami
npm view dsh-wage-pet version    # 应报 404，说明名字没被占

# 4. 检查最终产物（不实际发布）
npm pack --dry-run

# 5. 发布
npm publish --access public
```

发布后验证：

```sh
npm view dsh-wage-pet version
npm view dsh-wage-pet dist.tarball
```

> 本机 npm 源是 `registry.npmmirror.com`，它是只读镜像，**发布必须切到官方源**。
> 发完可以切回去：`npm config set registry https://registry.npmmirror.com`

---

## 二、建 GitHub 仓库（收录要求仓库满 1 天）

市场收录检查的是 GitHub 仓库，不是 npm 包。

```sh
git init
git add -A
git commit -m "feat: dsh-wage-pet 桌宠式工资计程表"

# 用 GitHub 网页新建空仓库 dsh-wage-pet 后：
git remote add origin https://github.com/你的GitHub用户名/dsh-wage-pet.git
git branch -M main
git push -u origin main
```

仓库必须做两件事：

1. **加 `dsh-plugin` topic** — 仓库页右上 About 旁的齿轮 → Topics → 填 `dsh-plugin` → 保存
2. **仓库创建满 1 天** — CI 自动检查，刚建的仓库会被打回

`package.json` 里已经声明了 `dsh.bundle`（收录的硬性要求），`cordis.patch.yml` 也在根目录。

---

## 三、提交收录（一个 YAML 文件就是一个 PR）

Fork 仓库：https://github.com/awesome-dsh-plugin/awesome-dsh-plugin

新建文件 `data/plugins/你的GitHub用户名__dsh-wage-pet.yml`：

```yaml
url: https://github.com/你的GitHub用户名/dsh-wage-pet
name: 你的GitHub用户名/dsh-wage-pet
category: ui
description:
  en: A desktop pet that counts today's earnings in real time from your pay, work week, and shift hours.
  zh: 桌宠式工资计程表：按月薪或时薪、单休双休与上下班时间，实时累计今日进账。
```

要点：

- **只提交这一个文件**，两个 README 是脚本生成的，不要手动改
- `url` 必须和仓库地址完全一致
- `description.en` 必填，`zh` 可选（不写维护者会补）
- 描述里不能有营销词，写「做了什么」；带数字或 API 名会被逐一核对
- 描述含 `: `（冒号加空格）时整行要加引号

可选：放一张 GitHub 托管的位图当市场卡片图标（不写则用你的头像）：

```yaml
icon: https://raw.githubusercontent.com/你的GitHub用户名/dsh-wage-pet/main/icon.png
```

> 现有的 `icon.svg` 是插件清单图标，市场卡片要的是位图（png），需要另存一份 180×180 的 PNG。

提交 PR 后等维护者合并；合并后 `main` 会自动重新生成两个 README，市场索引也会跟着更新。

---

## 四、验证收录生效

合并后，在 DSH 里：

```
Plugins → Discover → Index sources
添加：https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json
```

然后搜 `wage` 或 `工资`，应该能看到自己的插件并一键安装。

也可以直接用 agent 工具验证：

```
dshm_search({ query: "wage" })
```

---

## 五、版本迭代

改完代码后：

```sh
npm version patch    # 或 minor / major
npm publish --access public
git push --follow-tags
```

市场索引按 npm 版本抓取，**发新版本不需要再提 PR**，收录条目会自动跟上。

---

## 检查清单

发布前：

- [ ] `package.json` 里 `name`、`client.js` 的模块 `id`、`cordis.patch.yml` 的 `name` 三处一致
- [ ] 没有 `private: true`
- [ ] 没有残留 `YOUR_` 占位符
- [ ] `npm pack --dry-run` 列出 10 个文件，含 `cordis.patch.yml`
- [ ] 本地全新安装能跑（删掉配置后重启验证）
- [ ] `dsh.bundle` 存在（不是只有 `dsh.client`）

提交收录前：

- [ ] npm 上能 `npm view dsh-wage-pet version`
- [ ] GitHub 仓库满 1 天
- [ ] 加了 `dsh-plugin` topic
- [ ] YAML 文件名是 `<owner>__<repo>.yml`
- [ ] 只改了那一个文件
