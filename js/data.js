/* ─────────────────────────────────────────────────────────────
   Item catalog — prices are PER 1 KG, exactly as in the shop list.
   p = { grams: priceForThatPackSize }
   ───────────────────────────────────────────────────────────── */
window.SHOP_ITEMS = [
  // ── મિઠાઈ / Mithai ─────────────────────────────────────────
  { id: 1,  gu: "પ્રિમિયમ મોહનથાળ", en: "Premium Mohanthal", cat: "mithai",   p: { 1000: 440, 500: 220, 250: 110, 100: 44 } },
  { id: 2,  gu: "મગદળ",             en: "Magdal",            cat: "mithai",   p: { 1000: 440, 500: 220, 250: 110, 100: 44 } },
  { id: 3,  gu: "ઘીના દેવડાં",       en: "Ghee na Devda",     cat: "mithai",   p: { 1000: 560, 500: 280, 250: 140, 100: 56 } },
  { id: 4,  gu: "કેસર કાલાજામ",      en: "Kesar Kalajam",     cat: "mithai",   p: { 1000: 520, 500: 260, 250: 130, 100: 52 } },
  { id: 5,  gu: "સોનપાપડી",          en: "Sonpapdi",          cat: "mithai",   p: { 1000: 520, 500: 260, 250: 130, 100: 52 } },
  { id: 6,  gu: "કેસર મોતીચુર લડ્ડુ", en: "Kesar Motichur Ladoo", cat: "mithai", p: { 1000: 520, 500: 260, 250: 130, 100: 52 } },
  { id: 7,  gu: "મીલ્ક કેક",          en: "Milk Cake",         cat: "mithai",   p: { 1000: 520, 500: 260, 250: 130, 100: 52 } },
  { id: 8,  gu: "અખરોટ બરફી",        en: "Akhrot Barfi",      cat: "mithai",   p: { 1000: 520, 500: 260, 250: 130, 100: 52 } },
  { id: 9,  gu: "પીસ્તા બરફી",        en: "Pista Barfi",       cat: "mithai",   p: { 1000: 520, 500: 260, 250: 130, 100: 52 } },
  { id: 10, gu: "કલાકંદ બરફી",       en: "Kalakand Barfi",    cat: "mithai",   p: { 1000: 520, 500: 260, 250: 130, 100: 52 } },
  { id: 11, gu: "કેસર બરફી",         en: "Kesar Barfi",       cat: "mithai",   p: { 1000: 520, 500: 260, 250: 130, 100: 52 } },
  { id: 12, gu: "મીક્ષ મિઠાઈ",        en: "Mix Mithai",        cat: "mithai",   p: { 1000: 520, 500: 260, 250: 130, 100: 52 } },
  { id: 13, gu: "કેસર કોપરા પાક",    en: "Kesar Kopra Pak",   cat: "mithai",   p: { 1000: 560, 500: 280, 250: 140, 100: 56 } },
  { id: 14, gu: "ડોડા બરફી",         en: "Doda Barfi",        cat: "mithai",   p: { 1000: 600, 500: 300, 250: 150, 100: 60 } },
  { id: 15, gu: "પતીસા",             en: "Patisa",            cat: "mithai",   p: { 1000: 560, 500: 280, 250: 140, 100: 56 } },
  { id: 24, gu: "બોમ્બે હલવો",       en: "Bombay Halwa",      cat: "mithai",   p: { 1000: 640, 500: 320, 250: 160, 100: 64 } },
  { id: 25, gu: "ખીર કદમ",           en: "Kheer Kadam",       cat: "mithai",   p: { 1000: 600, 500: 300, 250: 150, 100: 60 } },

  // ── ફરસાણ / Farsan ─────────────────────────────────────────
  { id: 16, gu: "મીક્ષ ચવાણું",       en: "Mix Chavanu",       cat: "farsan",   p: { 1000: 280, 500: 140, 250: 70, 100: 28 } },
  { id: 17, gu: "ફુલવડી",            en: "Fulvadi",           cat: "farsan",   p: { 1000: 280, 500: 140, 250: 70, 100: 28 } },
  { id: 18, gu: "ગાંઠીયા",           en: "Gathiya",           cat: "farsan",   p: { 1000: 280, 500: 140, 250: 70, 100: 28 } },
  { id: 19, gu: "તીખી સેવ",           en: "Tikhi Sev",         cat: "farsan",   p: { 1000: 280, 500: 140, 250: 70, 100: 28 } },
  { id: 20, gu: "ઝીણી સેવ",           en: "Zini Sev",          cat: "farsan",   p: { 1000: 280, 500: 140, 250: 70, 100: 28 } },
  { id: 21, gu: "આલુ સેવ",            en: "Aloo Sev",          cat: "farsan",   p: { 1000: 280, 500: 140, 250: 70, 100: 28 } },
  { id: 22, gu: "રતલામી સેવ",         en: "Ratlami Sev",       cat: "farsan",   p: { 1000: 280, 500: 140, 250: 70, 100: 28 } },
  { id: 23, gu: "પાપડી",             en: "Papdi",             cat: "farsan",   p: { 1000: 320, 500: 160, 250: 80, 100: 32 } },

  // ── ડ્રાયફ્રૂટ / Dryfruit ──────────────────────────────────
  { id: 26, gu: "પ્રિમિયમ કાજુ કતરી",     en: "Premium Kaju Katri",        cat: "dryfruit", p: { 1000: 880,  500: 440, 250: 220, 100: 88 } },
  { id: 27, gu: "કેસર કાજુ કતરી",          en: "Kesar Kaju Katri",          cat: "dryfruit", p: { 1000: 1000, 500: 500, 250: 250, 100: 100 } },
  { id: 28, gu: "સ્ટ્રોબેરી કાજુ કતરી",     en: "Strawberry Kaju Katri",     cat: "dryfruit", p: { 1000: 1000, 500: 500, 250: 250, 100: 100 } },
  { id: 29, gu: "ચોકલેટ કાજુ કતરી",        en: "Chocolate Kaju Katri",      cat: "dryfruit", p: { 1000: 1000, 500: 500, 250: 250, 100: 100 } },
  { id: 30, gu: "કાજુ કસાટા",              en: "Kaju Cassata",              cat: "dryfruit", p: { 1000: 1040, 500: 520, 250: 260, 100: 104 } },
  { id: 31, gu: "કાજુ પાન",                en: "Kaju Paan",                 cat: "dryfruit", p: { 1000: 1040, 500: 520, 250: 260, 100: 104 } },
  { id: 32, gu: "કેડબરી બોલ",              en: "Cadbury Ball",              cat: "dryfruit", p: { 1000: 1040, 500: 520, 250: 260, 100: 104 } },
  { id: 33, gu: "કોકોનટ બોલ",              en: "Coconut Ball",              cat: "dryfruit", p: { 1000: 1040, 500: 520, 250: 260, 100: 104 } },
  { id: 34, gu: "રોસ્ટેડ આલમંડ બોલ",       en: "Roasted Almond Ball",       cat: "dryfruit", p: { 1000: 1040, 500: 520, 250: 260, 100: 104 } },
  { id: 35, gu: "મીક્ષ ડ્રાયફ્રૂટ મિઠાઈ",    en: "Mix Dryfruit Mithai",       cat: "dryfruit", p: { 1000: 1040, 500: 520, 250: 260, 100: 104 } },
  { id: 36, gu: "કાજુ ગજક",                en: "Kaju Gajak",                cat: "dryfruit", p: { 1000: 1040, 500: 520, 250: 260, 100: 104 } },
  { id: 37, gu: "મેવા બાઇટ",                en: "Meva Bite",                 cat: "dryfruit", p: { 1000: 1040, 500: 520, 250: 260, 100: 104 } },
  { id: 38, gu: "ચોકો બાઇટ",                en: "Choco Bite",                cat: "dryfruit", p: { 1000: 1040, 500: 520, 250: 260, 100: 104 } },
  { id: 39, gu: "ઓરેન્જ બાઇટ",              en: "Orange Bite",               cat: "dryfruit", p: { 1000: 1040, 500: 520, 250: 260, 100: 104 } },
  { id: 40, gu: "બ્લ્યુબેરી બાઇટ",           en: "Blueberry Bite",            cat: "dryfruit", p: { 1000: 1040, 500: 520, 250: 260, 100: 104 } },
  { id: 41, gu: "પાઇનેપલ બાઇટ",             en: "Pineapple Bite",            cat: "dryfruit", p: { 1000: 1040, 500: 520, 250: 260, 100: 104 } },
  { id: 42, gu: "કાજુ અંજીર રોલ (વરખ વગર)", en: "Kaju Anjeer Roll (no varakh)", cat: "dryfruit", p: { 1000: 1040, 500: 520, 250: 260, 100: 104 } },
  { id: 43, gu: "અંજીર પાત્રા",             en: "Anjeer Patra",              cat: "dryfruit", p: { 1000: 1040, 500: 520, 250: 260, 100: 104 } },
  { id: 44, gu: "ખજુર ડ્રાયફ્રૂટ ચીક્કી (સુગર ફ્રી)", en: "Khajur Dryfruit Chikki (sugar free)", cat: "dryfruit", p: { 1000: 1120, 500: 560, 250: 280, 100: 112 } },
  { id: 45, gu: "અંજીર ડ્રાયફ્રૂટ ચીક્કી (સુગર ફ્રી)", en: "Anjeer Dryfruit Chikki (sugar free)", cat: "dryfruit", p: { 1000: 1360, 500: 680, 250: 340, 100: 136 } },
  { id: 46, gu: "ડ્રાયફ્રૂટ લડ્ડુ (સુગર ફ્રી)",        en: "Dryfruit Ladoo (sugar free)",         cat: "dryfruit", p: { 1000: 1360, 500: 680, 250: 340, 100: 136 } }
];

window.ITEMS_BY_ID = Object.fromEntries(window.SHOP_ITEMS.map(i => [i.id, i]));

/* pack sizes offered as one-tap buttons */
window.PACK_SIZES = [
  { grams: 1000, label: "1 કિલો",  short: "1kg"   },
  { grams: 500,  label: "500 ગ્રામ", short: "500g"  },
  { grams: 250,  label: "250 ગ્રામ", short: "250g"  },
  { grams: 100,  label: "100 ગ્રામ", short: "100g"  }
];
