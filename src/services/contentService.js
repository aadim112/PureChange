import { db, storage } from "../firebase";
import { ref, get, update, set, push, remove, serverTimestamp, runTransaction, onValue } from 'firebase/database';
import { ref as storageRef, listAll, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const dailyPath = (uid) => `users/${uid}/dailyData`;

export async function getDailyData(userId) {
  const snap = await get(ref(db, dailyPath(userId)));
  return snap.exists() ? snap.val() : {};
}

export async function initDailyDataIfMissing(userId, defaultChecklist) {
  if (!userId) return {};

  const pathRef = ref(db, dailyPath(userId));
  const snap = await get(pathRef);
  const today = new Date().toDateString();

  // If dailyData doesn't exist at all, create initial structure
  if (!snap.exists()) {
    const initialData = {
      lastChecklistUpdateDate: today,
      dailyChecklist: defaultChecklist,
      lastDailyTaskIds: [],
      fapLastAskedDate: null,
      fapLastAskedTimeTag: null,
      lastNFUpdateDate: null,
      lastDTUpdateDate: null,
      planExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toDateString()
    };
    
    await set(pathRef, initialData);
    console.log("✅ Created initial dailyData structure");
    return initialData;
  }

  const data = snap.val();

  // Check if it's a new day - if yes, update the checklist
  if (data.lastChecklistUpdateDate !== today) {
    console.log("🔄 New day detected - updating checklist");
    
    const updatedData = {
      ...data,
      lastChecklistUpdateDate: today,
      dailyChecklist: defaultChecklist, // Use the fresh checklist built for today
    };

    await update(pathRef, updatedData);
    console.log("✅ Checklist updated for new day:", today);
    return updatedData;
  }

  console.log("ℹ️ Same day - returning existing checklist");
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

    // Only return existing checklist if it's from today
    if (userDaily.lastChecklistUpdateDate === today && userDaily.dailyChecklist) {
      console.log("ℹ️ Returning today's existing checklist");
      return userDaily.dailyChecklist;
    }

    console.log("🔨 Building fresh checklist for today");

    // Fetch the pool of available tasks
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

    // Get previously used task IDs to avoid immediate repetition
    const prevIds = Array.isArray(userDaily.lastDailyTaskIds) ? userDaily.lastDailyTaskIds : [];

    // Helper to find tasks by prefix, avoiding previous IDs if possible
    const findByPrefix = (prefixList, avoidIds = []) => {
      if (!pool.length) return null;
      const lowered = prefixList.map(p => String(p).toLowerCase());
      
      // First try: match prefix AND avoid previous IDs
      let found = pool.find(p => 
        p.prefix && 
        lowered.includes(p.prefix.toLowerCase()) &&
        !avoidIds.includes(p.id)
      );
      
      // If no new task found, allow repeating but still match prefix
      if (!found) {
        found = pool.find(p => p.prefix && lowered.includes(p.prefix.toLowerCase()));
      }
      
      return found || null;
    };

    const yogaPrefixes = ["Yoga", "yoga", "YOGA", "Yoga Routine", "YogaRoutine"];
    const waterPrefixes = ["Water", "water", "Drink Water", "Water Intake"];
    const morningPrefixes = ["Morning Routine", "Morning", "Exercise", "Morning Exercise"];
    const daytimePrefixes = ["Daytime Routine", "Daytime", "Routine", "Daily Routine"];
    const wakeupPrefixes = ["Wakeup", "Wake Up", "Wakeup Time", "Wake Time"];

    // Create dummy entries if needed
    const ensureCandidateFor = async (prefixVariants, dummyPrefixLabel) => {
      const cand = findByPrefix(prefixVariants, prevIds);
      if (cand) return cand;
      
      // Create dummy if no candidate exists
      const dummyContent = `${prefixVariants[0]}: ${dummyPrefixLabel}`;
      try {
        const newRef = push(ref(db, tasksPoolRefPath));
        await set(newRef, { actual_content: dummyContent });
        const newId = newRef.key;
        const created = { 
          id: newId, 
          rawText: dummyContent, 
          prefix: prefixVariants[0], 
          textAfter: dummyPrefixLabel 
        };
        pool.push(created);
        console.log(`✅ Created dummy task: ${prefixVariants[0]}`);
        return created;
      } catch (err) {
        console.warn("Failed creating dummy entry", err);
        return null;
      }
    };

    // Find or create candidates for each category
    const yogaCandidate = await ensureCandidateFor(yogaPrefixes, "Complete your yoga session");
    const waterCandidate = await ensureCandidateFor(waterPrefixes, "Drink 8 glasses of water");
    const morningCandidate = await ensureCandidateFor(morningPrefixes, "Complete morning exercise");
    const daytimeCandidate = await ensureCandidateFor(daytimePrefixes, "Follow your daily routine");
    const wakeupCandidate = await ensureCandidateFor(wakeupPrefixes, "Wake up at scheduled time");

    // Fallback to dummy if any candidate is missing
    if (!yogaCandidate || !waterCandidate || !morningCandidate || !daytimeCandidate || !wakeupCandidate) {
      console.warn("⚠️ Some candidates missing, using dummy checklist");
      return dummyChecklist;
    }

    // Build the fresh checklist for today
    const checklist = {
      yoga: [false, yogaCandidate.textAfter],
      drinkWater: [false, waterCandidate.textAfter],
      morningRoutine: [false, morningCandidate.textAfter],
      daytimeRoutine: [false, daytimeCandidate.textAfter],
      wakeupTime: [false, wakeupCandidate.textAfter]
    };

    // Persist the new checklist with today's date
    const toPersist = {
      lastChecklistUpdateDate: today,
      lastDailyTaskIds: [
        yogaCandidate.id, 
        waterCandidate.id, 
        morningCandidate.id, 
        daytimeCandidate.id, 
        wakeupCandidate.id
      ],
      dailyChecklist: checklist
    };

    try {
      await update(userRef, toPersist);
      console.log("✅ Fresh checklist persisted for:", today);
    } catch (err) {
      console.warn("Failed to persist checklist", err);
    }

    return checklist;
  } catch (err) {
    console.error("buildDailyChecklistForUser: unexpected error", err);
    return dummyChecklist;
  }
}

// ... rest of your existing functions remain unchanged ...

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

async function listMotivationalMedia(folderPath) {
  try {
    const folderRef = storageRef(storage, folderPath);
    const listed = await listAll(folderRef);
    if (!listed || !listed.items || listed.items.length === 0) return [];
    const urls = await Promise.all(listed.items.map(it => getDownloadURL(it)));
    // return array of { name, url } for easy persist/comparison
    return listed.items.map((it, idx) => ({ name: it.name, url: urls[idx] }));
  } catch (err) {
    console.error(`listMotivationalMedia(${folderPath}) failed`, err);
    return [];
  }
}

export async function listMotivationalImages() {
  return listMotivationalMedia("content/motivational_images");
}

export async function listMotivationalVideos() {
  return listMotivationalMedia("content/motivational_videos");
}

function pickRandomFromArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

/**
 * getDailyMotivation(userId)
 * Returns object:
 * {
 *   date: 'Thu Nov 17 2025',
 *   image: { name, url },
 *   video: { name, url },
 *   article: { id, actual_content },
 *   quote: { id, actual_content }
 * }
 *
 * Persists in users/{uid}/dailyData.lastMotivationSelection
 */
export async function getDailyMotivation(userId) {
  if (!userId) {
    // no user -> just return a non-persisted random pick from pools
    const imgs = await listMotivationalImages();
    const vids = await listMotivationalVideos();
    const articlesMap = await showOtherContent('article'); // returns map
    const quotesMap = await showOtherContent('quote');

    const articleEntries = articlesMap ? Object.entries(articlesMap) : [];
    const quoteEntries = quotesMap ? Object.entries(quotesMap) : [];

    return {
      date: new Date().toDateString(),
      image: pickRandomFromArray(imgs),
      video: pickRandomFromArray(vids),
      article: articleEntries.length ? { id: articleEntries[0][0], actual_content: articleEntries[0][1].actual_content } : null,
      quote: quoteEntries.length ? { id: quoteEntries[0][0], actual_content: quoteEntries[0][1].actual_content } : null
    };
  }

  // get previous user daily data
  const dailyRef = ref(db, `users/${userId}/dailyData`);
  const snap = await get(dailyRef);
  const today = new Date().toDateString();
  const prev = snap && snap.exists() ? snap.val() : {};

  if (prev.lastMotivationSelection && prev.lastMotivationSelection.date === today) {
    // already chosen for today, return persisted selection
    return prev.lastMotivationSelection;
  }

  // fetch pools
  const [imgs, vids] = await Promise.all([listMotivationalImages(), listMotivationalVideos()]);
  const articlesMap = await showOtherContent('article');
  const quotesMap = await showOtherContent('quote');

  const articleEntries = articlesMap ? Object.entries(articlesMap) : [];
  const quoteEntries = quotesMap ? Object.entries(quotesMap) : [];

  // Build candidate pools (objects with {id, actual_content} for articles/quotes)
  const articlePool = articleEntries.map(([id, obj]) => ({ id, actual_content: obj.actual_content }));
  const quotePool = quoteEntries.map(([id, obj]) => ({ id, actual_content: obj.actual_content }));

  // avoid repeating yesterday's exact same items (if available in prev.lastMotivationSelection)
  const prevSel = prev.lastMotivationSelection || {};
  const chooseNonRepeating = (pool, prevKeyChecker) => {
    if (!pool || pool.length === 0) return null;
    // if pool length is 1 -> must pick it
    if (pool.length === 1) return pool[0];
    // try to pick a different element than previous one
    const prevId = prevKeyChecker(prevSel);
    const filtered = pool.filter(p => {
      if (!prevId) return true;
      // prevSel might store object shapes for image/video with name or for article/quote with id
      if (p.name) return p.name !== prevId;
      if (p.id) return p.id !== prevId;
      return true;
    });
    // if filter reduced to zero fallback to full pool
    const finalPool = filtered.length > 0 ? filtered : pool;
    return pickRandomFromArray(finalPool);
  };

  const chosenImage = chooseNonRepeating(imgs, s => s?.image?.name);
  const chosenVideo = chooseNonRepeating(vids, s => s?.video?.name);
  const chosenArticle = chooseNonRepeating(articlePool, s => s?.article?.id);
  const chosenQuote = chooseNonRepeating(quotePool, s => s?.quote?.id);

  const selection = {
    date: today,
    image: chosenImage || null,
    video: chosenVideo || null,
    article: chosenArticle || null,
    quote: chosenQuote || null
  };

  // persist selection under dailyData
  try {
    await updateDailyDataFields(userId, { lastMotivationSelection: selection });
  } catch (err) {
    console.warn("getDailyMotivation: failed to persist selection", err);
  }

  return selection;
}

// ---------- add to contentService.js ----------
function pickNUnique(arr, n) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const copy = arr.slice();
  const out = [];
  while (out.length < n && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

/**
 * getProSelection(userId)
 * - returns 3 videos, 3 images, 1 quote, articles pool
 * - persists under users/{uid}/dailyData.proSelection to avoid changing mid-day
 */
export async function getProSelection(userId) {
  if (!userId) {
    // non-persisted random pick
    const vids = await listMotivationalVideos();
    const imgs = await listMotivationalImages();
    const articlesMap = await showOtherContent('article');
    const quotesMap = await showOtherContent('quote');
    const quoteEntries = quotesMap ? Object.entries(quotesMap) : [];

    return {
      date: new Date().toDateString(),
      videos: pickNUnique(vids, 3),
      images: pickNUnique(imgs, 3),
      quote: quoteEntries.length ? { id: quoteEntries[0][0], actual_content: quoteEntries[0][1].actual_content } : null,
      articlesMap // full map so UI can choose random articles locally
    };
  }

  const dailyRef = ref(db, `users/${userId}/dailyData`);
  const snap = await get(dailyRef);
  const today = new Date().toDateString();
  const prev = snap && snap.exists() ? snap.val() : {};

  if (prev.proSelection && prev.proSelection.date === today) {
    return prev.proSelection;
  }

  const [vids, imgs] = await Promise.all([listMotivationalVideos(), listMotivationalImages()]);
  const articlesMap = await showOtherContent('article');
  const quotesMap = await showOtherContent('quote');
  const quoteEntries = quotesMap ? Object.entries(quotesMap) : [];

  const sel = {
    date: today,
    videos: pickNUnique(vids, 3),
    images: pickNUnique(imgs, 3),
    quote: quoteEntries.length ? { id: quoteEntries[0][0], actual_content: quoteEntries[0][1].actual_content } : null,
    articlesMap
  };

  try {
    await updateDailyDataFields(userId, { proSelection: sel });
  } catch (err) {
    console.warn("getProSelection: failed to persist selection", err);
  }

  return sel;
}