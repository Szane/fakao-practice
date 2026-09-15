import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const chrome = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
].find(p => fs.existsSync(p));

const src = "E:/code/fakao-practice/法考主观题机考模拟.html";
const out = "E:/code/fakao-practice/_shot/mine.png";
fs.mkdirSync(path.dirname(out), { recursive: true });

// 想看「填写后」的样子就传 --seeded：预置一道填好材料与问题的题
const seeded = process.argv.includes("--seeded");

let html = fs.readFileSync(src, "utf8");
if (seeded) {
  const seed = `<script>
try{
  localStorage.setItem("fakao.exam.v2", JSON.stringify({
    meta:{ examName:"主观题练习", candidate:{name:"练习者",sex:"女",no:"88888888",id:"888888888888888888"}, durationMin:240 },
    questions:[
      { id:"q1", no:1, name:"刑法", optional:false, target:1000,
        material:[{t:"2023年3月，甲与乙商议去某小区地下车库“弄辆好车卖钱”。3月15日晚，二人携带水果刀、撬棍进入车库，甲撬开丙的轿车车门，乙在旁望风。正欲驾车离开时被车主丙发现，甲持刀威胁丙“再过来就捅你”，丙因害怕后退，二人遂驾车逃离。经鉴定，该车价值28万元。"}],
        asks:["甲、乙取走轿车的行为构成何罪？请说明理由。","乙的投案行为是否成立自首？甲是否成立自首？"],
        reqs:[], laws:[] },
      { id:"q2", no:2, name:"刑事诉讼法", optional:false, target:800,
        material:[], asks:["侦查机关在讯问程序上存在哪些违法之处？"], reqs:[], laws:[] },
      { id:"q3", no:3, name:"民法", optional:false, target:800,
        material:[], asks:["乙公司是否有权单方提高合同价款？为什么？"], reqs:[], laws:[] }
    ]
  }));
  localStorage.setItem("fakao.work.v2", JSON.stringify({
    answers:{"q1#0":"甲、乙的行为构成抢劫罪。二人以非法占有为目的，携带凶器撬开车门窃取财物，在车主丙发现后为抗拒抓捕当场持刀威胁，符合《刑法》第269条转化型抢劫的构成要件。","q1#1":""},
    marks:{"q1#1":true}, history:{},
    cur:{qid:"q1",ai:0}, elapsedMs:65000, running:false, startedAt:null
  }));
}catch(e){}
<\/script>`;
  html = html.replace("<body>", "<body>" + seed);
}
const tmp = path.join(os.tmpdir(), "fakao-shot.html");
fs.writeFileSync(tmp, html, "utf8");

// 每次全新 profile：复用同一个会因为 localStorage 残留而截到上一次的旧数据
const profile = path.join(os.tmpdir(), "shot-prof-" + process.pid);
let r;
try {
  r = spawnSync(chrome, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
    "--user-data-dir=" + profile,
    "--window-size=1500,940",
    "--virtual-time-budget=5000",
    "--screenshot=" + out,
    "file:///" + tmp.replace(/\\/g, "/")
  ], { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "ignore"] });
} finally {
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch(e){}
}

console.log("status:", r.status, "err:", r.error ? r.error.code : "-", "exists:", fs.existsSync(out));
