import fs from "node:fs";

const DIR = "E:/code/fakao-practice";
const SRC = DIR + "/app.html";                       // 片段：也是发布用的源
const OUT = DIR + "/法考主观题机考模拟.html";          // 可双击打开的完整单文件

const html = fs.readFileSync(SRC, "utf8");

// 片段里 <title> / <link> / <style> 都在 </style> 之前，从这里切开
const cut = html.indexOf("</style>");
if (cut < 0) { console.error("!! 找不到 </style>，源文件结构变了"); process.exit(1); }
const at = cut + "</style>".length;
const head = html.slice(0, at);
const body = html.slice(at);

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect width="64" height="64" rx="13" fill="#B02A22"/>' +
  '<text x="32" y="46" font-size="43" text-anchor="middle" fill="#fff" ' +
  'font-family="Songti SC,SimSun,serif" font-weight="700">法</text></svg>';
const favicon = '<link rel="icon" href="data:image/svg+xml,' + encodeURIComponent(svg) + '">';

const out =
  '<!doctype html>\n' +
  '<html lang="zh-CN">\n' +
  '<head>\n' +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
  '<meta name="color-scheme" content="light dark">\n' +
  favicon + "\n" +
  head + "\n" +
  '</head>\n' +
  '<body>\n' +
  body + "\n" +
  '</body>\n' +
  '</html>\n';

fs.writeFileSync(OUT, out, "utf8");
console.log("已生成 :", OUT);
console.log("字节数 :", Buffer.byteLength(out));
