import { ref, get, set } from 'firebase/database';
import { db } from '../firebase';
import { updateAllLeagueRanks, promoteUsers, updateAllUserScores } from './rankingService';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Initialize functions
const functions = getFunctions();

// Manual trigger from admin panel
export async function manualTriggerDailyUpdate() {
  try {
    const triggerUpdate = httpsCallable(functions, 'triggerDailyUpdate');
    const result = await triggerUpdate();
    console.log('Manual update result:', result.data);
    return result.data;
  } catch (error) {
    console.error('Manual trigger failed:', error);
    throw error;
  }
}

export async function manualTriggerMonthlyPromotion() {
  try {
    const triggerPromotion = httpsCallable(functions, 'triggerMonthlyPromotion');
    const result = await triggerPromotion();
    console.log('Manual promotion result:', result.data);
    return result.data;
  } catch (error) {
    console.error('Manual trigger failed:', error);
    throw error;
  }
}

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
 * Manual trigger for cloud function - force daily update
 */
export async function forceUpdateRanks() {
  try {
    console.log("🔄 Triggering cloud function for daily update...");
    
    const triggerUpdate = httpsCallable(functions, 'triggerDailyUpdate');
    const result = await triggerUpdate();
    
    console.log("✅ Cloud function completed:", result.data);
    return result.data;
  } catch (error) {
    console.error("❌ Cloud function failed:", error);
    
    // Fallback to local function if cloud function not deployed yet
    if (error.code === 'functions/not-found') {
      console.log("⚠️ Cloud function not found, using local fallback...");
      try {
        await updateAllLeagueRanks();
        const schedulerRef = ref(db, 'scheduler/lastDailyUpdate');
        await set(schedulerRef, new Date().toDateString());
        return { success: true, message: "Local update completed (Cloud function not deployed)" };
      } catch (localError) {
        return { success: false, error: localError.message };
      }
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Manual trigger for cloud function - force monthly promotion
 */
export async function forceMonthlyPromotion() {
  try {
    console.log("🏆 Triggering cloud function for monthly promotion...");
    
    const triggerPromotion = httpsCallable(functions, 'triggerMonthlyPromotion');
    const result = await triggerPromotion();
    
    console.log("✅ Cloud function completed:", result.data);
    return result.data;
  } catch (error) {
    console.error("❌ Cloud function failed:", error);
    
    // Fallback to local function if cloud function not deployed yet
    if (error.code === 'functions/not-found') {
      console.log("⚠️ Cloud function not found, using local fallback...");
      try {
        const results = await promoteUsers();
        const schedulerRef = ref(db, 'scheduler/lastMonthlyPromotion');
        await set(schedulerRef, getCurrentMonthKey());
        return { success: true, results, message: "Local promotion completed (Cloud function not deployed)" };
      } catch (localError) {
        return { success: false, error: localError.message };
      }
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Check cloud function deployment status
 */
export async function checkCloudFunctionsStatus() {
  try {
    const functions = getFunctions();
    
    // Try to call a lightweight check
    const dailyExists = await httpsCallable(functions, 'triggerDailyUpdate')()
      .then(() => true)
      .catch((error) => error.code !== 'functions/not-found');
    
    const monthlyExists = await httpsCallable(functions, 'triggerMonthlyPromotion')()
      .then(() => true)
      .catch((error) => error.code !== 'functions/not-found');
    
    return {
      dailyUpdateDeployed: dailyExists,
      monthlyPromotionDeployed: monthlyExists,
      allDeployed: dailyExists && monthlyExists
    };
  } catch (error) {
    return {
      dailyUpdateDeployed: false,
      monthlyPromotionDeployed: false,
      allDeployed: false,
      error: error.message
    };
  }
}