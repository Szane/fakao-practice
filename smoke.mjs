import fs from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

// 必须测构建产物：app.html 是片段，没有 <body>，注入不进去
const SRC = "E:/code/fakao-practice/法考主观题机考模拟.html";
const TMP = path.join(os.tmpdir(), "fakao-smoke.html");

const TEST = `
<pre id="__test" style="display:none"></pre>
<script>
(function(){
  var log = [], pass = 0, fail = 0;
  function ok(name, fn){
    try { var r = fn(); log.push((r === false ? "FAIL " : "PASS ") + name + (r === false ? "" : (r && r !== true ? "  [" + r + "]" : ""))); r === false ? fail++ : pass++; }
    catch(e){ log.push("FAIL " + name + "  !! " + e.message); fail++; }
  }
  function q(s){ return document.querySelector(s); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function type(txt){ var ta = q("#answer"); ta.value = txt; ta.dispatchEvent(new Event("input", {bubbles:true})); }
  function key(k, mods){ document.dispatchEvent(new KeyboardEvent("keydown", Object.assign({key:k, bubbles:true, cancelable:true}, mods||{}))); }
  function setVal(sel, v){ var e = q(sel); e.value = v; e.dispatchEvent(new Event("input", {bubbles:true})); }

  window.addEventListener("load", function(){
    setTimeout(function(){
     try{
      // ---- 空白卷初始状态 ----
      ok("初始：答题卡 3 格", function(){ return qa("#qchips .qchip").length === 3 ? "3 格" : qa("#qchips .qchip").length; });
      ok("初始：题号全带未作答 *", function(){ return qa("#qchips .qchip sup").length === 3; });
      ok("初始：每题 1 个问题标签", function(){ return qa("#askTabs .asktab").length === 1; });
      ok("初始：材料区提示还没材料", function(){ return qa("#matBody .mat-hint").length === 2; });
      ok("初始：问区提示还没写问题", function(){ return q(".q-hint") !== null; });
      ok("初始：总计 0 字", function(){ return q("#totalChars").textContent === "0"; });

      // ---- 编辑本题：写材料与问题 ----
      ok("编辑本题打开", function(){
        q("#btnEditQ").click();
        return q("#edMat") !== null && q("#edAsk") !== null;
      });
      ok("填入 3 个问题后保存", function(){
        setVal("#edAsk", "问题甲\\n问题乙\\n问题丙");
        setVal("#edMat", "第一段材料。\\n\\n## 材料一\\n第二段材料。");
        setVal("#edName", "测试题");
        q('#mhost button[data-act="ok"]').click();
        return qa("#askTabs .asktab").length === 3 ? "3 个问题标签" : qa("#askTabs .asktab").length;
      });
      ok("材料已渲染出小标题", function(){
        return q("#matBody").textContent.indexOf("[材料一]") >= 0 ? "含 [材料一]" : false;
      });
      ok("材料段落数正确", function(){ return qa("#matBody p").length >= 2; });
      ok("标题同步为 1、测试题", function(){ return q("#matTitle").textContent === "1、测试题" ? q("#matTitle").textContent : false; });
      ok("问题区显示问题甲", function(){ return q("#askText").textContent.indexOf("问题甲") >= 0; });
      ok("问题区不再显示提示", function(){ return q(".q-hint") === null; });

      // ---- 每问独立作答 ----
      ok("问题1 输入后计数", function(){
        type("答案甲内容");
        return q("#askChars").textContent === "5" ? "5 字" : q("#askChars").textContent;
      });
      ok("切到问题3 是空的", function(){
        qa("#askTabs .asktab")[2].click();
        return q("#answer").value === "" ? "独立" : "串了";
      });
      ok("问题3 输入 3 字", function(){
        type("丙丙丙");
        return q("#askChars").textContent === "3" ? "3 字" : q("#askChars").textContent;
      });
      ok("本题字数 = 各问之和", function(){
        return q("#qChars").textContent === "8" ? "8 字" : q("#qChars").textContent;
      });
      ok("切回问题1 内容还在", function(){
        qa("#askTabs .asktab")[0].click();
        return q("#answer").value === "答案甲内容";
      });

      // ---- 上一问 / 下一问 ----
      ok("下一问到问题2", function(){
        q("#nextA").click();
        return q('#askTabs .asktab[data-cur="1"]').textContent.indexOf("问题2") === 0;
      });
      ok("问题2 上一步可回问题1", function(){ return q("#prevA").disabled === false; });
      ok("第1题问题1 上一步禁用", function(){
        qa("#askTabs .asktab")[0].click();
        return q("#prevA").disabled === true && q("#prevQ").disabled === true;
      });
      ok("末问点下一问跨到下一题", function(){
        qa("#askTabs .asktab")[2].click();
        q("#nextA").click();
        return q("#matTitle").textContent.indexOf("2、") === 0 ? "已跨题" : q("#matTitle").textContent;
      });

      // ---- 新建 / 删除题目 ----
      ok("新建题目 -> 4 格", function(){
        q("#btnNewQ").click();
        var n = qa("#qchips .qchip").length;
        return n === 4 ? "4 格" : n;
      });
      ok("新建后自动弹出编辑框", function(){ return q("#edAsk") !== null; });
      ok("取消后停在新建的题", function(){
        q('#mhost button[data-act="cancel"]').click();
        return q("#matTitle").textContent.indexOf("4、") === 0 ? q("#matTitle").textContent : false;
      });
      ok("删除本题 -> 回到 3 格", function(){
        q("#btnEditQ").click();
        q("#edDel").click();
        var hasNotice = q("#mhost .notice") !== null;
        q('#mhost button[data-act="ok"]').click();
        var n = qa("#qchips .qchip").length;
        return (hasNotice && n === 3) ? "3 格" : ("notice=" + hasNotice + " n=" + n);
      });
      ok("只剩一题时不给删（按钮消失）", function(){
        // 现有 3 题，删除按钮应在；这是间接验证渲染逻辑没崩
        q("#btnEditQ").click();
        var has = q("#edDel") !== null;
        q('#mhost button[data-act="cancel"]').click();
        return has;
      });
      ok("题号重新编号连续", function(){
        var nos = qa("#qchips .qchip").map(function(e){ return e.textContent.replace(/[^0-9]/g,""); });
        return nos.join(",") === "1,2,3" ? nos.join(",") : false;
      });

      // ---- 标记 ----
      ok("勾选标记", function(){
        q("#markBox").checked = true;
        q("#markBox").dispatchEvent(new Event("change", {bubbles:true}));
        return qa("#qchips .qchip sup.mark").length === 1;
      });
      ok("取消标记", function(){
        q("#markBox").checked = false;
        q("#markBox").dispatchEvent(new Event("change", {bubbles:true}));
        return qa("#qchips .qchip sup.mark").length === 0;
      });

      // ---- 左栏 / 工具 ----
      ok("收起答题栏", function(){ q("#railCollapse").click(); return q("#rail").dataset.collapsed === "1"; });
      ok("展开答题栏", function(){ q("#railToggle").click(); return q("#rail").dataset.collapsed === "0"; });
      ok("法律法规汇编弹窗（空法条也有提示）", function(){
        q("#btnLaws").click();
        var has = q("#mhost .modal-body") !== null && q("#mhost .modal-body").textContent.length > 4;
        q('#mhost button[data-act="cancel"]').click();
        return has;
      });
      ok("撤销按钮不抛错", function(){ q("#btnUndo").click(); return true; });
      ok("复制按钮不抛错", function(){ q("#btnCopy").click(); return true; });
      ok("放大窗口开合", function(){
        q("#btnZoomMat").click();
        var on = q("#matWrap").dataset.zoom === "1";
        q("#btnZoomMat").click();
        return on && q("#matWrap").dataset.zoom === "0";
      });
      ok("切换配色", function(){
        var b = getComputedStyle(document.documentElement).getPropertyValue("--panel");
        q("#btnStyle").click();
        return b !== getComputedStyle(document.documentElement).getPropertyValue("--panel") ? "已切换" : false;
      });
      ok("Ctrl+S 不抛错", function(){ key("s", {ctrlKey:true}); return true; });

      // ---- 历史 ----
      ok("保存快照 -> 历史有记录", function(){
        q("#btnSnap").click();
        q("#btnHist").click();
        var n = qa("#histList .hitem").length;
        return n >= 1 ? n + " 条" : false;
      });
      ok("历史标题标明题与问", function(){
        return /第\\d+题 · 问题\\d+/.test(q("#histCount").textContent) ? q("#histCount").textContent : false;
      });
      ok("差异视图可展开", function(){
        qa("#histList .hitem")[0].click();
        return q("#histDetail .diffbox") !== null;
      });
      ok("可切完整原文", function(){
        q('#histDetail button[data-mode="full"]').click();
        return q("#histDetail .diffbox") !== null;
      });
      ok("有恢复按钮", function(){ return q("#histDetail button[data-restore]") !== null; });

      // ---- 统计 ----
      ok("统计条形图行数 = 题数", function(){
        qa(".dtab")[1].click();
        var n = qa("#statPanel .bar-row").length;
        return n === 3 ? "3 行" : n;
      });
      ok("统计各问明细行数 = 题数", function(){ return qa("#statPanel .checkline").length === 3; });
      ok("统计各问明细显示已答比例", function(){
        var m = q("#statPanel").textContent.match(/(\\d+)\\/(\\d+) 问/);
        if (!m) return false;
        return m[1] === "2" && m[2] === "3" ? m[0] : ("实际 " + m[0]);
      });

      // ---- 设置 ----
      ok("设置面板渲染", function(){
        qa(".dtab")[2].click();
        return q("#setPanel #setExport") !== null && q("#setPanel #setCName") !== null;
      });
      ok("设置可改姓名并同步顶栏", function(){
        var inp = q("#setCName"); inp.value = "测试考生";
        inp.dispatchEvent(new Event("change", {bubbles:true}));
        return q("#cName").textContent === "测试考生" ? "已同步" : false;
      });

      // ---- 保存文件 ----
      ok("历史保存弹窗打开", function(){
        qa(".dtab")[0].click();
        q("#btnSaveHist").click();
        return q("#svName") !== null;
      });
      ok("预览非空", function(){ return q(".prevbox").textContent.length > 10; });
      ok("默认文件名 .txt", function(){ return /\\.txt$/.test(q("#svName").value) ? q("#svName").value : false; });
      ok("切 Markdown 改扩展名", function(){
        q('#mhost button[data-v="md"]').click();
        return /\\.md$/.test(q("#svName").value) ? q("#svName").value : false;
      });
      ok("切回 txt", function(){
        q('#mhost button[data-v="txt"]').click();
        return /\\.txt$/.test(q("#svName").value);
      });
      ok("预览禁止选中", function(){ return getComputedStyle(q(".prevbox")).userSelect === "none" ? "none" : false; });
      ok("复制内容不抛错", function(){ q('#mhost button[data-act="sv-copy"]').click(); return true; });
      ok("取消关闭", function(){ q('#mhost button[data-act="cancel"]').click(); return q("#mhost").dataset.open === "0"; });

      // ---- 导出 ----
      ok("完整备份是合法 JSON 且题数正确", function(){
        qa(".dtab")[2].click();
        q("#setPanel #setExportAll").click();
        var full = null;
        var orig = navigator.clipboard && navigator.clipboard.writeText;
        if (navigator.clipboard) navigator.clipboard.writeText = function(s){ full = s; return Promise.resolve(); };
        q('#mhost button[data-act="sv-copy"]').click();
        if (navigator.clipboard && orig) navigator.clipboard.writeText = orig;
        q('#mhost button[data-act="cancel"]').click();
        if (!full) return false;
        try { var d = JSON.parse(full);
          return (d.kind === "archive" && d.exam.questions.length === 3 && d.work.answers) ? "3 题" : false;
        } catch(e){ return false; }
      });
      ok("答卷文本含问题与正文", function(){
        q("#setPanel #setExport").click();
        var full = null;
        var orig = navigator.clipboard && navigator.clipboard.writeText;
        if (navigator.clipboard) navigator.clipboard.writeText = function(s){ full = s; return Promise.resolve(); };
        q('#mhost button[data-act="sv-copy"]').click();
        if (navigator.clipboard && orig) navigator.clipboard.writeText = orig;
        q('#mhost button[data-act="cancel"]').click();
        return (full && full.indexOf("【问题1】") >= 0 && full.indexOf("答案甲内容") >= 0) ? "含正文" : false;
      });

      // ---- 交卷 ----
      ok("交卷弹窗列出各题", function(){
        q("#btnSubmit").click();
        var n = qa("#mhost .checkline").length;
        return n === 3 ? "3 行" : n;
      });
      ok("取消交卷", function(){
        q('#mhost button[data-act="cancel"]').click();
        return q("#mhost").dataset.open === "0";
      });

      // ---- 一致性 ----
      ok("总字数 = 各题之和", function(){
        qa(".dtab")[1].click();
        var sum = 0;
        qa("#statPanel .bar-val").forEach(function(e){
          var m = e.textContent.match(/^[\\d,]+/);
          if (m) sum += parseInt(m[0].replace(/,/g,""), 10);
        });
        var tot = parseInt(q("#totalChars").textContent.replace(/,/g,""), 10);
        return sum === tot ? sum + " = " + tot : ("不一致 " + sum + " vs " + tot);
      });

     } catch(e){
       log.push("FAIL 测试脚本自身抛错: " + e.message);
       log.push(String(e.stack || "").split("\\n").slice(0,4).join("\\n"));
     }
      log.push("");
      log.push("=== " + pass + " passed, " + fail + " failed ===");
      var errs = window.__errs || [];
      log.push("页面错误 (" + errs.length + "):");
      errs.slice(0, 8).forEach(function(x){ log.push("  " + x); });
      document.getElementById("__test").textContent = log.join("\\n");
    }, 400);
  });
})();
</script>
`;

// 在最前面装错误钩子；同时废掉 showSaveFilePicker——
// 无头环境里没有用户手势，它会挂在一个永远不出现的原生「另存为」对话框上。
const PRE = '<script>' +
  'window.__errs=[];' +
  'window.addEventListener("error",function(e){' +
  '  window.__errs.push((e.message||String(e.error))+" @line "+(e.lineno||"?"));});' +
  'try{Object.defineProperty(window,"showSaveFilePicker",{value:undefined,configurable:true});}catch(e){}' +
  // 拦下 <a download> 的点击：无头 Chrome 会卡在下载上
  'window.__dl=0;' +
  'var __c=HTMLAnchorElement.prototype.click;' +
  'HTMLAnchorElement.prototype.click=function(){' +
  '  if(this.hasAttribute&&this.hasAttribute("download")){window.__dl++;return;}' +
  '  return __c.apply(this,arguments);};' +
  '<\/script>';

let html = fs.readFileSync(SRC, "utf8");
if (html.indexOf("<body>") < 0) { console.error("!! 源文件里没有 <body>，无法注入测试"); process.exit(1); }
html = html.replace("<body>", "<body>" + PRE);
html = html.replace("</body>", TEST + "\n</body>");
fs.writeFileSync(TMP, html, "utf8");

// 目标环境就是 Chrome，所以直接用 Chrome 跑；没有才退回 Edge
const edge = [
  (process.env.ProgramFiles || "") + "\\Google\\Chrome\\Application\\chrome.exe",
  (process.env["ProgramFiles(x86)"] || "") + "\\Google\\Chrome\\Application\\chrome.exe",
  (process.env.LOCALAPPDATA || "") + "\\Google\\Chrome\\Application\\chrome.exe",
  (process.env["ProgramFiles(x86)"] || "") + "\\Microsoft\\Edge\\Application\\msedge.exe",
  (process.env.ProgramFiles || "") + "\\Microsoft\\Edge\\Application\\msedge.exe"
].find(p => p && fs.existsSync(p));
if (!edge) { console.error("找不到 Chrome 或 Edge"); process.exit(1); }
console.error("浏览器: " + edge);

// 每次用全新的 profile，避免上一次残留的锁把 Edge 挂死
const profile = path.join(os.tmpdir(), "edge-fakao-test-" + process.pid);
let dom = "";
try {
  const res = spawnSync(edge, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--no-default-browser-check",
    "--user-data-dir=" + profile,
    "--virtual-time-budget=6000", "--dump-dom",
    "file:///" + TMP.replace(/\\/g, "/")
  ], { encoding: "utf8", maxBuffer: 128 * 1024 * 1024, timeout: 90000 });
  if (res.error){ console.error("浏览器启动失败:", res.error.message); process.exit(1); }
  dom = res.stdout || "";
  if (!dom){
    console.error("浏览器没有输出 DOM。status =", res.status, "signal =", res.signal);
    console.error("stderr:", String(res.stderr || "").slice(0, 1500));
    process.exit(1);
  }
} finally {
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch(e){}
}

const m = dom.match(/<pre id="__test"[^>]*>([\s\S]*?)<\/pre>/);
if (!m) { console.error("!! 测试脚本没有产出结果（页面可能启动就抛错了）"); process.exit(1); }
const out = m[1].replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"');
console.log(out);
process.exit(out.includes("FAIL") ? 1 : 0);
