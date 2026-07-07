/* NewsDay — HTTP-сервер: REST API + отдача статики (frontend + admin). */
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import * as store from "./store.js";
import { login, requireAuth } from "./auth.js";
import { DISTRICTS, CATEGORIES } from "./seed-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

store.load();

const app = express();
app.use(express.json({ limit: "1mb" }));

// небольшой лог запросов
app.use((req, _res, next)=>{ console.log(`${req.method} ${req.url}`); next(); });

/* ---------------- Public API ---------------- */

app.get("/api/health", (_req, res)=> res.json({ ok: true, ...store.stats() }));

// Справочники: районы + категории
app.get("/api/meta", (_req, res)=> res.json({ districts: DISTRICTS, categories: CATEGORIES }));

// Публичная лента: только опубликованные, с фильтрами
app.get("/api/news", (req, res)=>{
  const { category, district, q } = req.query;
  const list = store.listNews({ status: "published", category, district, q });
  res.json({ items: list, total: list.length });
});

// Одна новость (только опубликованная — для публики)
app.get("/api/news/:id", (req, res)=>{
  const n = store.getNews(req.params.id);
  if(!n || n.status !== "published") return res.status(404).json({ error: "not_found" });
  res.json(n);
});

// Подписка на дайджест
app.post("/api/subscribe", (req, res)=>{
  const { email, district } = req.body || {};
  if(!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "invalid_email" });
  const count = store.addSubscriber(email, district);
  res.json({ ok: true, subscribers: count });
});

/* ---------------- Auth ---------------- */

app.post("/api/auth/login", (req, res)=>{
  const token = login((req.body || {}).password);
  if(!token) return res.status(401).json({ error: "invalid_credentials" });
  res.json({ token });
});

/* ---------------- Admin API (требует токен) ---------------- */

// Все новости (в т.ч. на модерации), с фильтром по статусу
app.get("/api/admin/news", requireAuth, (req, res)=>{
  const { status, category, district, q } = req.query;
  const list = store.listNews({ status, category, district, q });
  res.json({ items: list, total: list.length, stats: store.stats() });
});

app.post("/api/admin/news", requireAuth, (req, res)=>{
  const item = store.createNews(req.body || {});
  res.status(201).json(item);
});

app.put("/api/admin/news/:id", requireAuth, (req, res)=>{
  const item = store.updateNews(req.params.id, req.body || {});
  if(!item) return res.status(404).json({ error: "not_found" });
  res.json(item);
});

app.delete("/api/admin/news/:id", requireAuth, (req, res)=>{
  const ok = store.deleteNews(req.params.id);
  if(!ok) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

// Модерация: approve | reject
app.post("/api/admin/news/:id/moderate", requireAuth, (req, res)=>{
  const action = (req.body || {}).action;
  const status = action === "approve" ? "published" : action === "reject" ? "rejected" : null;
  if(!status) return res.status(400).json({ error: "bad_action" });
  const item = store.updateNews(req.params.id, { status });
  if(!item) return res.status(404).json({ error: "not_found" });
  res.json(item);
});

/* ---------------- Static (frontend + admin) ---------------- */
app.use(express.static(path.join(__dirname, "..", "public")));

app.listen(PORT, ()=>{
  console.log(`\n🟢 NewsDay server: http://localhost:${PORT}`);
  console.log(`   Admin CMS:      http://localhost:${PORT}/admin.html`);
  console.log(`   API health:     http://localhost:${PORT}/api/health\n`);
});
