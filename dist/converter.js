"use strict";

const NodeStudio = (() => {
  const vlessFields = new Set("security type encryption sni fp alpn flow pbk sid spx pqv host path mode serviceName authority allowInsecure".split(" "));
  const hysteriaFields = new Set("sni insecure obfs obfs-password pinSHA256 ech".split(" "));
  const formats = {
    mihomo: { extension: "yaml", file: "mihomo.yaml", hint: "适用于使用 Mihomo 内核的客户端。XHTTP 需要客户端内核支持。" },
    xray: { extension: "json", file: "xray.json", hint: "支持 VLESS。节点从 127.0.0.1:10808 起依次分配 SOCKS 端口。" },
    hysteria: { extension: "yaml", file: "hysteria2.yaml", hint: "仅支持单个 Hysteria2 节点。配置在 127.0.0.1:10808 提供 SOCKS 代理。" },
    uri: { extension: "txt", file: "nodes.txt", hint: "每行一条分享链接。打开文件后可逐条复制到支持链接导入的客户端。" },
  };
  const decode = (value) => decodeURIComponent(value ?? "");

  function parse(raw) {
    const match = /^(vless|hysteria2|hy2):\/\/([^/?#]+)(\/)?(?:\?([^#]*))?(?:#(.*))?$/i.exec(raw);
    if (!match) throw new Error("请输入完整的 vless://、hysteria2:// 或 hy2:// 节点链接。");
    const [, scheme, authority, , query, fragment] = match;
    const hy2 = scheme.toLowerCase() !== "vless";
    const at = authority.lastIndexOf("@");
    const auth = at < 0 ? "" : decode(authority.slice(0, at));
    const endpoint = at < 0 ? authority : authority.slice(at + 1);
    const address = /^(\[[\da-f:.]+\]|[^:[\]\\@\s%]+)(?::(\d+))?$/i.exec(endpoint);
    if (!address) throw new Error("服务器地址无效。请使用域名、IP 或方括号包裹的 IPv6，端口需为单个数字。");
    let host;
    try {
      host = new URL("https://" + address[1]).hostname.replace(/^\[|\]$/g, "");
    } catch {
      throw new Error("服务器地址无效。");
    }
    const port = Number(address[2] ?? 443);
    if (port < 1 || port > 65535) throw new Error("端口必须在 1–65535 之间。");
    if (!auth || /[\x00-\x1f\x7f]/.test(auth)) throw new Error(hy2 ? "缺少有效的 Hysteria2 认证信息。" : "缺少有效的 VLESS UUID。");
    if (!hy2 && !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(auth)) throw new Error("VLESS 认证信息应为标准 UUID。");

    decode(query);
    const entries = [...new URLSearchParams(query)];
    if (new Set(entries.map(([key]) => key)).size !== entries.length) throw new Error("链接包含重复参数，请检查后重试。");
    const p = Object.fromEntries(entries);
    const name = decode(fragment).trim() || host;
    if (/[\r\n\x00-\x1f]/.test(name)) throw new Error("节点名称含有控制字符。");
    const unknown = entries.map(([key]) => key).filter((key) => !(hy2 ? hysteriaFields : vlessFields).has(key));
    if (hy2) {
      if (p.obfs && !["gecko", "salamander"].includes(p.obfs)) throw new Error("无法识别该 Hysteria2 混淆类型。");
      if (Boolean(p.obfs) !== Boolean(p["obfs-password"])) throw new Error("请同时提供混淆类型和混淆密码。");
      if (!["", "0", "1", "true", "false"].includes(p.insecure ?? "")) throw new Error("Hysteria2 的 insecure 参数无效。");
      return { raw, protocol: "hy2", host, port, auth, name, p, unknown };
    }

    const security = p.security?.toLowerCase();
    const network = !p.type || p.type === "tcp" ? "raw" : p.type;
    if (!["tls", "reality"].includes(security)) throw new Error("VLESS 链接须指定 security=tls 或 security=reality。");
    if (!["raw", "ws", "grpc", "xhttp"].includes(network)) throw new Error("当前支持 RAW/TCP、WebSocket、gRPC 和 XHTTP 传输。");
    if (!["", "0", "1", "true", "false"].includes(p.allowInsecure ?? "")) throw new Error("VLESS 的 allowInsecure 参数无效。");
    if (security === "reality") {
      if (network === "ws") throw new Error("REALITY 不支持 WebSocket 传输。");
      if (!p.sni || !/^[A-Za-z0-9_-]{43}$/.test(p.pbk ?? "")) throw new Error("REALITY 需要 SNI 和有效的公钥（pbk）。");
      if (p.sid && !/^(?:[\da-f]{2}){1,8}$/i.test(p.sid)) throw new Error("REALITY 的 Short ID 应为 2–16 位、偶数长度的十六进制字符串。");
    }
    if (network === "xhttp" && p.mode && !["auto", "packet-up", "stream-up", "stream-one"].includes(p.mode)) throw new Error("无法识别该 XHTTP 模式。");
    if (p.flow && (p.flow !== "xtls-rprx-vision" || network !== "raw")) throw new Error("当前仅支持 RAW/TCP 的 xtls-rprx-vision 流控。");
    const protocol = security === "tls" ? "tls" : network === "xhttp" ? "xr" : "reality";
    return { raw, protocol, security, host, port, auth, name, network, p, unknown };
  }

  const secureHost = (host) => host.includes(":") ? "[" + host + "]" : host;
  const enabled = (value) => ["1", "true"].includes(value);
  const optional = (key, value) => value === undefined || value === "" ? {} : { [key]: value };
  const alpn = (p) => p.alpn?.split(",").map((value) => value.trim()).filter(Boolean);

  function manual(data) {
    const hy2 = data.protocol === "hy2";
    const host = data.server.trim().replace(/^\[|\]$/g, "");
    const port = data.port.trim();
    if (!host || /[/?#@\\\s]/.test(host) || !/^\d+$/.test(port)) throw new Error("请输入服务器地址和有效端口。");
    const query = new URLSearchParams();
    if (!hy2) {
      query.set("security", data.protocol === "tls" ? "tls" : "reality");
      query.set("type", data.protocol === "xr" ? "xhttp" : data.network || "raw");
      query.set("encryption", "none");
    }
    for (const key of (hy2 ? hysteriaFields : vlessFields)) {
      if (!["security", "type", "encryption"].includes(key) && data[key]?.trim()) query.set(key, data[key].trim());
    }
    const raw = (hy2 ? "hysteria2" : "vless") + "://" + encodeURIComponent(data.auth)
      + "@" + secureHost(host) + ":" + port
      + (query.size ? "?" + query : "") + (data.name.trim() ? "#" + encodeURIComponent(data.name.trim()) : "");
    return parse(raw);
  }

  // JSON quoted strings are also YAML double-quoted scalars.
  const scalar = (value) => JSON.stringify(value).replace(/[\u0085\u2028\u2029]/g, (char) => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"));
  function yaml(value, indent = 0) {
    const padding = " ".repeat(indent);
    return Object.entries(value).map(([key, item]) => {
      if (Array.isArray(item) && item.some((entry) => entry && typeof entry === "object")) {
        return padding + key + ":\n" + item.map((entry) => padding + "  - " + yaml(entry, indent + 4).trimStart()).join("\n");
      }
      if (item && typeof item === "object" && !Array.isArray(item) && Object.keys(item).length) {
        return padding + key + ":\n" + yaml(item, indent + 2);
      }
      return padding + key + ": " + scalar(item);
    }).join("\n");
  }

  function mihomo(node, name) {
    const { host, port, auth, p, network, security } = node;
    const base = { name, type: node.protocol === "hy2" ? "hysteria2" : "vless", server: host, port };
    if (node.protocol === "hy2") {
      if (p.obfs === "gecko" || p.ech) throw new Error("带 Gecko 或 ECH 参数的节点请选择 Hysteria 2 官方客户端或通用链接。");
      return { ...base, password: auth, ...optional("sni", p.sni), ...optional("obfs", p.obfs),
        ...optional("obfs-password", p["obfs-password"]), ...optional("fingerprint", p.pinSHA256),
        "skip-cert-verify": enabled(p.insecure) };
    }
    if (p.spx) throw new Error("带 spiderX 参数的 REALITY 节点请选择 Xray-core 或通用链接。");
    if (p.authority && network !== "grpc") throw new Error("authority 参数仅适用于 gRPC。");

    const transport = network === "xhttp" ? { "xhttp-opts": { ...optional("path", p.path), ...optional("host", p.host), ...optional("mode", p.mode) } }
      : network === "ws" ? { "ws-opts": { path: p.path || "/", ...optional("headers", p.host ? { Host: p.host } : undefined) } }
      : network === "grpc" ? { "grpc-opts": { ...optional("grpc-service-name", p.serviceName), ...optional("grpc-authority", p.authority) } } : {};
    return { ...base, uuid: auth, udp: true, tls: true, network: network === "raw" ? "tcp" : network,
      ...optional("servername", p.sni), ...optional("client-fingerprint", p.fp || (security === "reality" ? "chrome" : "")),
      ...optional("flow", p.flow), ...optional("alpn", alpn(p)),
      ...optional("encryption", p.encryption && p.encryption !== "none" ? p.encryption : ""),
      ...(security === "reality" ? { "reality-opts": { "public-key": p.pbk, "short-id": p.sid || "", ...optional("mldsa65-verify", p.pqv) } }
        : { "skip-cert-verify": enabled(p.allowInsecure) }),
      ...transport };
  }

  function xray(node, tag) {
    const { host, port, auth, p, network, security } = node;
    const streamSettings = { network, security };
    if (security === "reality") {
      streamSettings.realitySettings = { serverName: p.sni, fingerprint: p.fp || "chrome",
        password: p.pbk, shortId: p.sid || "", ...optional("spiderX", p.spx), ...optional("mldsa65Verify", p.pqv) };
    } else {
      if (enabled(p.allowInsecure)) throw new Error("当前 Xray-core 导出要求校验 TLS 证书。请选择通用链接，或核实证书后关闭 allowInsecure。");
      streamSettings.tlsSettings = { ...optional("serverName", p.sni), ...optional("fingerprint", p.fp), ...optional("alpn", alpn(p)) };
    }
    if (network === "xhttp") streamSettings.xhttpSettings = { ...optional("host", p.host), ...optional("path", p.path), ...optional("mode", p.mode) };
    if (network === "ws") streamSettings.wsSettings = { path: p.path || "/", ...optional("host", p.host) };
    if (network === "grpc") streamSettings.grpcSettings = { ...optional("serviceName", p.serviceName), ...optional("authority", p.authority) };
    return { tag, protocol: "vless", settings: { address: host, port, id: auth,
      encryption: p.encryption || "none", ...optional("flow", p.flow) }, streamSettings };
  }

  function hysteria(node) {
    const { host, port, auth, p } = node;
    return { server: secureHost(host) + ":" + port, auth,
      tls: { insecure: enabled(p.insecure), ...optional("sni", p.sni), ...optional("pinSHA256", p.pinSHA256), ...optional("ech", p.ech) },
      ...optional("obfs", p.obfs ? { type: p.obfs, [p.obfs]: { password: p["obfs-password"] } } : undefined),
      socks5: { listen: "127.0.0.1:10808" } };
  }

  function exportNodes(nodes, format) {
    if (!nodes.length) throw new Error("请先导入节点。");
    if (format === "uri") return nodes.map((node) => node.raw).join("\n") + "\n";
    if (format === "hysteria" && (nodes.length !== 1 || nodes[0].protocol !== "hy2")) {
      throw new Error("Hysteria 2 官方客户端格式仅接受一个 Hysteria2 节点。");
    }
    const used = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE", "GLOBAL", "节点选择"]);
    const items = nodes.map((node, index) => {
      try {
        if (node.unknown.length) throw new Error("此格式暂无法转换参数 " + node.unknown.join("、") + "。请选通用节点链接保留原值。");
        if (format === "xray" && node.protocol === "hy2") throw new Error("此 Xray 导出仅支持 VLESS。含 Hysteria2 的列表请选择 Mihomo 或通用链接。");
        let name = node.name;
        for (let suffix = 2; used.has(name); suffix++) name = node.name + " (" + suffix + ")";
        used.add(name);
        if (format === "mihomo") return mihomo(node, name);
        if (format === "xray") return xray(node, "node-" + (index + 1));
        return hysteria(node);
      } catch (error) {
        throw new Error("节点 " + (index + 1) + "：" + error.message);
      }
    });
    if (format === "hysteria") return yaml(items[0]) + "\n";
    if (format === "xray") return JSON.stringify({
      inbounds: items.map((_, index) => ({ tag: "socks-" + (index + 1), listen: "127.0.0.1", port: 10808 + index, protocol: "socks", settings: { udp: true } })),
      outbounds: items,
      routing: { rules: items.map((item, index) => ({ type: "field", inboundTag: ["socks-" + (index + 1)], outboundTag: item.tag })) },
    }, null, 2) + "\n";
    return yaml({ "mixed-port": 7890, "allow-lan": false, mode: "rule", "log-level": "warning",
      proxies: items, "proxy-groups": [{ name: "节点选择", type: "select", proxies: items.map((item) => item.name) }],
      rules: ["MATCH,节点选择"] }) + "\n";
  }

  return { formats, parse, manual, exportNodes };
})();
