import { ref, get, set } from 'firebase/database';
import { db } from '../firebase';
import { updateAllLeagueRanks, promoteUsers, updateAllUserScores } from './rankingService';

/**
 * Check and run daily rank update
 * This should be called when the app initializes or user logs in
 */
export async function checkAndRunDailyUpdate() {
  try {
    const schedulerRef = ref(db, 'scheduler/lastDailyUpdate');
    const snapshot = await get(schedulerRef);
    
    const today = new Date().toDateString();
    const lastUpdate = snapshot.exists() ? snapshot.val() : null;

    if (lastUpdate === today) {
      console.log("✅ Daily rank update already completed today");
      return;
    }

    console.log("🔄 Running daily updates...");
    
    // FIRST: Update all scores
    await updateAllUserScores();
    
    // THEN: Update ranks based on new scores
    await updateAllLeagueRanks();
    
    await set(schedulerRef, today);
    
    console.log("✅ Daily updates completed");
  } catch (error) {
    console.error("❌ Error in daily update:", error);
  }
}

/**
 * Check if it's month end and run promotions
 * This should be called daily
 */
export async function checkAndRunMonthlyPromotion() {
  try {
    const schedulerRef = ref(db, 'scheduler/lastMonthlyPromotion');
    const snapshot = await get(schedulerRef);
    
    const currentMonth = getCurrentMonthKey();
    const lastPromotion = snapshot.exists() ? snapshot.val() : null;

    // If already promoted this month, skip
    if (lastPromotion === currentMonth) {
      console.log("✅ Monthly promotion already completed this month");
      return;
    }

    // Check if it's the last day of the month
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (tomorrow.getMonth() !== today.getMonth()) {
      console.log("🏆 Running monthly league promotions...");
      const results = await promoteUsers();
      
      // Update last promotion timestamp
      await set(schedulerRef, currentMonth);
      
      console.log("✅ Monthly promotions completed:", results);
      return results;
    } else {
      console.log("ℹ️ Not month end yet, skipping promotions");
    }
  } catch (error) {
    console.error("❌ Error in monthly promotion:", error);
  }
}

/**
 * Initialize scheduler - call this when app starts
 */
export async function initializeScheduler() {
  try {
    // Run daily update
    await checkAndRunDailyUpdate();
    
    // Check for monthly promotions
    await checkAndRunMonthlyPromotion();
    
    console.log("✅ Scheduler initialized");
  } catch (error) {
    console.error("❌ Error initializing scheduler:", error);
  }
}

/**
 * Get current month key
 */
function getCurrentMonthKey() {
  const date = new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${monthNames[date.getMonth()]}${date.getFullYear()}`;
}

/**
 * Manual trigger for admin - force daily update
 */
export async function forceUpdateRanks() {
  try {
    console.log("🔄 Force updating all ranks...");
    await updateAllLeagueRanks();
    
    const schedulerRef = ref(db, 'scheduler/lastDailyUpdate');
    await set(schedulerRef, new Date().toDateString());
    
    console.log("✅ Force update completed");
    return { success: true };
  } catch (error) {
    console.error("❌ Error in force update:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Manual trigger for admin - force monthly promotion
 */
export async function forceMonthlyPromotion() {
  try {
    console.log("🏆 Force running monthly promotions...");
    const results = await promoteUsers();
    
    const schedulerRef = ref(db, 'scheduler/lastMonthlyPromotion');
    await set(schedulerRef, getCurrentMonthKey());
    
    console.log("✅ Force promotion completed:", results);
    return { success: true, results };
  } catch (error) {
    console.error("❌ Error in force promotion:", error);
    return { success: false, error: error.message };
  }
}