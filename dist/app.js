"use strict";
const iconPaths = {
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  switch: '<path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  shield: '<path d="M12 22s7-3 7-10V5l-7-3-7 3v7c0 7 7 10 7 10Z"/><path d="m9 12 2 2 4-4"/>',
  input: '<path d="M12 3v12m-4-4 4 4 4-4M4 14v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  file: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>',
  link: '<path d="M10 13a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-2 2m2 6a4 4 0 0 0-6 0l-4 4a4 4 0 0 0 6 6l2-2"/>',
  edit: '<path d="m14 6 4 4M4 20l5-1L20 8l-4-4L5 15l-1 5Z"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 5V4H4v12h1"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
};
document.querySelectorAll("[data-icon]").forEach((element) => {
  element.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + iconPaths[element.dataset.icon] + "</svg>";
});

const get = (id) => document.getElementById(id);
const form = get("form");
const links = get("links");
const protocol = get("protocol");
const format = get("format");
const errorBox = get("error");
const preview = get("preview");
const result = get("result");
let mode = "link";
let manualDraft = {};
let output = null;
const example = "vless://b654996d-ad2b-4938-9c2d-f5f25be456d0@node.example.com:443?security=tls&type=tcp&sni=node.example.com#示例%20VLESS\n"
  + "hysteria2://demo-password@hy.example.com:443?sni=hy.example.com#示例%20Hysteria2";

function invalidate() {
  output = null;
  preview.textContent = "";
  preview.hidden = true;
  get("empty").hidden = false;
  get("copy").disabled = true;
  get("download").disabled = true;
  result.textContent = "";
  errorBox.hidden = true;
  errorBox.textContent = "";
}

function updateFormat() {
  const target = NodeStudio.formats[format.value];
  get("extension").textContent = target.extension.toUpperCase();
  get("compatibility").textContent = target.hint;
}

function addField(name, labelText, setting = {}) {
  const field = document.createElement("div");
  field.className = "field";
  const id = "manual-" + name;
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText;
  const input = document.createElement(setting.options ? "select" : "input");
  input.id = id;
  input.name = name;
  if (setting.options) {
    for (const [value, text] of setting.options) input.add(new Option(text, value));
  } else {
    input.type = setting.type ?? "text";
    input.spellcheck = false;
    input.placeholder = setting.placeholder ?? "";
    if (name === "port") input.inputMode = "numeric";
  }
  input.value = manualDraft[name] ?? setting.value ?? "";
  if (setting.options && input.selectedIndex === -1) input.selectedIndex = 0;
  field.append(label, input);
  get("manualFields").append(field);
}

function renderManual() {
  get("manualFields").replaceChildren();
  const hy2 = protocol.value === "hy2";
  const isReality = ["reality", "xr"].includes(protocol.value);
  addField("name", "节点名称（可选）", { placeholder: "我的节点" });
  addField("host", "服务器地址", { placeholder: "node.example.com" });
  addField("port", "服务器端口", { value: "443" });
  addField("auth", hy2 ? "认证密码" : "UUID", hy2 ? { type: "password" } : { placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" });
  addField("sni", isReality ? "SNI" : "SNI（可选）", { placeholder: "example.com" });
  if (hy2) {
    addField("obfs", "混淆类型", { options: [["", "无"], ["salamander", "Salamander"], ["gecko", "Gecko"]] });
    if (manualDraft.obfs) addField("obfs-password", "混淆密码", { type: "password" });
    addField("pinSHA256", "证书 SHA-256 指纹（可选）");
    return;
  }
  if (isReality) {
    addField("pbk", "REALITY 公钥");
    addField("sid", "Short ID（可选）");
  }
  addField("fp", "TLS 指纹（可选）", { placeholder: "chrome" });
  const network = protocol.value === "xr" ? "xhttp" : manualDraft.network || "raw";
  if (protocol.value !== "xr") {
    const networks = [["raw", "RAW / TCP"], ["grpc", "gRPC"]];
    if (!isReality) networks.push(["ws", "WebSocket"], ["xhttp", "XHTTP"]);
    addField("network", "传输方式", { options: networks });
  }
  if (network === "raw") addField("flow", "流控", { options: [["", "无"], ["xtls-rprx-vision", "XTLS Vision"]] });
  if (["ws", "xhttp"].includes(network)) {
    addField("httpHost", "HTTP Host（可选）", { placeholder: "example.com" });
    addField("path", "请求路径（可选）", { placeholder: "/" });
  }
  if (network === "xhttp") addField("mode", "XHTTP 模式", { options: [["auto", "自动"], ["packet-up", "packet-up"], ["stream-up", "stream-up"], ["stream-one", "stream-one"]] });
  if (network === "grpc") {
    addField("serviceName", "gRPC 服务名（可选）");
    addField("authority", "gRPC Authority（可选）");
  }
}

function setMode(next) {
  if (mode !== next) invalidate();
  mode = next;
  get("linkPanel").hidden = mode !== "link";
  get("manualPanel").hidden = mode !== "manual";
  get("linkTab").setAttribute("aria-pressed", mode === "link");
  get("manualTab").setAttribute("aria-pressed", mode === "manual");
}

function setProtocol(next) {
  if ((protocol.dataset.previous === "hy2") !== (next === "hy2")) delete manualDraft.auth;
  delete manualDraft.network;
  delete manualDraft.flow;
  protocol.value = next;
  protocol.dataset.previous = next;
  invalidate();
  renderManual();
}

get("linkTab").addEventListener("click", () => setMode("link"));
get("manualTab").addEventListener("click", () => setMode("manual"));
protocol.addEventListener("change", () => setProtocol(protocol.value));
get("manualFields").addEventListener("input", (event) => {
  manualDraft[event.target.name] = event.target.value;
  invalidate();
});
get("manualFields").addEventListener("change", (event) => {
  if (["network", "obfs"].includes(event.target.name)) {
    if (event.target.name === "network") delete manualDraft.flow;
    renderManual();
    get("manual-" + event.target.name).focus();
  }
});
document.querySelectorAll("[data-protocol]").forEach((button) => button.addEventListener("click", () => {
  setMode("manual");
  setProtocol(button.dataset.protocol);
  protocol.focus();
}));
document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach((item) => item.classList.toggle("current", item === link));
}));
links.addEventListener("input", invalidate);
format.addEventListener("change", () => { invalidate(); updateFormat(); });
get("example").addEventListener("click", () => {
  invalidate();
  links.value = example;
  links.focus();
});
get("clear").addEventListener("click", () => {
  invalidate();
  if (mode === "link") {
    links.value = "";
    links.focus();
  } else {
    manualDraft = {};
    renderManual();
    get("manual-host").focus();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  invalidate();
  try {
    let nodes;
    if (mode === "manual") {
      const data = Object.fromEntries(new FormData(form));
      nodes = [NodeStudio.manual({ ...data, server: data.host, host: data.httpHost })];
    } else {
      const lines = links.value.split(/\r?\n/).map((line, index) => ({ value: line.trim(), number: index + 1 })).filter((line) => line.value);
      if (lines.length > 100) throw new Error("每次最多转换 100 条节点链接。");
      nodes = lines.map((line) => {
        try {
          return NodeStudio.parse(line.value);
        } catch (error) {
          throw new Error("第 " + line.number + " 行：" + (error instanceof URIError ? "链接包含无效的百分号编码。" : error.message));
        }
      });
    }
    const value = NodeStudio.exportNodes(nodes, format.value);
    output = { value, ...NodeStudio.formats[format.value] };
    preview.textContent = value;
    preview.scrollTop = 0;
    preview.hidden = false;
    get("empty").hidden = true;
    get("copy").disabled = false;
    get("download").disabled = false;
    result.textContent = "已生成 " + nodes.length + " 个节点 · " + output.file
      + (format.value === "xray" && nodes.length > 1 ? " · SOCKS 端口 10808–" + (10807 + nodes.length) : "");
    if (nodes.some(({ p }) => ["1", "true"].includes(p.insecure ?? p.allowInsecure))) {
      result.textContent += " · 输入包含跳过证书校验的设置";
    }
  } catch (error) {
    errorBox.textContent = error instanceof URIError ? "输入含有无效编码。" : error.message;
    errorBox.hidden = false;
  }
});

get("download").addEventListener("click", () => {
  if (!output) return;
  const blob = new Blob([output.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = output.file;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
get("copy").addEventListener("click", async () => {
  if (!output) return;
  const current = output;
  try {
    await navigator.clipboard.writeText(current.value);
    if (output === current) result.textContent = "已复制配置";
  } catch {
    if (output === current) {
      preview.focus();
      const range = document.createRange();
      range.selectNodeContents(preview);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      result.textContent = "配置已选中，请按系统复制快捷键。";
    }
  }
});

protocol.dataset.previous = protocol.value;
renderManual();
updateFormat();
