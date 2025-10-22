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
      is_valid: 0,
      error: "Missing verse text or religion",
    };
  }

  try {
    // 🧠 Step 1: Combined LLM prompt for validation + translations + motivation
    const prompt = `
You are a religious scholar and translator.
Given a verse/shlok and its mentioned religion, do the following in JSON format:

1. Check if this verse actually exists in that religion’s authentic texts (like Bhagavad Gita, Dhammapada, Quran, Bible, etc.).
2. Translate it to *English* and *Hindi* (faithfully and respectfully).
3. Write a short, inspiring motivational paragraph capturing the inner and philosophical meaning of the verse (in English).
4. If the verse is not valid or not traceable, return all fields null and "is_valid" = 0.

Return strictly in JSON as:
{
  "actual_content": "",
  "translation_english": "",
  "translation_hindi": "",
  "motivation": "",
  "is_valid": 1 or 0
}

Now process this:
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
      is_valid: 0,
      error: error.message,
    };
  }
}