/* NewsDay — клиентские UI-строки (i18n интерфейса).
   Контент (районы, категории, новости) приходит с backend через /api/meta и /api/news. */
const I18N = {
  uz: { search:"Qidiruv...", district:"Tuman:", all:"Butun shahar", count:n=>`${n} ta yangilik`,
        weather:"Toshkentda ob-havo", wsub:"Ochiq · his qilinadi +37°", trend:"Hozir mashhur",
        digest:"Dayjest", digestText:"Tuman bo'yicha asosiy yangiliklarni ertalab va kechqurun oling.",
        digestBtn:"🔔 Dayjestga obuna", bookmark:"Saqlanganlar", addBk:"Saqlash", share:"Ulashish",
        empty:"Hech narsa topilmadi", emptyBk:"Saqlangan yangiliklar yo'q" },
  uzc: { search:"Қидирув...", district:"Туман:", all:"Бутун шаҳар", count:n=>`${n} та янгилик`,
        weather:"Тошкентда об-ҳаво", wsub:"Очиқ · ҳис қилинади +37°", trend:"Ҳозир машҳур",
        digest:"Дайджест", digestText:"Туман бўйича асосий янгиликларни эрталаб ва кечқурун олинг.",
        digestBtn:"🔔 Дайджестга обуна", bookmark:"Сақланганлар", addBk:"Сақлаш", share:"Улашиш",
        empty:"Ҳеч нарса топилмади", emptyBk:"Сақланган янгиликлар йўқ" },
  ru: { search:"Поиск...", district:"Район:", all:"Весь город", count:n=>`${n} новостей`,
        weather:"Погода в Ташкенте", wsub:"Ясно · ощущается +37°", trend:"Популярное сейчас",
        digest:"Дайджест", digestText:"Получайте главные новости района утром и вечером.",
        digestBtn:"🔔 Подписаться на дайджест", bookmark:"Закладки", addBk:"В закладки", share:"Поделиться",
        empty:"Ничего не найдено", emptyBk:"Нет сохранённых новостей" },
  en: { search:"Search...", district:"District:", all:"Whole city", count:n=>`${n} stories`,
        weather:"Weather in Tashkent", wsub:"Clear · feels like +37°", trend:"Trending now",
        digest:"Digest", digestText:"Get the top news of your district every morning and evening.",
        digestBtn:"🔔 Subscribe to digest", bookmark:"Bookmarks", addBk:"Bookmark", share:"Share",
        empty:"Nothing found", emptyBk:"No saved stories" },
};
