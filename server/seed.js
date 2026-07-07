/* NewsDay — наполнение БД начальными данными.
   npm run seed        — заполнить, если БД пустая
   npm run seed:force  — перезаписать БД начальными данными */
import { load, replaceAll } from "./store.js";
import { NEWS } from "./seed-data.js";

const force = process.argv.includes("--force");
const db = load();

if(force || db.news.length === 0){
  replaceAll(NEWS);
  console.log(`✔ Seeded ${NEWS.length} news items` + (force ? " (forced overwrite)" : ""));
} else {
  console.log(`DB already has ${db.news.length} items — skip (use --force to overwrite)`);
}
