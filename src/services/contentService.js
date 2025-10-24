import { ref, set, get, push, remove, serverTimestamp } from "firebase/database";
import { db } from "../firebase";

// Add a new verse/shlok
export async function addVerse(religion, actualContent, question, englishTranslation, hindiTranslation, explanation) {
  try {
    const religionRef = ref(db, `content/religionalContent/${religion}`);
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
    const newVerseRef = ref(db, `content/religionalContent/${religion}/${newVerseKey}`);

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
    const contentRef = ref(db, `content/religionalContent/${religion}`);
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

export async function addOtherContent(contentType, content){
  try {
    const religionRef = ref(db, `content/otherContent/${contentType}`);
    const uniqueId = push(religionRef).key;

    const newContentRef = ref(db, `content/otherContent/${contentType}/${uniqueId}`);

    const Data = {
      actual_content: content,
      id: uniqueId, 
    };

    await set(newContentRef, Data);

    console.log(`✅ ${contentType} added successfully at ${uniqueId}:`, Data);
    return { success: true, data: Data, path: newContentRef.toString() };

  } catch (error) {
    console.error("❌ Error adding verse:", error);
    return { success: false, error };
  }
}

export async function showOtherContent(contentType){
  try {
    const contentRef = ref(db, `content/otherContent/${contentType}`);
    const snapshot = await get(contentRef);

    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return [];
    }
  } catch (error) {
    console.error(`❌ Error fetching ${contentType} content:`, error);
    return [];
  }
}

export async function removeOtherContent(contentType, id) {
  try {
    if (!contentType || !id) {
      throw new Error("❌ Missing contentType or id for removal.");
    }

    const contentRef = ref(db, `content/otherContent/${contentType}/${id}`);

    await remove(contentRef);

    console.log(`🗑️ Successfully removed ${contentType} with id: ${id}`);
    return { success: true, id };

  } catch (error) {
    console.error(`❌ Error removing ${contentType} with id ${id}:`, error);
    return { success: false, error };
  }
}
