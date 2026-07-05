/* NewsDay — логика прототипа */
const $ = s => document.querySelector(s);
const state = {
  lang: localStorage.getItem("nd_lang") || "ru",
  cat: "all",
  district: "all",
  query: "",
  showBookmarks: false,
  bookmarks: JSON.parse(localStorage.getItem("nd_bk") || "[]"),
};

function t(key, ...a){ const v = I18N[state.lang][key]; return typeof v === "function" ? v(...a) : v; }
function loc(o){ return o[state.lang] || o.ru; }
function timeAgo(min){
  const map = { uz:["daqiqa oldin","soat oldin","kun oldin"], uzc:["дақиқа олдин","соат олдин","кун олдин"],
                ru:["мин назад","ч назад","дн назад"], en:["min ago","h ago","d ago"] }[state.lang];
  if(min < 60) return `${min} ${map[0]}`;
  if(min < 1440) return `${Math.round(min/60)} ${map[1]}`;
  return `${Math.round(min/1440)} ${map[2]}`;
}

/* ---------- render controls ---------- */
function renderLangButtons(){
  document.querySelectorAll("#lang button").forEach(b=>{
    b.classList.toggle("active", b.dataset.l === state.lang);
    b.onclick = ()=>{ state.lang = b.dataset.l; localStorage.setItem("nd_lang", state.lang); renderAll(); };
  });
}

function renderCats(){
  const el = $("#cats"); el.innerHTML = "";
  CATEGORIES.forEach(c=>{
    const b = document.createElement("button");
    b.className = "chip" + (state.cat===c.id ? " active":"");
    b.innerHTML = (c.id!=="all" ? `<span class="dot" style="background:${c.color}"></span>`:"") + loc(c);
    b.onclick = ()=>{ state.cat = c.id; state.showBookmarks=false; renderAll(); };
    el.appendChild(b);
  });
}

function renderDistrict(){
  const sel = $("#district"); sel.innerHTML = "";
  const optAll = new Option(t("all"), "all", state.district==="all", state.district==="all");
  sel.add(optAll);
  DISTRICTS.forEach(d=> sel.add(new Option(loc(d), d.id, false, state.district===d.id)));
  sel.onchange = ()=>{ state.district = sel.value; renderAll(); };
  $("#districtLabel").textContent = t("district");
}

/* ---------- filtering ---------- */
function filtered(){
  let list = NEWS.slice();
  if(state.showBookmarks) list = list.filter(n=> state.bookmarks.includes(n.id));
  if(state.cat!=="all") list = list.filter(n=> n.cat===state.cat);
  if(state.district!=="all") list = list.filter(n=> n.district===state.district);
  if(state.query){
    const q = state.query.toLowerCase();
    list = list.filter(n=> loc(n.t).toLowerCase().includes(q) || loc(n.l).toLowerCase().includes(q));
  }
  return list.sort((a,b)=> (b.breaking?1:0)-(a.breaking?1:0) || a.time-b.time);
}

/* ---------- render feed ---------- */
function renderFeed(){
  const feed = $("#feed"); feed.innerHTML = "";
  const list = filtered();
  $("#count").textContent = t("count", list.length);
  if(!list.length){
    feed.innerHTML = `<div class="empty"><div class="ee">${state.showBookmarks?"🔖":"🔍"}</div>${state.showBookmarks?t("emptyBk"):t("empty")}</div>`;
    return;
  }
  list.forEach(n=>{
    const c = CAT_LABEL[n.cat], d = DIST_LABEL[n.district];
    const card = document.createElement("article");
    card.className = "card";
    const on = state.bookmarks.includes(n.id);
    card.innerHTML = `
      <div class="thumb" style="background-image:url('${n.img}')">${n.breaking?`<span class="breaking">${{uz:"Shoshilinch",uzc:"Шошилинч",ru:"Срочно",en:"Breaking"}[state.lang]}</span>`:""}</div>
      <div class="body">
        <div class="meta">
          <span class="cat" style="color:${c.color}">${loc(c)}</span>
          <span style="color:var(--muted)">· 📍 ${loc(d)}</span>
        </div>
        <h3>${loc(n.t)}</h3>
        <p>${loc(n.l)}</p>
        <div class="cardfoot">
          <span class="src">${n.verified?'<span class="verified">✔</span>':"○"} ${n.source}</span>
          <span>· ${timeAgo(n.time)}</span>
          <button class="bk ${on?"on":""}" title="${t("addBk")}" data-id="${n.id}">${on?"🔖":"🏷️"}</button>
        </div>
      </div>`;
    card.querySelector(".bk").onclick = e=>{ e.stopPropagation(); toggleBk(n.id); };
    card.onclick = ()=> openArticle(n);
    feed.appendChild(card);
  });
}

/* ---------- bookmarks ---------- */
function toggleBk(id){
  const i = state.bookmarks.indexOf(id);
  if(i>=0) state.bookmarks.splice(i,1); else state.bookmarks.push(id);
  localStorage.setItem("nd_bk", JSON.stringify(state.bookmarks));
  renderBkCount(); renderFeed();
  if(currentArticle && currentArticle.id===id) syncArticleBk();
}
function renderBkCount(){
  const el = $("#bkCount");
  if(state.bookmarks.length){ el.style.display="flex"; el.textContent = state.bookmarks.length; }
  else el.style.display="none";
}

/* ---------- article modal ---------- */
let currentArticle = null;
function openArticle(n){
  currentArticle = n;
  const c = CAT_LABEL[n.cat], d = DIST_LABEL[n.district];
  $("#aHero").style.backgroundImage = `url('${n.img}')`;
  $("#aMeta").innerHTML = `<span class="cat" style="color:${c.color}">${loc(c)}</span><span style="color:var(--muted)">· 📍 ${loc(d)} · ${timeAgo(n.time)} · ${n.verified?'<span class="verified">✔ '+n.source+'</span>':n.source}</span>`;
  $("#aTitle").textContent = loc(n.t);
  $("#aLead").textContent = loc(n.l);
  $("#aBody").innerHTML = loc(n.b).map(p=>`<p>${p}</p>`).join("");
  syncArticleBk();
  $("#modal").classList.add("open");
  document.body.style.overflow = "hidden";
}
function syncArticleBk(){
  const on = state.bookmarks.includes(currentArticle.id);
  $("#aBkT").textContent = on ? "✓ " + t("addBk") : t("addBk");
  $("#aBk").style.opacity = on ? .7 : 1;
}
function closeArticle(){ $("#modal").classList.remove("open"); document.body.style.overflow=""; currentArticle=null; }

/* ---------- sidebar ---------- */
function renderSidebar(){
  $("#wTitle").textContent = t("weather");
  $("#wSub").textContent = t("wsub");
  $("#tTitle").textContent = t("trend");
  $("#digTitle").textContent = t("digest");
  $("#digText").textContent = t("digestText");
  $("#digBtn").textContent = t("digestBtn");
  const trend = $("#trend"); trend.innerHTML = "";
  filtered().slice().sort((a,b)=>a.time-b.time).slice(0,4).forEach((n,i)=>{
    const a = document.createElement("a");
    a.innerHTML = `<span class="n">${i+1}</span><span class="t">${loc(n.t)}</span>`;
    a.onclick = ()=> openArticle(n);
    trend.appendChild(a);
  });
}

/* ---------- static UI text ---------- */
function renderStatic(){
  $("#search").placeholder = t("search");
  $("#bkBtn").title = t("bookmark");
  $("#aBkT").textContent = t("addBk");
  $("#aShareT").textContent = t("share");
}

function renderAll(){
  renderLangButtons(); renderCats(); renderDistrict();
  renderStatic(); renderSidebar(); renderBkCount(); renderFeed();
}

/* ---------- events ---------- */
$("#search").addEventListener("input", e=>{ state.query = e.target.value.trim(); renderFeed(); renderSidebar(); });
$("#bkBtn").addEventListener("click", ()=>{ state.showBookmarks = !state.showBookmarks; if(state.showBookmarks){state.cat="all";state.district="all";} renderAll(); });
$("#closeModal").addEventListener("click", closeArticle);
$("#modal").addEventListener("click", e=>{ if(e.target.id==="modal") closeArticle(); });
document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeArticle(); });
$("#aBk").addEventListener("click", ()=> currentArticle && toggleBk(currentArticle.id));
$("#aShare").addEventListener("click", ()=>{
  const url = location.href;
  if(navigator.share) navigator.share({title: loc(currentArticle.t), url});
  else { navigator.clipboard?.writeText(url); $("#aShareT").textContent = "✓"; setTimeout(renderStatic,1200); }
});
$("#digBtn").addEventListener("click", ()=>{ $("#digBtn").textContent = "✓ " + t("digestBtn"); });

renderAll();
