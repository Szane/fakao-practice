import fs from "node:fs";
import vm from "node:vm";

const P = "E:/code/fakao-practice/app.html";
const html = fs.readFileSync(P, "utf8");

// 抽出 <script> 块做真正的语法检查
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error("!! 找不到 <script> 块"); process.exit(1); }
const js = m[1];

try {
  new vm.Script(js, { filename: "app.html<script>" });
  console.log("语法检查            : OK  (" + js.split("\n").length + " 行 JS)");
} catch (e) {
  console.error("!! 语法错误:", e.message);
  process.exit(1);
}

// 所有 function 声明
const declared = new Set();
for (const mm of js.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) declared.add(mm[1]);
for (const mm of js.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) declared.add(mm[1]);

// 检查调用了但从未声明的函数名（粗筛，只看明显的）
const called = new Set();
for (const mm of js.matchAll(/(?:^|[^.\w$])([a-z][A-Za-z0-9_$]*)\s*\(/g)) called.add(mm[1]);
const builtins = new Set(["if","for","while","switch","catch","return","typeof","function","new","do","else","try","of","in","case","throw","delete","void","await","yield","super","import","export"]);
const missing = [...called].filter(n => !declared.has(n) && !builtins.has(n))
  .filter(n => js.includes("function " + n) || js.includes(n + "(") )
  .filter(n => new RegExp("(?<![.\\w$])" + n + "\\s*\\(").test(js));
const trulyMissing = missing.filter(n => !declared.has(n));

// 只报告那些"看起来像本项目函数"却查无定义的
const suspect = trulyMissing.filter(n => /^(build|render|open|close|save|snap|count|fmt|diff|parse|apply|switch|do|show|copy|bind|write|quick|file|sv|hist|timer|total|update|modal|default|prune|sanitize|blob|esc|num|clamp)/.test(n));
console.log("可疑的未定义调用    :", suspect.length ? suspect.join(", ") : "无");

// 检查 HTML 里引用的 id 是否都存在
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]));
const used = new Set([...js.matchAll(/\$\("#([A-Za-z][\w-]*)"\)/g)].map(x => x[1]));
const dyn = new Set(["copyArea","svName","impArea","impGo","rwGo","raGo","edName","edTarget","edMat","edAsk","edLaws","setFileTarget"]);
const missingIds = [...used].filter(i => !ids.has(i) && !dyn.has(i));
console.log("JS 引用但不存在的 id:", missingIds.length ? missingIds.join(", ") : "无");

// 检查 addEventListener 绑定的 id
const bound = new Set([...js.matchAll(/addEventListener[\s\S]{0,40}?\$\("#([A-Za-z][\w-]*)"\)/g)].map(x => x[1]));
const bound2 = new Set([...js.matchAll(/\$\("#([A-Za-z][\w-]*)"\)\.addEventListener/g)].map(x => x[1]));
const allBound = new Set([...bound, ...bound2]);
const badBind = [...allBound].filter(i => !ids.has(i));
console.log("绑定事件但无此 id  :", badBind.length ? badBind.join(", ") : "无");

console.log("字节数              :", Buffer.byteLength(html));
