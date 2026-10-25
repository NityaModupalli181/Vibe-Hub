// Fetches fresh content from free public APIs. Every function returns null on
// any failure so the caller can fall back to the local database.
const TIMEOUT_MS = 5000;
const HEADERS = { 'User-Agent': 'VibeHub/1.0 (student project)', Accept: 'application/json' };

async function getJSON(url) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function splitSteps(text = '') {
  let parts = text.split(/\r?\n+/).map((s) => s.replace(/^(step\s*\d+[:.)]?|\d+[.)])\s*/i, '').trim()).filter((s) => s.length > 3);
  if (parts.length <= 1) parts = text.split(/(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean);
  return parts;
}

// TheMealDB — https://www.themealdb.com (free test key "1")
async function recipeFromMealDB(diet) {
  try {
    const category = diet === 'veg' ? pick(['Vegetarian', 'Vegetarian', 'Pasta', 'Side']) : pick(['Chicken', 'Beef', 'Seafood', 'Lamb']);
    const list = await getJSON(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`);
    if (!list.meals?.length) return null;
    // Pasta/Side categories can contain meat — re-check by ingredients below
    for (let tries = 0; tries < 4; tries++) {
      const { idMeal } = pick(list.meals);
      const detail = await getJSON(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${idMeal}`);
      const m = detail.meals?.[0];
      if (!m) continue;
      const ingredients = [];
      for (let i = 1; i <= 20; i++) {
        const ing = (m[`strIngredient${i}`] || '').trim();
        const measure = (m[`strMeasure${i}`] || '').trim();
        if (ing) ingredients.push(measure ? `${measure} ${ing}` : ing);
      }
      if (diet === 'veg') {
        const meaty = /chicken|beef|pork|lamb|bacon|fish|prawn|shrimp|anchov|salmon|tuna|sausage|ham|mince|turkey|chorizo|gelatin|stock/i;
        if (ingredients.some((x) => meaty.test(x)) && category !== 'Vegetarian') continue;
      }
      return {
        title: m.strMeal,
        cuisine: m.strArea && m.strArea !== 'Unknown' ? m.strArea : null,
        diet,
        image: m.strMealThumb,
        ingredients,
        steps: splitSteps(m.strInstructions),
        video: m.strYoutube || null,
        source: 'TheMealDB',
        sourceUrl: `https://www.themealdb.com/meal/${m.idMeal}`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// PoetryDB — https://poetrydb.org
async function poemFromPoetryDB() {
  try {
    const poems = await getJSON('https://poetrydb.org/random/8');
    const short = (Array.isArray(poems) ? poems : []).filter((p) => Number(p.linecount) >= 4 && Number(p.linecount) <= 40);
    if (!short.length) return null;
    const p = pick(short);
    return { kind: 'poem', title: p.title, author: p.author, body: p.lines.join('\n'), source: 'PoetryDB', sourceUrl: 'https://poetrydb.org' };
  } catch {
    return null;
  }
}

// Wikipedia — random article summary
async function articleFromWikipedia() {
  try {
    for (let tries = 0; tries < 3; tries++) {
      const a = await getJSON('https://en.wikipedia.org/api/rest_v1/page/random/summary');
      if (a.type === 'standard' && a.extract && a.extract.length > 250) {
        return {
          kind: 'article',
          title: a.title,
          author: 'Wikipedia',
          body: a.extract,
          image: a.thumbnail?.source || null,
          source: 'Wikipedia',
          sourceUrl: a.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(a.title)}`,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

module.exports = { recipeFromMealDB, poemFromPoetryDB, articleFromWikipedia };
