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

export async function generateEmergencyMotivation(goal, currentStreak) {
  if (!goal) {
    return {
      line1: "You are stronger than this urge.",
      line2: "This feeling will pass in 15 minutes.",
      task: "Do 20 push-ups RIGHT NOW"
    };
  }

  try {
    const prompt = `
You are helping someone resist masturbation urge in a critical moment.

User's Goal: "${goal}"
Current Streak: ${currentStreak} days

Create SHORT, POWERFUL motivation (NOT a paragraph):
1. First line: One powerful sentence connecting to their goal (max 12 words)
2. Second line: One encouraging fact or reminder (max 12 words)
3. Task: ONE simple physical task they can do immediately (max 8 words)

Rules:
- NO lengthy explanations or paragraphs
- Use simple, direct language
- Make it emotional but SHORT
- Task should be physical and take under 2 minutes

Return ONLY in this JSON format:
{
  "line1": "short powerful sentence",
  "line2": "short encouragement",
  "task": "simple physical task"
}
`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No valid JSON in model response");

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (error) {
    console.error("❌ Emergency Motivation Error:", error);
    return {
      line1: `Don't destroy your ${currentStreak} days for 5 minutes.`,
      line2: "Your goal matters more than this urge.",
      task: "Do 25 jumping jacks NOW"
    };
  }
}

export async function getSimpleAlternativeTask(hobby, checklist) {
  try {
    // Get first incomplete task
    const incompleteTask = Object.entries(checklist)
      .filter(([key, value]) => !value[0])
      .map(([key, value]) => value[1])[0];

    const prompt = `
User hobby: ${hobby || "none"}
Incomplete task: ${incompleteTask || "none"}

Suggest ONE simple activity to do RIGHT NOW (not later) to distract from masturbation urge.
- Must take 2-5 minutes max
- Must be immediately doable
- Prefer incomplete task if exists
- If no task, use hobby or suggest physical activity

Return ONLY the activity as one short sentence (max 10 words). NO explanation.
Example: "Complete your yoga right now"
Example: "Run up and down stairs 5 times"
`;

    const result = await model.generateContent(prompt);
    const task = result.response.text().trim().replace(/['"]/g, '');
    return task;
  } catch (error) {
    console.error("❌ Alternative Task Error:", error);
    const incompleteTask = Object.entries(checklist)
      .filter(([key, value]) => !value[0])
      .map(([key, value]) => value[1])[0];
    
    return incompleteTask || "Take a cold shower for 2 minutes";
  }
}