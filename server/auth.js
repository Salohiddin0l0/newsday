/* NewsDay — простая авторизация админа (для прототипа).
   ВНИМАНИЕ: это упрощённая схема (пароль из env + токен в памяти).
   Для продакшена — заменить на нормальную аутентификацию (JWT/сессии, хеш паролей). */
import crypto from "crypto";

const ADMIN_PASSWORD = process.env.NEWSDAY_ADMIN_PASSWORD || "admin123";
const tokens = new Set();

export function login(password){
  if(password !== ADMIN_PASSWORD) return null;
  const token = crypto.randomBytes(24).toString("hex");
  tokens.add(token);
  return token;
}

export function requireAuth(req, res, next){
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if(token && tokens.has(token)) return next();
  res.status(401).json({ error: "unauthorized" });
}
