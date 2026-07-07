/* NewsDay — логика прототипа (Kun.uz-style) */
const $ = s => document.querySelector(s);
const state = {
  lang: localStorage.getItem("nd_lang") || "ru",
  cat: "all",
  district: "all",
  query: "",
  showBookmarks: false,
  bookmarks: JSON.parse(localStorage.getItem("nd_bk") || "[]"),
};

const EXTRA = {
  uz:  { feed:"Yangiliklar lentasi", saved:"Saqlanganlar", live:"Jonli", empty:"Hech narsa topilmadi", emptyBk:"Saqlangan yangiliklar yo'q" },
  uzc: { feed:"Янгиликлар лентаси", saved:"Сақланганлар", live:"Жонли", empty:"Ҳеч нарса топилмади", emptyBk:"Сақланган янгиликлар йўқ" },
  ru:  { feed:"Лента новостей", saved:"Закладки", live:"Срочно", empty:"Ничего не найдено", emptyBk:"Нет сохранённых новостей" },
  en:  { feed:"News feed", saved:"Bookmarks", live:"Live", empty:"Nothing found", emptyBk:"No saved stories" },
};

function t(key, ...a){ const v = I18N[state.lang][key]; return typeof v === "function" ? v(...a) : v; }
function x(key){ return EXTRA[state.lang][key]; }
function loc(o){ return o[state.lang] || o.ru; }

function timeAgo(min){
  const map = { uz:["daqiqa oldin","soat oldin","kun oldin"], uzc:["дақиқа олдин","соат олдин","кун олдин"],
                ru:["мин назад","ч назад","дн назад"], en:["min ago","h ago","d ago"] }[state.lang];
  if(min < 60) return `${min} ${map[0]}`;
  if(min < 1440) return `${Math.round(min/60)} ${map[1]}`;
  return `${Math.round(min/1440)} ${map[2]}`;
}

function renderDate(){
  const locale = { uz:"uz-UZ", uzc:"ru-RU", ru:"ru-RU", en:"en-US" }[state.lang];
  const s = new Date().toLocaleDateString(locale, { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  $("#date").textContent = s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------- controls ---------- */
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
    b.className = state.cat===c.id && !state.showBookmarks ? "active":"";
    b.textContent = loc(c);
    b.onclick = ()=>{ state.cat = c.id; state.showBookmarks=false; renderAll(); };
    el.appendChild(b);
  });
}

function renderDistrict(){
  const sel = $("#district"); sel.innerHTML = "";
  sel.add(new Option(t("all"), "all", state.district==="all", state.district==="all"));
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

function metaFoot(n){
  const d = DIST_LABEL[n.district];
  return `<span class="src">${n.verified?'<span class="verified">✔</span> ':''}${n.source}</span>`
       + `<span class="dotsep">·</span><span>📍 ${loc(d)}</span>`
       + `<span class="dotsep">·</span><span>${timeAgo(n.time)}</span>`;
}

/* ---------- feed ---------- */
function renderFeed(){
  const hero = $("#hero"), feed = $("#feed");
  hero.innerHTML = ""; feed.innerHTML = "";
  const list = filtered();
  $("#count").textContent = t("count", list.length);
  $("#feedTitle").textContent = state.showBookmarks ? x("saved") : x("feed");

  if(!list.length){
    hero.innerHTML = `<div class="empty"><div class="ee">${state.showBookmarks?"🔖":"🔍"}</div>${state.showBookmarks?x("emptyBk"):x("empty")}</div>`;
    return;
  }

  // Hero = первая новость (только на общей ленте без поиска)
  let rest = list;
  if(!state.query){
    const n = list[0]; rest = list.slice(1);
    const c = CAT_LABEL[n.cat];
    const h = document.createElement("div");
    h.className = "hero";
    h.innerHTML = `
      <div class="img" style="background-image:url('${n.img}')">${n.breaking?`<span class="live">${x("live")}</span>`:""}</div>
      <div class="cap">
        <span class="cat">${loc(c)}</span>
        <h3>${loc(n.t)}</h3>
        <p>${loc(n.l)}</p>
        <div class="foot">${metaFoot(n)}</div>
      </div>`;
    h.onclick = ()=> openArticle(n);
    hero.appendChild(h);
  }

  rest.forEach(n=>{
    const c = CAT_LABEL[n.cat];
    const on = state.bookmarks.includes(n.id);
    const it = document.createElement("article");
    it.className = "item";
    it.innerHTML = `
      <div class="th" style="background-image:url('${n.img}')">${n.breaking?`<span class="live">${x("live")}</span>`:""}</div>
      <div class="txt">
        <span class="cat">${loc(c)}</span>
        <h3>${loc(n.t)}</h3>
        <p>${loc(n.l)}</p>
        <div class="foot">${metaFoot(n)}<button class="bk ${on?"on":""}" data-id="${n.id}">${on?"🔖":"🏷️"}</button></div>
      </div>`;
    it.querySelector(".bk").onclick = e=>{ e.stopPropagation(); toggleBk(n.id); };
    it.onclick = ()=> openArticle(n);
    feed.appendChild(it);
  });
}

/* ---------- popular ---------- */
function renderPop(){
  $("#popTitle").textContent = t("trend");
  const pop = $("#pop"); pop.innerHTML = "";
  NEWS.slice().sort((a,b)=>a.time-b.time).slice(0,5).forEach((n,i)=>{
    const a = document.createElement("a");
    a.innerHTML = `<span class="n">${i+1}</span><span class="t">${loc(n.t)}</span>`;
    a.onclick = ()=> openArticle(n);
    pop.appendChild(a);
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
  $("#aCat").textContent = loc(c);
  $("#aTitle").textContent = loc(n.t);
  $("#aMeta").innerHTML = `<span class="src">${n.verified?'<span class="verified">✔</span> ':''}${n.source}</span><span class="dotsep">·</span><span>📍 ${loc(d)}</span><span class="dotsep">·</span><span>${timeAgo(n.time)}</span>`;
  $("#aLead").textContent = loc(n.l);
  $("#aBody").innerHTML = loc(n.b).map(p=>`<p>${p}</p>`).join("");
  syncArticleBk();
  $("#modal").classList.add("open");
  document.body.style.overflow = "hidden";
}
function syncArticleBk(){
  const on = state.bookmarks.includes(currentArticle.id);
  $("#aBkT").textContent = (on ? "✓ " : "") + t("addBk");
}
function closeArticle(){ $("#modal").classList.remove("open"); document.body.style.overflow=""; currentArticle=null; }

/* ---------- sidebar static ---------- */
function renderSidebar(){
  $("#wTitle").textContent = t("weather");
  $("#wSub").textContent = t("wsub");
  $("#digTitle").textContent = t("digest");
  $("#digText").textContent = t("digestText");
  $("#digBtn").textContent = t("digestBtn");
}

function renderStatic(){
  $("#search").placeholder = t("search");
  $("#bkBtn").title = t("bookmark");
  $("#aBkT").textContent = t("addBk");
  $("#aShareT").textContent = t("share");
}

function renderAll(){
  renderDate(); renderLangButtons(); renderCats(); renderDistrict();
  renderStatic(); renderSidebar(); renderPop(); renderBkCount(); renderFeed();
}

/* ---------- events ---------- */
$("#search").addEventListener("input", e=>{ state.query = e.target.value.trim(); renderFeed(); });
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
