import { ref, set, get, push, serverTimestamp } from "firebase/database";
import { db } from "../firebase";

// Add a new verse/shlok
export async function addVerse(religion, actualContent, question, englishTranslation, hindiTranslation, explanation) {
  try {
    const religionRef = ref(db, `content/${religion}`);
    const uniqueId = push(religionRef).key;

    let nextVerseNum = 1;
    try {
      const snapshot = await get(religionRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const verseKeys = Object.keys(data);
        
        const verseNumbers = verseKeys
          .filter(key => key.startsWith('Verse_'))
          .map(key => parseInt(key.split('_')[1], 10))
          .filter(num => !isNaN(num));

        if (verseNumbers.length > 0) {
          const maxNum = Math.max(...verseNumbers);
          nextVerseNum = maxNum + 1;
        }
      }
    } catch (getCountError) {
      console.error("❌ Error getting verse count:", getCountError);
    }

    const newVerseKey = `Verse_${nextVerseNum}`;
    const newVerseRef = ref(db, `content/${religion}/${newVerseKey}`);

    const verseData = {
      actual_content: actualContent,
      question: question,
      eng_translation: englishTranslation,
      hi_translation: hindiTranslation,
      explanation: explanation,
      timestamp: new Date().toISOString(),
      id: uniqueId, 
    };

    await set(newVerseRef, verseData);

    console.log(`✅ Verse added successfully at ${newVerseKey}:`, verseData);
    return { success: true, data: verseData, path: newVerseRef.toString() };

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
      return snapshot.val();
    } else {
      return [];
    }
  } catch (error) {
    console.error("❌ Error fetching verses:", error);
    return [];
  }
}