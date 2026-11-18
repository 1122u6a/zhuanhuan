# 节点工坊

节点工坊是一个可自行部署的静态节点配置转换工具。导入已有节点，选择目标客户端，预览并下载配置，再到客户端自行导入。

支持 VLESS-TLS、Hysteria2、VLESS-REALITY 和 VLESS-REALITY-XHTTP。可粘贴多条分享链接，也可手动填写单个节点。

## 下载与部署

1. 在 GitHub 仓库首页点击 **Code → Download ZIP**，下载并解压源码。
2. 在 Cloudflare 控制台创建 **Pages** 项目，将解压后的 `dist/` 文件夹拖到上传区。
3. 点击 **Deploy site**，打开项目的生产地址 `https://<项目名>.pages.dev`。

已有项目更新、从 GitHub 自动部署、绑定自有域名和排错，见 [Cloudflare Pages 部署教程](docs/cloudflare-pages.md)。

## 导出格式

| 目标 | 文件 | 支持范围 |
| --- | --- | --- |
| Mihomo / Clash Meta | `mihomo.yaml` | 四种协议。XHTTP 需要客户端内核支持 |
| Xray-core | `xray.json` | 支持三种 VLESS 配置。多节点从本机 SOCKS 端口 10808 起依次分配 |
| Hysteria 2 官方客户端 | `hysteria2.yaml` | 每次一个 Hysteria2 节点。默认本机 SOCKS 端口为 10808 |
| 支持分享链接导入的客户端 | `nodes.txt` | 每行一个链接，可逐条复制到客户端 |

转换结果需与已有节点服务端的参数匹配。不同客户端对高级参数的支持有差异，页面会提示当前目标格式无法转换的参数。

## 隐私

节点信息仅在浏览器本地处理，不上传、不留存。页面没有账号系统、转换 API、数据库、浏览器持久化存储或统计脚本；下载由浏览器在本地生成。站点的 `_headers` 定义了内容安全策略，阻止页面脚本发起网络连接和网页表单提交。

使用 Cloudflare Pages 时，Cloudflare 仍会收到加载网页及静态资源的请求，并可能处理常规访问和安全日志。下载的配置文件、主动复制到剪贴板的内容以及随后导入客户端的配置由用户自己保管。 [Cloudflare 流量统计说明](https://developers.cloudflare.com/analytics/types-of-analytics/)

## 本地运行

解压后可以直接用浏览器打开 `dist/index.html`。也可在仓库根目录启动本地静态服务器。

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

打开 [本地预览](http://127.0.0.1:8000/)。页面和样式位于 `dist/index.html`、`dist/style.css`，转换逻辑在 `dist/converter.js`，交互和下载在 `dist/app.js`。部署无需安装依赖或设置环境变量。

## 许可证

使用 [MIT 许可证](LICENSE) 发布。
