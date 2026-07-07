/* NewsDay — фронтенд (данные с backend API) */
const $ = s => document.querySelector(s);

/* Справочники и новости приходят с сервера */
let NEWS = [], DISTRICTS = [], CATEGORIES = [], CAT_LABEL = {}, DIST_LABEL = {};

const state = {
  lang: localStorage.getItem("nd_lang") || "ru",
  cat: "all",
  district: "all",
  query: "",
  showBookmarks: false,
  bookmarks: JSON.parse(localStorage.getItem("nd_bk") || "[]"),
  theme: localStorage.getItem("nd_theme") || "light",
};

const EXTRA = {
  uz:  { saved:"Saqlanganlar", live:"Jonli", empty:"Hech narsa topilmadi", emptyBk:"Saqlangan yangiliklar yo'q",
         main:"Asosiy", focus:"Tahririyat tanlovi", latest:"So'nggi yangiliklar", photo:"Foto", video:"Video",
         loading:"Yuklanmoqda...", offline:"Serverga ulanib bo'lmadi", subEmail:"Email manzilingizni kiriting:", subOk:"Obuna rasmiylashtirildi!" },
  uzc: { saved:"Сақланганлар", live:"Жонли", empty:"Ҳеч нарса топилмади", emptyBk:"Сақланган янгиликлар йўқ",
         main:"Асосий", focus:"Таҳририят танлови", latest:"Сўнгги янгиликлар", photo:"Фото", video:"Видео",
         loading:"Юкланмоқда...", offline:"Серверга уланиб бўлмади", subEmail:"Email манзилингизни киритинг:", subOk:"Обуна расмийлаштирилди!" },
  ru:  { saved:"Закладки", live:"Срочно", empty:"Ничего не найдено", emptyBk:"Нет сохранённых новостей",
         main:"Главное", focus:"Выбор редакции", latest:"Последние новости", photo:"Фото", video:"Видео",
         loading:"Загрузка...", offline:"Не удалось подключиться к серверу", subEmail:"Введите ваш email:", subOk:"Подписка оформлена!" },
  en:  { saved:"Bookmarks", live:"Live", empty:"Nothing found", emptyBk:"No saved stories",
         main:"Top", focus:"Editor's choice", latest:"Latest news", photo:"Photo", video:"Video",
         loading:"Loading...", offline:"Could not connect to the server", subEmail:"Enter your email:", subOk:"Subscribed!" },
};

function t(key, ...a){ const v = I18N[state.lang][key]; return typeof v === "function" ? v(...a) : v; }
function x(key){ return EXTRA[state.lang][key]; }
function loc(o){ return (o && (o[state.lang] || o.ru)) || ""; }

/* ---------- API ---------- */
const api = {
  async get(url){ const r = await fetch(url); if(!r.ok) throw new Error(r.status); return r.json(); },
  async post(url, body){
    const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
    return r.json();
  },
};

async function loadData(){
  const [meta, news] = await Promise.all([ api.get("/api/meta"), api.get("/api/news") ]);
  DISTRICTS = meta.districts;
  CATEGORIES = meta.categories;
  CAT_LABEL = Object.fromEntries(CATEGORIES.map(c=>[c.id, c]));
  DIST_LABEL = Object.fromEntries(DISTRICTS.map(d=>[d.id, d]));
  NEWS = news.items;
}

/* ---------- helpers ---------- */
// Время в стиле Kun.uz: сегодня — «13:32», старше — «19:24 / 06.07.2026»
function timeAgo(min){
  const d = new Date(Date.now() - min*60000);
  const p = n=> String(n).padStart(2,"0");
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`;
  const now = new Date();
  const sameDay = d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
  return sameDay ? hm : `${hm} / ${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()}`;
}

function media(n){
  if(["events","city"].includes(n.cat)) return { ic:"📷", label:x("photo") };
  if(["incident"].includes(n.cat))       return { ic:"▶", label:x("video") };
  return null;
}
function mBadge(n){ const m = media(n); return m ? `<span class="mbadge">${m.ic} ${m.label}</span>` : ""; }
function liveBadge(n){ return n.breaking ? `<span class="live">${x("live")}</span>` : ""; }

/* ---------- theme ---------- */
function applyTheme(){
  const dark = state.theme === "dark";
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  const b = $("#themeBtn"); if(b) b.textContent = dark ? "☀️" : "🌙";
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

/* ---------- filtering (клиентское, над опубликованными) ---------- */
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

/* ---------- card builders ---------- */
function el(html){ const d=document.createElement("div"); d.innerHTML=html.trim(); return d.firstElementChild; }

function heroCard(n){
  const c = CAT_LABEL[n.cat];
  const node = el(`
    <div class="hero">
      <div class="img" style="background-image:url('${n.img}')">${liveBadge(n)}${mBadge(n)}</div>
      <div class="cap">
        <span class="cat">${loc(c)}</span>
        <h3>${loc(n.t)}</h3>
        <p>${loc(n.l)}</p>
        <div class="foot">${metaFoot(n)}</div>
      </div>
    </div>`);
  node.onclick = ()=> openArticle(n);
  return node;
}
function headRow(n){
  const c = CAT_LABEL[n.cat];
  const node = el(`
    <div class="hrow">
      <div class="th" style="background-image:url('${n.img}')">${liveBadge(n)}</div>
      <div>
        <span class="cat">${loc(c)}</span>
        <h4>${loc(n.t)}</h4>
        <div class="tm">${timeAgo(n.time)}</div>
      </div>
    </div>`);
  node.onclick = ()=> openArticle(n);
  return node;
}
function tileCard(n){
  const c = CAT_LABEL[n.cat];
  const node = el(`
    <div class="tile">
      <div class="img" style="background-image:url('${n.img}')"></div>
      ${liveBadge(n)}${mBadge(n)}
      <div class="cap">
        <span class="cat">${loc(c)}</span>
        <h4>${loc(n.t)}</h4>
        <div class="tm">${timeAgo(n.time)}</div>
      </div>
    </div>`);
  node.onclick = ()=> openArticle(n);
  return node;
}
function listItem(n){
  const c = CAT_LABEL[n.cat];
  const on = state.bookmarks.includes(n.id);
  const node = el(`
    <article class="item">
      <div class="th" style="background-image:url('${n.img}')">${liveBadge(n)}</div>
      <div class="txt">
        <span class="cat">${loc(c)}</span>
        <h3>${loc(n.t)}</h3>
        <p>${loc(n.l)}</p>
        <div class="foot">${metaFoot(n)}<button class="bk ${on?"on":""}" data-id="${n.id}">${on?"🔖":"🏷️"}</button></div>
      </div>
    </article>`);
  node.querySelector(".bk").onclick = e=>{ e.stopPropagation(); toggleBk(n.id); };
  node.onclick = ()=> openArticle(n);
  return node;
}
function divHead(title){ return el(`<div class="divhead"><h2>${title}</h2><span class="rule"></span></div>`); }

/* ---------- feed assembly ---------- */
function renderFeed(){
  const root = $("#feedRoot"); root.innerHTML = "";
  const list = filtered();
  $("#count").textContent = t("count", list.length);

  if(!list.length){
    root.appendChild(el(`<div class="empty"><div class="ee">${state.showBookmarks?"🔖":"🔍"}</div>${state.showBookmarks?x("emptyBk"):x("empty")}</div>`));
    return;
  }
  if(state.query || state.showBookmarks){
    root.appendChild(divHead(state.showBookmarks ? x("saved") : x("latest")));
    const l = el(`<div class="list"></div>`);
    list.forEach(n=> l.appendChild(listItem(n)));
    root.appendChild(l);
    return;
  }

  let i = 0;
  const top = el(`<div class="topblock"></div>`);
  top.appendChild(heroCard(list[i++]));
  const heads = el(`<div class="heads"></div>`);
  for(let k=0; k<4 && i<list.length; k++) heads.appendChild(headRow(list[i++]));
  top.appendChild(heads);
  root.appendChild(top);

  if(list.length - i >= 3){
    root.appendChild(divHead(x("focus")));
    const tiles = el(`<div class="tiles"></div>`);
    for(let k=0; k<3 && i<list.length; k++) tiles.appendChild(tileCard(list[i++]));
    root.appendChild(tiles);
  }
  if(i < list.length){
    root.appendChild(divHead(x("latest")));
    const l = el(`<div class="list"></div>`);
    for(; i<list.length; i++) l.appendChild(listItem(list[i]));
    root.appendChild(l);
  }
}

/* ---------- popular ---------- */
function renderPop(){
  $("#popTitle").textContent = t("trend");
  const pop = $("#pop"); pop.innerHTML = "";
  NEWS.slice().sort((a,b)=>a.time-b.time).slice(0,5).forEach((n,idx)=>{
    const a = document.createElement("a");
    a.innerHTML = `<span class="n">${idx+1}</span><span class="t">${loc(n.t)}</span>`;
    a.onclick = ()=> openArticle(n);
    pop.appendChild(a);
  });
}

/* ---------- bookmarks ---------- */
function toggleBk(id){
  const idx = state.bookmarks.indexOf(id);
  if(idx>=0) state.bookmarks.splice(idx,1); else state.bookmarks.push(id);
  localStorage.setItem("nd_bk", JSON.stringify(state.bookmarks));
  renderBkCount(); renderFeed();
  if(currentArticle && currentArticle.id===id) syncArticleBk();
}
function renderBkCount(){
  const b = $("#bkCount");
  if(state.bookmarks.length){ b.style.display="flex"; b.textContent = state.bookmarks.length; }
  else b.style.display="none";
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

/* ---------- sidebar / static ---------- */
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

/* ---------- digest subscribe (пишет в backend) ---------- */
async function subscribeDigest(){
  const email = prompt(x("subEmail"));
  if(!email) return;
  try{
    const r = await api.post("/api/subscribe", { email, district: state.district });
    if(r.ok){ $("#digBtn").textContent = "✓ " + x("subOk"); }
    else alert(r.error || "error");
  }catch{ alert(x("offline")); }
}

/* ---------- events ---------- */
function bindEvents(){
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
  $("#digBtn").addEventListener("click", subscribeDigest);
  $("#themeBtn").addEventListener("click", ()=>{
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("nd_theme", state.theme);
    applyTheme();
  });
}

/* ---------- init ---------- */
async function init(){
  applyTheme();
  bindEvents();
  $("#feedRoot").innerHTML = `<div class="empty">${x("loading")}</div>`;
  try{
    await loadData();
    renderAll();
  }catch(e){
    $("#feedRoot").innerHTML = `<div class="empty"><div class="ee">📡</div>${x("offline")}<br><small>${e.message||e}</small></div>`;
  }
}

init();
