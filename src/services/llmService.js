import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyBmZy9wwObQ3kV6uFWVs9b7ckvAkgcDt7c";
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