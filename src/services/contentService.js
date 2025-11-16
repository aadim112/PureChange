import { db, storage } from "../firebase";
import { ref, get, update, set, push, remove, serverTimestamp, runTransaction, onValue } from 'firebase/database';
import { ref as storageRef, listAll, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const dailyPath = (uid) => `users/${uid}/dailyData`;

export async function getDailyData(userId) {
  const snap = await get(ref(db, dailyPath(userId)));
  return snap.exists() ? snap.val() : {};
}

export async function initDailyDataIfMissing(userId, defaultChecklist) {
  if (!userId) return;

  const pathRef = ref(db, dailyPath(userId));
  const snap = await get(pathRef);
  const today = new Date().toDateString();

  if (!snap.exists()) {
    return;
  }

  const data = snap.val();

  if (data.lastChecklistUpdateDate !== today) {
    const updatedData = {
      ...data,
      lastChecklistUpdateDate: today,
      dailyChecklist: defaultChecklist || data.dailyChecklist,
    };

    await update(pathRef, updatedData);
    return updatedData;
  }

  return data;
}

export async function updateDailyDataFields(userId, updates) {
  return update(ref(db, dailyPath(userId)), updates);
}

export async function setDailyChecklist(userId, checklist) {
  return updateDailyDataFields(userId, { dailyChecklist: checklist });
}

export async function toggleChecklistItem(userId, itemKey, checked, label) {
  const partial = {};
  partial[`dailyChecklist/${itemKey}`] = [checked, label];
  return updateDailyDataFields(userId, partial);
}

export async function buildDailyChecklistForUser(userId) {
  const dummyChecklist = {
    yoga: [false, "Dummy Yoga."],
    drinkWater: [false, "Dummy Water."],
    morningRoutine: [false, "Dummy Morning Routine."],
    daytimeRoutine: [false, "Dummy Daytime Routine."],
    wakeupTime: [false, "Dummy Wakeup Time."]
  };

  if (!userId) return dummyChecklist;

  const today = new Date().toDateString();
  const userDailyRefPath = (uid) => `users/${uid}/dailyData`;
  const tasksPoolRefPath = `content/otherContent/daily-tasks`;

  try {
    const userRef = ref(db, userDailyRefPath(userId));
    const userSnap = await get(userRef);
    const userDaily = userSnap && userSnap.exists() ? userSnap.val() : {};

    if (userDaily.lastChecklistUpdateDate === today && userDaily.dailyChecklist) {
      return userDaily.dailyChecklist;
    }

    const poolRef = ref(db, tasksPoolRefPath);
    const poolSnap = await get(poolRef);
    const pool = [];
    if (poolSnap && poolSnap.exists()) {
      const raw = poolSnap.val();
      Object.entries(raw).forEach(([id, obj]) => {
        const actual = obj && obj.actual_content ? String(obj.actual_content).trim() : null;
        if (!actual) return;
        const m = actual.match(/^([^:]+)\s*:\s*(.+)$/);
        if (m) {
          pool.push({ id, rawText: actual, prefix: m[1].trim(), textAfter: m[2].trim() });
        } else {
          pool.push({ id, rawText: actual, prefix: null, textAfter: actual });
        }
      });
    }

    const findByPrefix = (prefixList) => {
      if (!pool.length) return null;
      const lowered = prefixList.map(p => String(p).toLowerCase());
      const found = pool.find(p => p.prefix && lowered.includes(p.prefix.toLowerCase()));
      return found || null;
    };

    const yogaPrefixes = [
      "Yoga", "yoga", "YOGA",
      "Yoga ", " Yoga",
      "Yoga-", "Yoga_",
      "Yoga Routine", "YogaRoutine", "Yoga_Routine"
    ];

    const waterPrefixes = [
      "Water", "water", "WATER",
      "Water ", " Water",
      "Water-", "Water_",
      "Drink Water", "drink water",
      "Water Intake", "WaterIntake"
    ];

    const morningPrefixes = [
      "Morning Routine", "morning routine", "MORNING ROUTINE",
      "Morning", "morning",
      "MorningRoutine", "Morning_Routine",
      "Exercise", "exercise",
      "Morning Exercise", "MorningExercise"
    ];

    const daytimePrefixes = [
      "Daytime Routine", "daytime routine", "DAYTIME ROUTINE",
      "Daytime", "daytime",
      "Routine", "routine",
      "DaytimeRoutine", "Daytime_Routine",
      "Daily Routine", "daily routine"
    ];

    const wakeupPrefixes = [
      "Wakeup", "wakeup", "WAKEUP",
      "Wake Up", "wake up", "WAKE UP",
      "Wakeup Time", "WakeUpTime", "Wakeup_Time",
      "Wake Time", "wake time"
    ];

    const prevIds = Array.isArray(userDaily.lastDailyTaskIds) ? userDaily.lastDailyTaskIds : [];

    const ensureCandidateFor = async (prefixVariants, dummyPrefixLabel) => {
      const cand = pool.find(p => p.prefix && prefixVariants.some(pref => p.prefix.toLowerCase() === String(pref).toLowerCase()));
      if (cand) return cand;
      const dummyContent = `${prefixVariants[0]}: ${dummyPrefixLabel}`;
      try {
        const newRef = push(ref(db, tasksPoolRefPath));
        await set(newRef, { actual_content: dummyContent });
        const newId = newRef.key;
        const created = { id: newId, rawText: dummyContent, prefix: prefixVariants[0], textAfter: dummyPrefixLabel };
        pool.push(created);
        return created;
      } catch (err) {
        console.warn("buildDailyChecklistForUser: failed creating dummy entry", err);
        return null;
      }
    };

    const yogaCandidate = await ensureCandidateFor(["Yoga"], "Dummy Yoga.");
    const waterCandidate = await ensureCandidateFor(["Water"], "Dummy Water.");
    const morningCandidate = await ensureCandidateFor(["Morning Routine", "Morning"], "Dummy Morning Routine.");
    const daytimeCandidate = await ensureCandidateFor(["Daytime Routine", "Daytime", "Routine"], "Dummy Daytime Routine.");
    const wakeupCandidate = await ensureCandidateFor(["Wakeup", "Wake Up", "Wakeup Time"], "Dummy Wakeup Time.");

    if (!yogaCandidate || !waterCandidate || !morningCandidate || !daytimeCandidate || !wakeupCandidate) {
      return dummyChecklist;
    }

    const checklist = {
      yoga: [false, yogaCandidate.textAfter],
      drinkWater: [false, waterCandidate.textAfter],
      morningRoutine: [false, morningCandidate.textAfter],
      daytimeRoutine: [false, daytimeCandidate.textAfter],
      wakeupTime: [false, wakeupCandidate.textAfter]
    };

    const toPersist = {
      lastChecklistUpdateDate: today,
      lastDailyTaskIds: [yogaCandidate.id, waterCandidate.id, morningCandidate.id, daytimeCandidate.id, wakeupCandidate.id],
      dailyChecklist: checklist
    };

    try {
      await update(userRef, toPersist);
    } catch (err) {
      console.warn("buildDailyChecklistForUser: failed to persist user dailyData", err);
    }

    return checklist;
  } catch (err) {
    console.error("buildDailyChecklistForUser: unexpected error", err);
    return dummyChecklist;
  }
}

export async function getUserVerseState(userId) {
  const snap = await get(ref(db, dailyPath(userId)));
  if (snap.exists()) {
    const val = snap.val();
    return {
      lastVerseDate: val.lastVerseDate || null,
      currentVerseIndex: val.currentVerseIndex ?? 0,
      shuffledVerseKeys: val.shuffledVerseKeys || []
    };
  }
  return {
    lastVerseDate: null,
    currentVerseIndex: 0,
    shuffledVerseKeys: []
  };
}

export async function updateUserVerseState(userId, updates) {
  return update(ref(db, dailyPath(userId)), updates);
}

export async function handleDailyVerseLogic(userId, allVerseKeys) {
  const today = new Date().toDateString();
  let { lastVerseDate, currentVerseIndex, shuffledVerseKeys } = await getUserVerseState(userId);

  const keysMatch = shuffledVerseKeys &&
    shuffledVerseKeys.length === allVerseKeys.length &&
    allVerseKeys.every(key => shuffledVerseKeys.includes(key));

  if (!lastVerseDate || lastVerseDate !== today) {
    if (!keysMatch || currentVerseIndex >= allVerseKeys.length - 1) {
      shuffledVerseKeys = shuffleArray(allVerseKeys);
      currentVerseIndex = 0;
    } else {
      currentVerseIndex++;
    }

    await updateUserVerseState(userId, {
      lastVerseDate: today,
      shuffledVerseKeys,
      currentVerseIndex
    });
  }

  return shuffledVerseKeys[currentVerseIndex];
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

export async function uploadMotivationalImages(file, onProgress) {
  try {
    const folderRef = storageRef(storage, "content/motivational_images");

    // List all files in the folder
    const existingFiles = await listAll(folderRef);
    let maxIndex = 0;

    existingFiles.items.forEach(item => {
      const name = item.name; // e.g., "image_1.jpg"
      const match = name.match(/^image_(\d+)\.jpg$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxIndex) maxIndex = num;
      }
    });

    const nextIndex = maxIndex + 1;
    const path = `content/motivational_images/image_${nextIndex}.jpg`;
    const fileRef = storageRef(storage, path);
    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(percent);
        },
        (error) => {
          console.error("❌ Upload failed:", error);
          reject({ success: false });
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ success: true, url });
        }
      );
    });
  } catch (error) {
    console.error("❌ Error uploading motivational image:", error);
    return { success: false };
  }
}

export async function uploadMotivationalVideos(file, onProgress) {
  try {
    const folderRef = storageRef(storage, "content/motivational_videos");

    // List all existing files
    const existingFiles = await listAll(folderRef);
    let maxIndex = 0;

    existingFiles.items.forEach(item => {
      const name = item.name; // e.g., "video_1.mp4"
      const match = name.match(/^video_(\d+)\.mp4$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxIndex) maxIndex = num;
      }
    });

    const nextIndex = maxIndex + 1;
    const path = `content/motivational_videos/video_${nextIndex}.mp4`;
    const fileRef = storageRef(storage, path);
    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(percent);
        },
        (error) => {
          console.error("❌ Upload failed:", error);
          reject({ success: false });
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ success: true, url });
        }
      );
    });
  } catch (error) {
    console.error("❌ Error uploading motivational video:", error);
    return { success: false };
  }
}