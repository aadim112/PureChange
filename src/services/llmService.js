import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyCecoJ6SFIB-9kOfuJNdJDI4qTJ5dFgSIs";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function processVerse(verseText, religion) {
  if (!verseText || !religion) {
    return {
      actual_content: null,
      translation_english: null,
      translation_hindi: null,
      motivation: null,
      question: null,
      is_valid: 0,
      error: "Missing verse text or religion",
    };
  }

  try {
    // 🧠 Step 1: Enhanced LLM prompt for validation + translations + motivation + question
    const prompt = `
You are a highly knowledgeable scholar and translator of world religions.
Given a verse/shlok and its mentioned religion, perform the following and return the output *strictly in JSON format*:

1. Verify if the verse actually exists in the authentic scriptures of the mentioned religion (like Bhagavad Gita, Dhammapada, Quran, Bible, Guru Granth Sahib, etc.).
2. In "actual_content", write the *complete original shlok/verse* in its native language/script exactly as it appears in the authentic text. Do NOT summarize or shorten it.
3. Translate that verse faithfully into *English* and *Hindi* with full respect to its spiritual essence.
4. In "motivation", write a short, inspiring explanation that captures the inner, philosophical, and motivational meaning of the verse in simple English.
5. Create one "question" — keep it **very short (maximum 1 line)** but **extremely powerful and emotionally engaging**.  
   It should instantly spark curiosity and self-reflection in the reader.  
   The question must be simple yet deep — something that feels personal, universal, and makes the reader *want* to discover its answer through the verse and its motivation.  
   (Avoid long or complex phrasing; think like a human philosopher who asks just one striking line that hits the mind directly.)
6. If the verse is not valid or cannot be traced, return all fields as null and "is_valid" = 0.

Return strictly in JSON with the following format:
{
  "actual_content": "",
  "translation_english": "",
  "translation_hindi": "",
  "motivation": "",
  "question": "",
  "is_valid": 1 or 0
}

Now process this input:
Religion: ${religion}
Verse: """${verseText}"""
`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No valid JSON in model response");

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (error) {
    console.error("❌ LLM Service Error:", error);
    return {
      actual_content: null,
      translation_english: null,
      translation_hindi: null,
      motivation: null,
      question: null,
      is_valid: 0,
      error: error.message,
    };
  }
}

export async function ProcessHealth(information) {
  try{
    const prompt = `
You are an AI health evaluator analyzing user habits and progress in quitting masturbation.

You will be given a list of questions and answers describing the user's current condition.

Your task:
1. Analyze the user's mental, emotional, and physical progress.
2. Consider positive signs (motivation, self-control, focus, consistency) and negative signs (relapse, stress, guilt, low energy).
3. Based on the user's overall state, predict a realistic health score between **40 and 95**.
4. Never output 100 or values below 40.
5. Respond **strictly with one integer number only** — no words, no symbols, no explanation.

Questions and answers:
${JSON.stringify(information, null, 2)}

Output:
<just the integer number, e.g., 78>
`;
    const score = await model.generateContent(prompt);
    const rawText = score.response.text();
    return rawText;
  }catch(error){
    console.log(error);
  }
}

export async function generateEmergencyMotivation(goal, currentStreak, hobby, checklist) {
  // Quick fallback when goal is missing
  if (!goal) {
    return {
      line1: "You are stronger than this urge.",
      line2: "Hold for 30 minutes — you can do it.",
      tasks: [
        { title: "Write down your main goal (10 minutes)", estimate_minutes: 10 },
        { title: "Do a short guided meditation (10 minutes)", estimate_minutes: 10 },
        { title: hobby ? `${hobby} — enjoy it now (10 minutes)` : "Go for a brisk walk (10 minutes)", estimate_minutes: 10 }
      ],
      total_minutes: 30
    };
  }

  // helper: attempt to sanitize non-strict JSON into strict JSON
  function sanitizePossibleJson(text) {
    let s = String(text);

    // 1) Remove common "assistant:" style prefixes and any leading/trailing text before the first { and after the last }
    const firstBrace = s.indexOf('{');
    const lastBrace = s.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      s = s.slice(firstBrace, lastBrace + 1);
    }

    // 2) Replace smart quotes with normal double quotes
    s = s.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'"); // various single quotes -> '
    s = s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"'); // various double quotes -> "
    // 3) Remove JS-style comments (// ... and /* ... */)
    s = s.replace(/\/\/.*$/gm, '');
    s = s.replace(/\/\*[\s\S]*?\*\//g, '');

    // 4) Replace single-quoted string values with double quotes:
    //    'some text' => "some text"
    //    This may accidentally convert apostrophes inside words, but it's the most common fix.
    s = s.replace(/'([^']*)'/g, function(m, p1){
      // escape existing double quotes inside captured content
      const safe = p1.replace(/"/g, '\\"');
      return `"${safe}"`;
    });

    // 5) Quote unquoted property names: { key: or , key:  => { "key":
    s = s.replace(/([{,]\s*)([A-Za-z0-9_@$#\-]+)\s*:/g, '$1"$2":');

    // 6) Remove trailing commas before } or ]
    s = s.replace(/,(\s*[}\]])/g, '$1');

    // 7) Collapse multiple commas or accidental leftover punctuation
    s = s.replace(/,\s*,/g, ',');

    // Trim whitespace
    s = s.trim();

    return s;
  }

  try {
    const incompleteTask = Object.entries(checklist || {})
      .filter(([k, v]) => !v[0])
      .map(([k, v]) => v[1])[0] || null;

    const prompt = `
You are helping someone resist a masturbation urge in a critical moment.
User Goal: "${goal}"
Current Streak (days): ${currentStreak}
User Hobby: "${hobby || "none"}"
An incomplete checklist item (if any): "${incompleteTask || "none"}"

Produce a SHORT JSON only response with:
1) line1: one short powerful sentence connecting to user's goal (max 12 words)
2) line2: one short encouraging fact / reminder (max 12 words)
3) tasks: an array of exactly THREE simple tasks the user can start RIGHT NOW.
   - Task #1 must be goal-related.
   - Task #2 must be either a meditation or an incomplete checklist item (prefer checklist).
   - Task #3 must be related to the user's hobby (or a simple substitute).
   - Each task should be short and MAY include an estimated time in minutes (use estimate_minutes numeric field if possible).
4) Ensure the combined estimated time (total_minutes) is at least 30 minutes.
5) Return ONLY the JSON object (no extra commentary). Example:
{
  "line1": "short sentence",
  "line2": "short encouragement",
  "tasks": [
    { "title": "Task text", "estimate_minutes": 15 },
    { "title": "Task text", "estimate_minutes": 10 },
    { "title": "Task text", "estimate_minutes": 10 }
  ],
  "total_minutes": 35
}
`;

    const result = await model.generateContent(prompt);
    const rawText = (typeof result.response.text === 'function')
      ? result.response.text()
      : String(result.response || result);

    // Try extracting literal {...} substring first
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const rawJson = jsonMatch[0];

      // Attempt 1: direct parse
      try {
        const parsed = JSON.parse(rawJson);
        // validate tasks
        if (!parsed.tasks || !Array.isArray(parsed.tasks) || parsed.tasks.length !== 3) {
          throw new Error("LLM returned JSON but tasks array is invalid");
        }
        // normalize & compute total
        parsed.tasks = parsed.tasks.map(t => ({
          title: t.title || String(t).slice(0, 200),
          estimate_minutes: Number(t.estimate_minutes) || 0
        }));
        parsed.total_minutes = Number(parsed.total_minutes) || parsed.tasks.reduce((s, t) => s + (Number(t.estimate_minutes) || 0), 0);
        if (parsed.total_minutes < 30) {
          const extra = 30 - parsed.total_minutes;
          parsed.tasks[parsed.tasks.length - 1].estimate_minutes = (parsed.tasks[parsed.tasks.length - 1].estimate_minutes || 0) + extra;
          parsed.total_minutes = 30;
        }
        return parsed;
      } catch (parseErr) {
        // Attempt 2: sanitize text and parse again
        try {
          const sanitized = sanitizePossibleJson(rawJson);
          // debug log helpful for future tuning
          console.warn("JSON parse failed. Attempting sanitized JSON parse. Raw:", rawJson);
          console.warn("Sanitized JSON:", sanitized);
          const parsed2 = JSON.parse(sanitized);

          // validate & normalize
          if (!parsed2.tasks || !Array.isArray(parsed2.tasks) || parsed2.tasks.length !== 3) {
            throw new Error("Sanitized JSON parsed but tasks array invalid");
          }
          parsed2.tasks = parsed2.tasks.map(t => ({
            title: t.title || String(t).slice(0, 200),
            estimate_minutes: Number(t.estimate_minutes) || 0
          }));
          parsed2.total_minutes = Number(parsed2.total_minutes) || parsed2.tasks.reduce((s, t) => s + (Number(t.estimate_minutes) || 0), 0);
          if (parsed2.total_minutes < 30) {
            const extra = 30 - parsed2.total_minutes;
            parsed2.tasks[parsed2.tasks.length - 1].estimate_minutes = (parsed2.tasks[parsed2.tasks.length - 1].estimate_minutes || 0) + extra;
            parsed2.total_minutes = 30;
          }
          return parsed2;
        } catch (sanErr) {
          console.warn("Sanitized JSON parse also failed:", sanErr);
          // fall through to plaintext heuristics
        }
      }
    }

    // ----- Plaintext heuristics fallback (unchanged) -----
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    const taskLines = [];
    for (const l of lines) {
      if (/^\d+\./.test(l) || /^[\-\•\*]\s+/.test(l) || /^\d\)/.test(l)) {
        const t = l.replace(/^[\-\•\*\d\.\)\s]+/, '').trim();
        taskLines.push(t);
      } else if (/min(ute)?s?|minutes?\b/i.test(l) && taskLines.length < 3) {
        taskLines.push(l);
      } else if (taskLines.length < 3 && (/^(Do|Write|Meditate|Take|Go|Read|Try|Start)\b/i.test(l))) {
        taskLines.push(l);
      }
      if (taskLines.length >= 3) break;
    }

    if (taskLines.length < 3) {
      const candidateLines = lines.slice(2);
      for (const l of candidateLines) {
        if (taskLines.length >= 3) break;
        if (l.length < 200) taskLines.push(l);
      }
    }

    let line1 = lines[0] || `Don't break your ${currentStreak} day streak.`;
    let line2 = lines[1] || "Hold on for 30 minutes.";

    if (taskLines.length > 0 && (lines[0] === taskLines[0] || /^\d+\./.test(lines[0]) || /^[\-\•\*]/.test(lines[0]))) {
      const nonTask = lines.filter(l => !taskLines.includes(l));
      line1 = nonTask[0] || line1;
      line2 = nonTask[1] || line2;
    }

    const tasks = [];
    for (let i = 0; i < 3; ++i) {
      const tText = taskLines[i] || `Short task ${i + 1}: focus on your goal`;
      const mMatch = tText.match(/(\d{1,3})\s*(?:min|mins|minutes)/i);
      const estimate = mMatch ? Number(mMatch[1]) : (i === 0 ? 15 : i === 1 ? 10 : 5);
      tasks.push({ title: tText, estimate_minutes: estimate });
    }

    let total = tasks.reduce((s, t) => s + (Number(t.estimate_minutes) || 0), 0);
    if (total < 30) {
      const extra = 30 - total;
      tasks[2].estimate_minutes = (tasks[2].estimate_minutes || 0) + extra;
      total = 30;
    }

    return {
      line1,
      line2,
      tasks,
      total_minutes: total
    };

  } catch (error) {
    console.error("❌ Emergency Motivation Error:", error);
    // final fallback
    return {
      line1: `Don't destroy your ${currentStreak} days for 30 minutes.`,
      line2: "Your goal matters more than this urge.",
      tasks: [
        { title: "Write your goal and next step", estimate_minutes: 15 },
        { title: "Do a guided breathing meditation", estimate_minutes: 10 },
        { title: hobby ? `${hobby} — enjoy it now` : "Take a long walk", estimate_minutes: 5 }
      ],
      total_minutes: 30
    };
  }
}

export async function generateWeeklyRoutine(profile = {}) {
  // Helper: sanitize loosely-formed JSON-like strings (robust)
  function sanitizePossibleJson(text) {
    let s = String(text || '');
    const firstBrace = s.indexOf('{');
    const lastBrace = s.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) s = s.slice(firstBrace, lastBrace + 1);

    s = s.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'"); // single smart -> '
    s = s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"'); // double smart -> "
    s = s.replace(/\/\/.*$/gm, ''); // remove // comments
    s = s.replace(/\/\*[\s\S]*?\*\//g, ''); // remove /* comments */
    // convert single quoted property values to double quoted
    s = s.replace(/'([^']*)'/g, function (m, p1) {
      const safe = p1.replace(/"/g, '\\"');
      return `"${safe}"`;
    });
    // quote unquoted keys: { key: -> { "key":
    s = s.replace(/([{,]\s*)([A-Za-z0-9_@$#\-]+)\s*:/g, '$1"$2":');
    // remove trailing commas
    s = s.replace(/,(\s*[}\]])/g, '$1');
    s = s.replace(/,\s*,/g, ',');
    return s.trim();
  }

  // Helper: convert 24-hour float to 12-hour string "hh:mm AM/PM"
  function fmt12(hFloat) {
    const totalMin = Math.round(hFloat * 60 / 5) * 5; // round to 5 min
    let h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = (h % 12) === 0 ? 12 : (h % 12);
    const mm = m < 10 ? `0${m}` : `${m}`;
    return `${hh}:${mm} ${ampm}`;
  }

  // Deterministic fallback generator (safe, 12-hr, day variation, explicit food items)
  function fallbackGenerator(profileLocal = {}) {
    // reuse earlier deterministic generator logic but succinctly
    const age = Number(profileLocal.age || profileLocal.Age) || 25;
    const health = Number(profileLocal.healthScore || profileLocal.HealthScore) || 80;
    const goal = String(profileLocal.goal || profileLocal.Goal || 'general health').toLowerCase();
    const hobby = String(profileLocal.hobby || profileLocal.Hobby || '') || 'Hobby';
    const religion = String(profileLocal.religion || profileLocal.Religion || '') || '';
    const dietPref = String(profileLocal.dietPreference || profileLocal.DietPreference || '').toLowerCase();

    // small PRNG
    let seedStr = `${age}|${health}|${goal}|${hobby}|${religion}|${dietPref}`;
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 1315423911 + seedStr.charCodeAt(i)) >>> 0;
    const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000;

    // time baseline
    let wake = age > 50 ? 5.5 : 6.0;
    let sleep = age > 50 ? 22 : 23;
    if (health < 50) { wake += 0.5; sleep -= 0.5; }

    const workStart = 9, workEnd = 19;

    // food pools
    const proteins = ['chicken', 'fish', 'eggs', 'tofu', 'paneer', 'lentils', 'beans', 'turkey', 'greek yogurt', 'tempeh'];
    const grains = ['oats', 'brown rice', 'quinoa', 'millet', 'whole wheat bread'];
    const vegs = ['spinach', 'broccoli', 'carrot', 'bell pepper', 'mixed salad greens', 'tomato', 'cucumber'];
    const fats = ['avocado', 'olive oil', 'almonds', 'walnuts', 'flaxseeds'];
    const hydros = ['water', 'coconut water', 'buttermilk', 'herbal tea'];

    function pick(pool, n = 1) {
      const out = [];
      const used = new Set();
      for (let tries = 0; out.length < Math.min(n, pool.length) && tries < 100; tries++) {
        const idx = Math.floor(rand() * pool.length);
        if (!used.has(idx)) { used.add(idx); out.push(pool[idx]); }
      }
      return out;
    }

    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const week = {};
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      const isWeekend = (d === 'Saturday' || d === 'Sunday');

      const wOff = (rand() - 0.5) * 0.5;
      const dayWake = wake + wOff;
      const slots = [];
      slots.push({ time: fmt12(dayWake), activity: 'Wake up & hydrate (250-350 ml)' });
      slots.push({ time: fmt12(dayWake + 0.17), activity: 'Stretch / mobility (5–10 min)' });
      const med = Math.round(6 + (rand() * 12));
      slots.push({ time: fmt12(dayWake + 0.33), activity: `Meditation (${med} min)` });
      slots.push({ time: fmt12(dayWake + 0.75), activity: 'Breakfast — protein + whole grain + fruit' });

      if (dayWake + 1.5 < workStart && !isWeekend) {
        slots.push({ time: fmt12(dayWake + 1.5), activity: rand() < 0.6 ? 'Personal study / planning (25–40 min)' : 'Quick hobby time (20–30 min)' });
      }

      slots.push({ time: fmt12(workStart), activity: 'Work / School (09:00 AM - 07:00 PM)' });
      const lunchHour = 12 + Math.round(rand() * 90) / 60;
      slots.push({ time: fmt12(lunchHour), activity: 'Lunch — balanced & hydrate' });

      if (isWeekend) {
        const ex = rand() < 0.5 ? 'Long walk / hike' : 'Extended hobby session';
        slots.push({ time: fmt12(17 + rand()), activity: `${ex} (45–75 min)` });
        slots.push({ time: fmt12(18.5 + rand()), activity: `${hobby} (60–90 min)` });
      } else {
        const after = workEnd + 0.25 + rand() * 0.7;
        const ex = rand() < 0.5 ? 'Cardio or strength (30–50 min)' : 'Yoga / mobility (30–45 min)';
        slots.push({ time: fmt12(after), activity: `${ex}` });
        if (rand() < 0.6) slots.push({ time: fmt12(after + 0.9), activity: `${hobby} (30–60 min)` });
      }

      const dinner = Math.max(sleep - 2 + (rand() - 0.5) * 0.5, 17.5);
      slots.push({ time: fmt12(dinner), activity: 'Dinner — lighter & vegetable-forward; hydrate' });
      slots.push({ time: fmt12(sleep - 1), activity: 'Light walk / family time' });
      slots.push({ time: fmt12(sleep - 0.5), activity: 'Wind down: reading / screen-free' });
      slots.push({ time: fmt12(sleep), activity: 'Sleep' });

      // dedupe & sort
      const map = {};
      slots.forEach(s => map[s.time] = s.activity);
      const entries = Object.keys(map).map(t => {
        const [hm, ap] = t.split(' ');
        const [hs, ms] = hm.split(':').map(x => parseInt(x,10));
        let h24 = hs % 12;
        if (ap === 'PM') h24 += 12;
        return { time: t, activity: map[t], totalMin: h24 * 60 + ms };
      }).sort((a,b) => a.totalMin - b.totalMin);
      week[d] = entries.map(e => ({ time: e.time, activity: e.activity }));
    }

    // weeklyDiet with explicit items using protein(item) style
    const weeklyDiet = {};
    for (const d of Object.keys(week)) {
      const bProt = pick(proteins, 2)[0] || 'eggs';
      const lProt = pick(proteins, 1)[0] || 'chicken';
      const diProt = pick(proteins, 1)[0] || 'lentils';
      const grainB = pick(grains, 1)[0];
      const grainL = pick(grains, 1)[0];
      const vegA = pick(vegs, 2).join(', ');
      const vegB = pick(vegs, 2).join(', ');
      const fat = pick(fats, 1)[0];
      const hydro = pick(hydros, 1)[0];

      let diet = `Hydration: ${hydro} (aim 2–3L). Breakfast: ${grainB} + protein(${bProt}) + fruit. `;
      diet += `Lunch: ${grainL} + vegetables(${vegA}) + protein(${lProt}). Snack: nuts/Greek yogurt. `;
      diet += `Dinner: vegetables(${vegB}) + protein(${diProt}) + healthy fat(${fat}).`;
      if (d === 'Saturday' || d === 'Sunday') diet += ' Slightly larger carb portion for weekend activity.';
      if ((profileLocal && profileLocal.dietPreference && profileLocal.dietPreference.toLowerCase().includes('veg')) || dietPref.includes('veg')) {
        diet = diet.replace(/\b(chicken|fish|turkey|eggs|paneer)\b/gi, 'plant protein (tofu/legumes/paneer if allowed)');
      }
      weeklyDiet[d] = diet;
    }

    const advantages = `A consistent routine balances morning rituals, focused work blocks (09:00 AM - 07:00 PM), regular movement and hobby time, and mindful evening wind-downs. Daily variation keeps the plan engaging while diet suggestions list specific foods (e.g., protein(chicken)). Over weeks, this improves energy, sleep and stress resilience.`;

    return { week, weeklyDiet, advantages, meta: { generatedAt: new Date().toISOString(), by: 'fallback-rules-12hr' } };
  }

  // Build a descriptive prompt for the LLM (strict formatting instructions)
  const promptParts = [];
  promptParts.push(`You are an expert lifestyle coach and registered nutritionist.`);
  promptParts.push(`Generate a personalized weekly schedule and diet for a single user. Return STRICT JSON ONLY with these keys:`);
  promptParts.push(`- week: an object with keys: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Each day must be an array of objects sorted by time. Each item: { "time": "hh:mm AM/PM", "activity": "short description" }`);
  promptParts.push(`- advantages: a short paragraph (1-3 sentences) describing benefits of following this schedule.`);
  promptParts.push(`- weeklyDiet: an object mapping each day to a detailed diet string. Each day's diet must include explicit example food items and mention protein(food_item) style at least once (for example: protein(chicken), whole grains (oats), vegetables (spinach), healthy fats (avocado)). Also include hydration suggestions.`);
  promptParts.push(`Additional rules:`);
  promptParts.push(`1) Reserve 09:00 AM to 07:00 PM as work/school time (do not put other major activities inside this block).`);
  promptParts.push(`2) Use user's profile below to adapt intensity, exercise type and times. Consider Age, Gender, Goal, HealthScore, Height, Weight, Hobby, Religion, DietPreference.`);
  promptParts.push(`3) Times must be in 12-hour AM/PM format (e.g., 06:30 AM, 11:15 PM).`);
  promptParts.push(`4) Provide meaningful variation across days; weekdays and weekends should differ. Include exercise/gym slots (if appropriate), meditation/yoga, hobby time, study/work time, wind-down and sleep.`);
  promptParts.push(`5) For diet, provide concrete examples of foods for breakfast, lunch, dinner and snacks (use protein(food_item) syntax at least once).`);
  promptParts.push(`6) Output JSON ONLY. No explanatory text, no markdown, no code fences. If you cannot generate, return an empty object {}.`);
  promptParts.push(`User profile (JSON): ${JSON.stringify(profile, null, 2)}`);
  const prompt = promptParts.join('\n\n');

  try {
    // call the model (your existing "model" variable in llmService.js)
    const resp = await model.generateContent(prompt);
    const raw = (typeof resp.response.text === 'function') ? resp.response.text() : String(resp.response || resp);

    // Try to extract a JSON object substring
    let jsonMatch = raw.match(/\{[\s\S]*\}/);
    let parsed = null;
    if (jsonMatch) {
      const candidate = jsonMatch[0];
      try {
        parsed = JSON.parse(candidate);
      } catch (e) {
        // try sanitize then parse
        const sanitized = sanitizePossibleJson(candidate);
        try {
          parsed = JSON.parse(sanitized);
        } catch (e2) {
          // last attempt: try to extract top-level keys manually (not reliable)
          parsed = null;
        }
      }
    }

    // Validate parsed shape: must be an object with week, advantages, weeklyDiet
    const validShape = parsed && typeof parsed === 'object' && parsed.week && parsed.advantages && parsed.weeklyDiet;
    if (validShape) {
      // Ensure week has Monday..Sunday arrays with proper items and times in hh:mm AM/PM
      const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      let shapeOk = true;
      for (const d of days) {
        if (!Array.isArray(parsed.week[d])) { shapeOk = false; break; }
        // quick check of items
        for (const it of parsed.week[d]) {
          if (!it || typeof it.time !== 'string' || typeof it.activity !== 'string') { shapeOk = false; break; }
          // ensure time contains AM or PM
          if (!(/\bAM\b|\bPM\b/i.test(it.time))) { shapeOk = false; break; }
        }
        if (!shapeOk) break;
        if (typeof parsed.weeklyDiet[d] !== 'string') { shapeOk = false; break; }
      }
      if (shapeOk) {
        // success: return parsed, but normalize times by trimming
        for (const d of Object.keys(parsed.week)) {
          parsed.week[d] = parsed.week[d].map(item => ({ time: String(item.time).trim(), activity: String(item.activity).trim() }));
          parsed.weeklyDiet[d] = String(parsed.weeklyDiet[d]).trim();
        }
        parsed.advantages = String(parsed.advantages).trim();
        return parsed;
      } else {
        // treat as invalid
        console.warn("LLM returned JSON but shape invalid — falling back.", parsed);
      }
    } else {
      console.warn("LLM did not return a valid JSON with required keys; falling back. Raw:", raw.slice(0, 1000));
    }
  } catch (err) {
    console.error("LLM call failed for generateWeeklyRoutine:", err);
  }

  // If we reach here, the AI failed or output invalid JSON — return deterministic fallback
  try {
    const fallback = fallbackGenerator(profile);
    return fallback;
  } catch (fbErr) {
    console.error("Fallback generator also failed:", fbErr);
    // minimal safe default
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const week = {};
    days.forEach(d => {
      week[d] = [
        { time: '06:00 AM', activity: 'Wake up & hydrate' },
        { time: '06:30 AM', activity: 'Stretch / mobility' },
        { time: '07:00 AM', activity: 'Breakfast' },
        { time: '09:00 AM', activity: 'Work / School block' },
        { time: '12:30 PM', activity: 'Lunch' },
        { time: '07:00 PM', activity: 'Exercise / Hobby' },
        { time: '09:00 PM', activity: 'Dinner' },
        { time: '11:00 PM', activity: 'Sleep' },
      ];
    });
    const weeklyDiet = {};
    days.forEach(d => weeklyDiet[d] = 'Balanced meals with protein(chicken/legumes), whole grains (oats), vegetables (spinach), healthy fats (olive oil), hydrate.');
    return { week, weeklyDiet, advantages: 'Follow consistent routine for better energy and sleep.', meta: { fallback: true } };
  }
}