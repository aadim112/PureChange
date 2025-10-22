import { ref, set, get, push, serverTimestamp } from "firebase/database";
import { db } from "../firebase";

// Add a new verse/shlok
export async function addVerse(religion, actualContent, englishTransaltion, hindiTransaltion, explanation) {
  try {
    const contentRef = ref(db, `content/${religion}`);
    const newVerseRef = push(contentRef);

    const verseData = {
      actual_content: actualContent,
      eng_translation: englishTransaltion,
      hi_transaltion: hindiTransaltion,
      explanation: explanation,
      timestamp: new Date().toISOString(),
      id: newVerseRef.key,
    };

    await set(newVerseRef, verseData);
    console.log("✅ Verse added successfully:", verseData);
    return { success: true, data: verseData };
  } catch (error) {
    console.error("❌ Error adding verse:", error);
    return { success: false, error };
  }
}

// Fetch all verses of a given religion
export async function getVersesByReligion(religion) {
  try {
    const contentRef = ref(db, `content/${religion}`);
    const snapshot = await get(contentRef);

    if (snapshot.exists()) {
      return Object.values(snapshot.val());
    } else {
      return [];
    }
  } catch (error) {
    console.error("❌ Error fetching verses:", error);
    return [];
  }
}