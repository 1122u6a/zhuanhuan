# 部署到自己的 Cloudflare Pages

部署完成后，你会得到自己控制的 `*.pages.dev` 网站链接，也可以绑定自己的域名。节点工坊是纯静态网页，只需一个 Cloudflare 账号。

## 方法一：手动上传源码中的网页文件

适合希望先上线、后续手动上传更新的人。

1. 在 GitHub 点击 **Code → Download ZIP**。解压源码，在项目目录里找到 `dist/` 文件夹。里面有 `index.html`、`style.css`、`converter.js`、`app.js` 和 `_headers`。
2. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，打开 **Workers & Pages → Create application**，选择 **Pages** 的 **Drag and drop** 上传方式。
3. 填写自己的项目名，把整个 `dist/` 文件夹拖到上传区。如果拿到的是专门用于 Pages 的部署 ZIP，可直接上传该 ZIP。部署 ZIP 解开后的顶层应直接包含 `index.html` 和其他网页文件。
4. 点击 **Deploy site**。进入项目的 **Deployments**，打开 **Production** 对应的 `https://<项目名>.pages.dev`。
5. 更新时进入同一个项目，选择 **Create a new deployment → Production**，再上传新版 `dist/` 或部署 ZIP。项目地址会继续使用现有网址。

GitHub 的 **Download ZIP** 是完整仓库压缩包。请先解压，再上传其中的 `dist/`，以便 Pages 在站点根目录找到 `index.html`。 [Cloudflare Direct Upload 文档](https://developers.cloudflare.com/pages/get-started/direct-upload/)

## 方法二：连接 GitHub，提交后自动部署

适合希望在自己的仓库里维护代码的人。

1. 在 GitHub **Fork** 本仓库，或将源码提交到自己控制的 GitHub 仓库。
2. 在 Cloudflare 打开 **Workers & Pages → Create application**，选择 **Pages → Connect to Git**。按提示授权并选中自己的仓库。
3. 在构建设置中填写以下配置，然后开始部署。

| 选项 | 值 |
| --- | --- |
| Production branch | `main`，或你实际使用的生产分支 |
| Framework preset | `None` |
| Build command | `exit 0` |
| Build output directory | `dist` |
| Root directory | 保持默认的仓库根目录 |
| Environment variables | 留空 |

部署成功后打开 **Production** 地址。以后提交到生产分支，Pages 会自动部署该版本。已经采用 Direct Upload 的项目若要改用 Git 集成，需要新建一个 Git 集成的 Pages 项目。 [Cloudflare Git 集成文档](https://developers.cloudflare.com/pages/get-started/git-integration/) · [静态 HTML 配置](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)

## 可选：绑定自己的域名

在 Pages 项目进入 **Custom domains → Set up a custom domain**，输入你管理的域名或子域名，按页面提示验证并配置 DNS。等控制台显示域名已激活，再打开该地址测试。 [Cloudflare Pages 自定义域名文档](https://developers.cloudflare.com/pages/configuration/custom-domains/)

## 上线检查

- 打开生产地址，确认页面顶部出现「节点信息仅在浏览器本地处理，不上传、不留存」。
- 点击 **填入示例 → 生成配置 → 下载配置**，确认浏览器能保存 `mihomo.yaml`。
- 首页返回 `404` 时，检查部署根目录是否直接包含 `index.html`。用 Git 集成时，构建输出目录应填 `dist`。 [Cloudflare Pages 排错](https://developers.cloudflare.com/pages/configuration/debugging-pages/)
- 正式地址仍显示旧版时，在 **Deployments** 确认上传的是 **Production** 版本。
- 保留 `_headers`，并保持页面仅使用项目自带的脚本、样式和资源。节点数据在浏览器处理，Cloudflare 仍可能处理静态资源的访问日志。 [Cloudflare Pages 响应头](https://developers.cloudflare.com/pages/configuration/headers/)
