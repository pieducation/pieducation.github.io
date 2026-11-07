#!/usr/bin/env node
/* Dựng web tĩnh PiEducation từ trang tính công khai. Chạy trong GitHub Actions.
   Cách dùng: NODE_PATH=... node build-web.js <file-csv> */
"use strict";
var fs=require("fs"),path=require("path"),crypto=require("crypto");
var window={katex:require("katex")};
var ROOT=__dirname;
var LEVELS={thcs:"THCS",thpt:"THPT",olympic:"Olympic",chuyende:"Chuyên đề"};
var WD=["Chủ nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"];
var WEB_ICON="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2032%2032%22%3E%3Crect%20width%3D%2232%22%20height%3D%2232%22%20rx%3D%227%22%20fill%3D%22%234a2ea3%22%2F%3E%3Ctext%20x%3D%2216%22%20y%3D%2224%22%20font-size%3D%2222%22%20text-anchor%3D%22middle%22%20fill%3D%22%23fff%22%20font-family%3D%22serif%22%3E%E2%88%91%3C%2Ftext%3E%3C%2Fsvg%3E";
var CFG={};
function cfg(){return CFG}
function webBase(){var u=(cfg().publicUrl||"").trim().replace(/#.*$/,"").replace(/\/+$/,"");if(!u)return"https://pieducation.github.io";return /^https?:\/\//.test(u)?u:"https://"+u}
function sortPosts(a){return a.slice().sort(function(x,y){return (y.date||"").localeCompare(x.date||"")||(y.updatedAt||"").localeCompare(x.updatedAt||"")})}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}

function fmtDate(s){if(!s)return"";var p=s.split("-");var d=new Date(+p[0],+p[1]-1,+p[2]);return WD[d.getDay()]+", "+p[2]+"/"+p[1]+"/"+p[0]}

function texOut(t,display){
  if(window.katex){try{return window.katex.renderToString(t,{displayMode:display,throwOnError:false,strict:"ignore"})}catch(e){}}
  return '<code class="tex">'+esc(t)+"</code>";
}
/* Markdown nhỏ + LaTeX: $...$, $$...$$, \( \), \[ \], **đậm**, *nghiêng*, ### mục, - danh sách, 1. danh sách, > khung */
function md(src){
  if(!src)return"";
  var M=[],D=[];
  function put(t,d){M.push(texOut(t.trim(),d));D.push(d);return"\u0001"+(M.length-1)+"\u0002"}
  var s=String(src).replace(/\r/g,"");
  s=s.replace(/\$\$([\s\S]+?)\$\$/g,function(_,t){return put(t,true)})
     .replace(/\\\[([\s\S]+?)\\\]/g,function(_,t){return put(t,true)})
     .replace(/\\\(([\s\S]+?)\\\)/g,function(_,t){return put(t,false)})
     .replace(/\$([^$\n]+?)\$/g,function(_,t){return put(t,false)});
  s=esc(s);
  function inl(x){return x.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+?)\*/g,"$1<em>$2</em>")}
  var out="",para=[],list=null,quote=[];
  function fp(){if(para.length){out+="<p>"+para.map(inl).join("<br>")+"</p>";para=[]}}
  function fl(){if(list){out+="<"+list.t+">"+list.items.map(function(i){return"<li>"+inl(i)+"</li>"}).join("")+"</"+list.t+">";list=null}}
  function fq(){if(quote.length){out+="<blockquote>"+quote.map(function(q){return"<p>"+inl(q)+"</p>"}).join("")+"</blockquote>";quote=[]}}
  function fa(){fp();fl();fq()}
  s.split("\n").forEach(function(line){
    var m;
    if(!line.trim()){fa();return}
    if((m=line.match(/^(#{2,4})\s+(.*)$/))){fa();var h=Math.min(m[1].length+1,5);out+="<h"+h+' class="md-h">'+inl(m[2])+"</h"+h+">";return}
    if((m=line.match(/^\s*[-•]\s+(.*)$/))){fp();fq();if(!list||list.t!=="ul"){fl();list={t:"ul",items:[]}}list.items.push(m[1]);return}
    if((m=line.match(/^\s*\d+[.)]\s+(.*)$/))){fp();fq();if(!list||list.t!=="ol"){fl();list={t:"ol",items:[]}}list.items.push(m[1]);return}
    if((m=line.match(/^&gt;\s?(.*)$/))){fp();fl();quote.push(m[1]);return}
    if((m=line.trim().match(/^\u0001(\d+)\u0002$/))&&D[+m[1]]){fa();out+='<div class="math-block">'+line.trim()+"</div>";return}
    if(list&&/^\s{2,}/.test(line)){list.items[list.items.length-1]+=" "+line.trim();return}
    fl();fq();para.push(line);
  });
  fa();
  return out.replace(/\u0001(\d+)\u0002/g,function(_,i){return M[+i]});
}
function plain(src){
  var map={"\\le":"≤","\\leq":"≤","\\ge":"≥","\\geq":"≥","\\ne":"≠","\\neq":"≠","\\cdot":"·","\\times":"×","\\pi":"π","\\infty":"∞","\\mid":"|","\\iff":"⇔","\\Rightarrow":"⇒","\\alpha":"α","\\beta":"β","\\in":"∈","\\sqrt":"√","\\dots":"…","\\ldots":"…","\\quad":" "};
  return String(src||"").replace(/\$\$?([^$]+)\$\$?/g,function(_,t){
    return t.replace(/\\[dt]?frac\s*(\{[^{}]*\}|[^\s{}])\s*(\{[^{}]*\}|[^\s{}])/g,"$1/$2").replace(/\\[a-zA-Z]+/g,function(c){return map[c]!=null?map[c]:""}).replace(/[{}]/g,"").replace(/\^2/g,"²").replace(/\^3/g,"³").replace(/\s+/g," ").trim();
  }).replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/^#+\s*/gm,"").replace(/^>\s?/gm,"");
}

function webDesc(s){s=plain(s||"").replace(/\s+/g," ").trim();if(s.length<=187)return s;s=s.slice(0,187);var i=s.lastIndexOf(" ");return(i>120?s.slice(0,i):s)+"…"}
function webHead(o){
  var c=cfg();
  return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>'+esc(o.title)+'</title><meta name="description" content="'+esc(o.desc)+'">'+(o.noindex?'<meta name="robots" content="noindex">':"")+'<link rel="canonical" href="'+o.url+'"><meta property="og:site_name" content="'+esc(c.siteName)+'"><meta property="og:locale" content="vi_VN"><meta property="og:type" content="'+o.type+'"><meta property="og:title" content="'+esc(o.ogTitle)+'"><meta property="og:description" content="'+esc(o.desc)+'"><meta property="og:url" content="'+o.url+'"><meta property="og:image" content="'+o.image+'"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">'+(o.time?'<meta property="article:published_time" content="'+esc(o.time)+'">':"")+'<link rel="icon" href="'+WEB_ICON+'"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap"><link rel="stylesheet" href="/assets/katex.css"><link rel="stylesheet" href="/assets/site.css"><script>document.documentElement.className="js"<\/script>'+(o.ld||"")+"</head>";
}
function webShell(main){
  var c=cfg();
  return '<body><header class="top"><div class="wrap"><a class="brand" href="/"><span class="brand-mark">∑</span><span class="brand-name">'+esc(c.siteName)+'</span></a></div></header><main class="wrap narrow">'+main+'</main><footer class="site-foot"><div class="wrap narrow">© '+esc(c.siteName)+(c.tagline?" · "+esc(c.tagline):"")+'</div></footer><script src="/assets/site.js" defer><\/script></body></html>';
}
function webPostPage(p){
  var c=cfg(),b=webBase(),url=b+"/bai/"+p.id+"/",img=b+"/og/"+p.id+".png",lv=LEVELS[p.level]||"",desc=webDesc(p.intro||p.problem);
  var ld=JSON.stringify({"@context":"https://schema.org","@type":"Article","headline":p.title,"datePublished":p.date,"dateModified":p.updatedAt,"inLanguage":"vi","url":url,"image":img,"author":{"@type":"Person","name":"Thầy Hoàng Đức Trường"},"publisher":{"@type":"Organization","name":c.siteName}}).replace(/</g,"\\u003c");
  var h='<article class="post"><a class="back" href="/">← Tất cả bài</a><div class="post-meta">'+(lv?'<span class="chip">'+lv+"</span>":"")+'<time datetime="'+esc(p.date)+'">'+esc(fmtDate(p.date))+"</time></div>";
  h+='<h1 class="post-title">'+esc(p.title)+"</h1>";
  if(p.source)h+='<p class="post-src">Nguồn: '+esc(p.source).replace(/https?:\/\/[^\s<]+/g,function(u){return'<a href="'+u+'" rel="nofollow noopener" target="_blank">'+u+"</a>"})+"</p>";
  if(p.intro)h+='<div class="prose post-intro">'+md(p.intro)+"</div>";
  if(p.problem)h+='<section class="blk blk-problem"><h2 class="blk-label">Đề bài</h2><div class="prose">'+md(p.problem)+"</div></section>";
  if(p.solution||p.commentary){
    h+='<div class="reveal"><p>Các em thử tự làm trước nhé. Bí quá thì mới mở lời giải.</p><button class="btn primary" type="button" data-reveal>Xem lời giải và bình luận</button></div><div class="sol">';
    if(p.solution)h+='<section class="blk blk-solution"><h2 class="blk-label">Lời giải</h2><div class="prose">'+md(p.solution)+"</div></section>";
    if(p.commentary)h+='<section class="blk blk-comment"><h2 class="blk-label">Bình luận của thầy</h2><div class="prose">'+md(p.commentary)+"</div></section>";
    h+="</div>";
  }
  if(p.tags)h+='<div class="tags">'+esc(p.tags)+"</div>";
  h+='<div class="share"><button class="btn sm" type="button" data-copy>Chép link bài này</button></div></article>';
  return webHead({title:p.title+" | "+c.siteName,desc:desc,url:url,image:img,type:"article",ogTitle:p.title,time:p.date,ld:'<script type="application/ld+json">'+ld+"<\/script>"})+webShell(h);
}
function webGonePage(id){
  var c=cfg(),b=webBase();
  return webHead({title:"Bài đã được gỡ | "+c.siteName,desc:"Bài này đã được gỡ.",url:b+"/bai/"+id+"/",image:b+"/og/home.png",type:"website",ogTitle:"Bài đã được gỡ | "+c.siteName,noindex:true})+webShell('<div class="post"><a class="back" href="/">← Tất cả bài</a><div class="empty">Không tìm thấy bài này. Có thể bài đã được gỡ.</div></div>');
}
function webIndex(pubs){
  var c=cfg(),b=webBase();
  var f='<div class="filters" role="group" aria-label="Lọc theo cấp">'+[["all","Tất cả"]].concat(Object.keys(LEVELS).map(function(k){return[k,LEVELS[k]]})).map(function(x,i){return'<button type="button" data-filter="'+x[0]+'" aria-pressed="'+(i===0)+'">'+x[1]+"</button>"}).join("")+"</div>";
  var items=pubs.map(function(p){var d=(p.date||"").split("-");
    return '<a class="pcard" data-level="'+esc(p.level)+'" href="/bai/'+esc(p.id)+'/"><div class="pdate"><div class="d">'+(d[2]||"")+'</div><div class="m">tháng '+(+d[1]||"")+"/"+(d[0]||"")+'</div></div><div><span class="chip">'+(LEVELS[p.level]||"")+"</span><h2>"+esc(p.title)+"</h2><p>"+esc(plain(p.intro||p.problem||""))+"</p></div></a>"}).join("");
  return webHead({title:c.siteName+" | Mỗi ngày một bài toán hay",desc:c.tagline,url:b+"/",image:b+"/og/home.png",type:"website",ogTitle:c.siteName})+webShell('<section class="hero"><h1>'+esc(c.siteName)+"</h1>"+(c.tagline?"<p>"+esc(c.tagline)+"</p>":"")+"</section>"+f+'<div class="plist">'+items+'<div class="empty" hidden>Chưa có bài nào ở mục này.</div></div>');
}
function web404(){
  var c=cfg(),b=webBase();
  return webHead({title:"Không tìm thấy trang | "+c.siteName,desc:"Không tìm thấy trang này.",url:b+"/404.html",image:b+"/og/home.png",type:"website",ogTitle:"Không tìm thấy trang | "+c.siteName})+webShell('<div class="post"><a class="back" href="/">← Tất cả bài</a><div class="empty">Không tìm thấy bài này. Có thể bài đã được gỡ.</div></div>');
}
function webSitemap(pubs){
  var b=webBase();
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>'+b+"/</loc></url>\n"+pubs.map(function(p){return"<url><loc>"+b+"/bai/"+esc(p.id)+"/</loc><lastmod>"+esc(p.date)+"</lastmod></url>\n"}).join("")+"</urlset>\n";
}

/* ---------- đọc CSV xuất từ trang tính ---------- */
function parseCsv(t){
  var rows=[],row=[],cur="",q=false,i=0,n=t.length;
  for(;i<n;i++){var c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
    else if(c==='"')q=true;
    else if(c===","){row.push(cur);cur=""}
    else if(c==="\n"){row.push(cur);rows.push(row);row=[];cur=""}
    else if(c!=="\r")cur+=c;
  }
  if(cur||row.length){row.push(cur);rows.push(row)}
  return rows;
}
function cellsJson(r){return JSON.parse(r.slice(1).filter(function(c){return c&&c[0]==="|"}).map(function(c){return c.slice(1)}).join(""))}
function load(file){
  var txt=fs.readFileSync(file,"utf8");
  if(/^\s*<(!doctype|html)/i.test(txt))throw new Error("Trang tính trả về HTML, có thể chưa chia sẻ công khai.");
  var rows=parseCsv(txt),meta=null,posts=[];
  rows.forEach(function(r){
    if(r[0]==="meta")meta=cellsJson(r);
    else if(r[0]&&r[0].indexOf("p:")===0)posts.push(cellsJson(r));
  });
  if(!meta||!meta.config)throw new Error("Thiếu dòng meta trong trang tính.");
  return{meta:meta,posts:posts};
}

/* ---------- ảnh xem trước ---------- */
function ogHtml(p){
  var c=cfg(),t=p.title||"",size=t.length<=62?68:t.length<=100?58:t.length<=150?48:40;
  var css=fs.readFileSync(path.join(ROOT,"assets/site.css"),"utf8").match(/@font-face\s*\{[^}]*Lora Inline[^}]*\}/g)||[];
  return '<!doctype html><html><head><meta charset="utf-8"><style>'+css.join("\n")+"html,body{margin:0;padding:0}</style></head><body><div style=\"box-sizing:border-box;width:1200px;height:630px;display:flex;flex-direction:column;justify-content:space-between;padding:64px 72px 62px;border-top:14px solid #4a2ea3;background-color:#fff;background-image:linear-gradient(#e4e9f5 1px,transparent 1px),linear-gradient(90deg,#e4e9f5 1px,transparent 1px);background-size:30px 30px;font-family:Helvetica,Arial,'Liberation Sans',sans-serif\"><div style=\"display:flex;align-items:center;gap:16px\"><span style=\"width:56px;height:56px;border-radius:12px;background:#4a2ea3;color:#fff;display:flex;align-items:center;justify-content:center;font:400 40px/1 serif\">∑</span><span style=\"font-size:35px;font-weight:700;color:#4a2ea3\">"+esc(c.siteName)+"</span></div><div style=\"font-family:'Lora Inline',Georgia,serif;font-weight:700;font-size:"+size+"px;line-height:1.16;color:#1b1a2b\">"+esc(t)+'</div><div style="font-size:29px;color:#5d5b70">'+esc((LEVELS[p.level]||"")+" · "+fmtDate(p.date))+"</div></div></body></html>";
}
function ogKey(p){return crypto.createHash("sha256").update(JSON.stringify([cfg().siteName,p.title,p.level,p.date])).digest("hex")}

/* ---------- ghi file ---------- */
function put(rel,data){var f=path.join(ROOT,rel);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,data)}
async function main(){
  var d=load(process.argv[2]);
  CFG=d.meta.config;
  if(d.posts.length!==d.meta.count){console.log("Trang tính đang ghi dở ("+d.posts.length+"/"+d.meta.count+" bài), để lần chạy sau.");process.exitCode=3;return}
  if(!d.posts.length)throw new Error("Trang tính không có bài nào, dừng để tránh xóa nhầm web.");
  var pubs=sortPosts(d.posts),keep={};
  pubs.forEach(function(p){if(!/^[a-z0-9][a-z0-9-]*$/i.test(p.id))throw new Error("Mã bài không hợp lệ: "+p.id);keep[p.id]=1});
  put("index.html",webIndex(pubs));put("404.html",web404());put("sitemap.xml",webSitemap(pubs));
  put("robots.txt","User-agent: *\nAllow: /\nSitemap: "+webBase()+"/sitemap.xml\n");
  pubs.forEach(function(p){put("bai/"+p.id+"/index.html",webPostPage(p))});
  var baiDir=path.join(ROOT,"bai");
  fs.readdirSync(baiDir).forEach(function(n){if(!keep[n]){fs.rmSync(path.join(baiDir,n),{recursive:true,force:true});console.log("Gỡ bài:",n)}});
  var ogDir=path.join(ROOT,"og");
  fs.readdirSync(ogDir).forEach(function(n){var id=n.replace(/\.png$/,"");if(n!=="home.png"&&!keep[id])fs.rmSync(path.join(ogDir,n),{force:true})});
  var stFile=path.join(ROOT,"_build/og-state.json"),st={};fs.mkdirSync(path.dirname(stFile),{recursive:true});
  try{st=JSON.parse(fs.readFileSync(stFile,"utf8"))}catch(e){}
  var todo=pubs.filter(function(p){return st[p.id]!==ogKey(p)||!fs.existsSync(path.join(ogDir,p.id+".png"))});
  if(todo.length){
    var pw=require("playwright-core");
    var b=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",args:["--no-sandbox"]});
    var pg=await b.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
    for(var i=0;i<todo.length;i++){
      await pg.setContent(ogHtml(todo[i]),{waitUntil:"load"});
      await pg.evaluate(function(){return document.fonts.ready.then(function(){return document.fonts.load("700 40px 'Lora Inline'")})});
      put("og/"+todo[i].id+".png",await pg.screenshot({type:"png",clip:{x:0,y:0,width:1200,height:630}}));
    }
    await b.close();
  }
  var ns={};pubs.forEach(function(p){ns[p.id]=ogKey(p)});
  fs.writeFileSync(stFile,JSON.stringify(ns,null,0)+"\n");
  console.log("Đã dựng "+pubs.length+" bài, tạo "+todo.length+" ảnh xem trước.");
}
/* ===== Hình minh họa (thêm 07/11/2026) =====
   Dòng [[hinh:khoa]] trong bài sẽ được thay bằng hình p.figures[khoa] = {svg, caption}.
   Đoạn này phải nằm NGAY TRÊN dòng cuối cùng: main().catch(...) */
var FIG_CUR=null,md_goc=md,webPostPage_goc=webPostPage;
function figSvg(s){return String(s||"").replace(/<script[\s\S]*?<\/script>/gi,"").replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi,"").replace(/javascript:/gi,"").replace(/<svg\b/i,'<svg style="display:block;width:100%;max-width:480px;height:auto;margin:0 auto;border:1px solid #e2e0ec;border-radius:12px;background:#fff"')}
md=function(src){
  if(!src)return"";
  var figs=FIG_CUR,F=[];
  src=String(src).replace(/\r/g,"").replace(/^[ \t]*\[\[hinh:([\w-]+)\]\][ \t]*$/gm,function(_,k){var g=figs&&figs[k];if(!g||!g.svg)return"";F.push(g);return"\n\u0003"+(F.length-1)+"\u0004\n"});
  return md_goc(src).replace(/<p>\u0003(\d+)\u0004<\/p>/g,function(_,i){
    var g=F[+i],cap=g.caption?md_goc(g.caption).replace(/^<p>/,"").replace(/<\/p>$/,""):"";
    return '<figure class="md-fig" style="margin:1.1em 0;text-align:center">'+figSvg(g.svg)+(cap?'<figcaption style="font-size:.85em;line-height:1.5;opacity:.8;max-width:480px;margin:.55em auto 0">'+cap+"</figcaption>":"")+"</figure>";
  });
};
webPostPage=function(p){FIG_CUR=(p&&p.figures)||null;try{return webPostPage_goc(p)}finally{FIG_CUR=null}};
/* ===== hết phần hình minh họa ===== */
main().catch(function(e){console.error(e.message||e);process.exit(1)});
