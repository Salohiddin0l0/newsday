/* NewsDay — файловое JSON-хранилище (репозиторий).
   Изолированный слой доступа к данным: позже легко заменить на Postgres/SQLite,
   не меняя маршруты API. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "data", "news.json");

let db = { news: [], subscribers: [], seq: 0 };

function persist(){
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

export function load(){
  if(fs.existsSync(DATA_FILE)){
    db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    db.news ??= []; db.subscribers ??= [];
    db.seq ??= db.news.reduce((m, n)=> Math.max(m, n.id), 0);
  } else {
    persist();
  }
  return db;
}

export function replaceAll(news){
  db.news = news.map(n=>({ ...n }));
  db.seq = db.news.reduce((m, n)=> Math.max(m, n.id), 0);
  persist();
}

/* ---------- news ---------- */
export function listNews({ status, category, district, q } = {}){
  let list = db.news.slice();
  if(status) list = list.filter(n=> n.status === status);
  if(category && category !== "all") list = list.filter(n=> n.cat === category);
  if(district && district !== "all") list = list.filter(n=> n.district === district);
  if(q){
    const s = q.toLowerCase();
    list = list.filter(n=>
      Object.values(n.t || {}).some(v => String(v).toLowerCase().includes(s)) ||
      Object.values(n.l || {}).some(v => String(v).toLowerCase().includes(s)));
  }
  // свежие (меньше time = недавнее) и breaking выше
  return list.sort((a, b)=> (b.breaking?1:0)-(a.breaking?1:0) || a.time - b.time);
}

export function getNews(id){
  return db.news.find(n=> n.id === Number(id)) || null;
}

export function createNews(data){
  const id = ++db.seq;
  const item = {
    id,
    cat: data.cat || "city",
    district: data.district || "yunusabad",
    breaking: !!data.breaking,
    verified: !!data.verified,
    time: Number.isFinite(data.time) ? data.time : 0,
    source: data.source || "NewsDay",
    img: data.img || "",
    status: data.status || "pending",
    t: data.t || {}, l: data.l || {}, b: data.b || {},
    createdAt: new Date().toISOString(),
  };
  db.news.push(item);
  persist();
  return item;
}

export function updateNews(id, patch){
  const item = getNews(id);
  if(!item) return null;
  Object.assign(item, patch, { id: item.id });
  persist();
  return item;
}

export function deleteNews(id){
  const i = db.news.findIndex(n=> n.id === Number(id));
  if(i < 0) return false;
  db.news.splice(i, 1);
  persist();
  return true;
}

export function stats(){
  const by = s => db.news.filter(n=> n.status === s).length;
  return { total: db.news.length, published: by("published"), pending: by("pending"),
           rejected: by("rejected"), subscribers: db.subscribers.length };
}

/* ---------- subscribers (digest) ---------- */
export function addSubscriber(email, district){
  if(!db.subscribers.some(s=> s.email === email)){
    db.subscribers.push({ email, district: district || "all", at: new Date().toISOString() });
    persist();
  }
  return db.subscribers.length;
}
