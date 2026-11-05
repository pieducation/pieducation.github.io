(function(){
var h=location.hash;if(h.indexOf("#bai-")===0&&location.pathname==="/"){location.replace("/bai/"+h.slice(5)+"/");return}
function toast(m){var t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove()},3000)}
document.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
if(b.hasAttribute("data-reveal")){b.closest(".reveal").classList.add("done");document.querySelector(".sol").classList.add("open")}
if(b.hasAttribute("data-copy")){var u=location.origin+location.pathname;(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){toast("Đã chép link bài.")},function(){window.prompt("Chép link bài:",u)})}
if(b.hasAttribute("data-filter")){var v=b.getAttribute("data-filter"),n=0;document.querySelectorAll("[data-filter]").forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});
document.querySelectorAll(".pcard").forEach(function(c){var s=v==="all"||c.getAttribute("data-level")===v;c.style.display=s?"":"none";if(s)n++});document.querySelector(".plist .empty").hidden=n>0}
});})();