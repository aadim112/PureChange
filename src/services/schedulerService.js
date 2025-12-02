import {ref, get, set} from "firebase/database";
import {db, auth} from "../firebase";
import {
  updateAllLeagueRanks,
  promoteUsers,
  updateAllUserScores,
} from "./rankingService";
import {getFunctions, httpsCallable} from "firebase/functions";

// Initialize functions
const functions = getFunctions();

/**
 * Check if user is authenticated
 * @return {boolean} True if user is authenticated
 */
function isUserAuthenticated() {
  return auth.currentUser !== null;
}

/**
 * Wait for user authentication
 * @param {number} timeout - Timeout in milliseconds
 * @return {Promise<boolean>} True if authenticated
 */
async function waitForAuth(timeout = 5000) {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(true);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(!!user);
    });

    setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, timeout);
  });
}

// Manual trigger from admin panel
/**
 * Manual trigger for daily update
 * @return {Promise<Object>} Result object
 */
export async function manualTriggerDailyUpdate() {
  try {
    // Wait for authentication
    const isAuth = await waitForAuth();
    if (!isAuth) {
      throw new Error("User must be authenticated to trigger updates");
    }

    const triggerUpdate = httpsCallable(functions, "triggerDailyUpdate");
    const result = await triggerUpdate();
    console.log("Manual update result:", result.data);
    return result.data;
  } catch (error) {
    console.error("Manual trigger failed:", error);
    throw error;
  }
}

/**
 * Manual trigger for monthly promotion
 * @return {Promise<Object>} Result object
 */
export async function manualTriggerMonthlyPromotion() {
  try {
    // Wait for authentication
    const isAuth = await waitForAuth();
    if (!isAuth) {
      throw new Error("User must be authenticated to trigger promotions");
    }

    const triggerPromotion = httpsCallable(
        functions,
        "triggerMonthlyPromotion",
    );
    const result = await triggerPromotion();
    console.log("Manual promotion result:", result.data);
    return result.data;
  } catch (error) {
    console.error("Manual trigger failed:", error);
    throw error;
  }
}

/**
 * Check and run daily rank update
 * This should be called when the app initializes or user logs in
 * @return {Promise<void>}
 */
export async function checkAndRunDailyUpdate() {
  try {
    const schedulerRef = ref(db, "scheduler/lastDailyUpdate");
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
 * @return {Promise<Object|void>}
 */
export async function checkAndRunMonthlyPromotion() {
  try {
    const schedulerRef = ref(db, "scheduler/lastMonthlyPromotion");
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
 * @return {Promise<void>}
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
 * @return {string} Current month key
 */
function getCurrentMonthKey() {
  const date = new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${monthNames[date.getMonth()]}${date.getFullYear()}`;
}

/**
 * Manual trigger for cloud function - force daily update
 * @return {Promise<Object>}
 */
export async function forceUpdateRanks() {
  try {
    console.log("🔄 Triggering cloud function for daily update...");

    // Check authentication first
    if (!isUserAuthenticated()) {
      const isAuth = await waitForAuth();
      if (!isAuth) {
        console.log("⚠️ User not authenticated, using local fallback...");
        await updateAllUserScores();
        await updateAllLeagueRanks();
        const schedulerRef = ref(db, "scheduler/lastDailyUpdate");
        await set(schedulerRef, new Date().toDateString());
        return {
          success: true,
          message: "Local update completed (not authenticated)",
        };
      }
    }

    const triggerUpdate = httpsCallable(functions, "triggerDailyUpdate");
    const result = await triggerUpdate();

    console.log("✅ Cloud function completed:", result.data);
    return result.data;
  } catch (error) {
    console.error("❌ Cloud function failed:", error);

    // Fallback to local function if cloud function not deployed yet
    if (error.code === "functions/not-found" ||
        error.code === "unauthenticated") {
      console.log("⚠️ Cloud function issue, using local fallback...");
      try {
        await updateAllUserScores();
        await updateAllLeagueRanks();
        const schedulerRef = ref(db, "scheduler/lastDailyUpdate");
        await set(schedulerRef, new Date().toDateString());
        return {
          success: true,
          message: "Local update completed (Cloud function unavailable)",
        };
      } catch (localError) {
        return {success: false, error: localError.message};
      }
    }

    return {success: false, error: error.message};
  }
}

/**
 * Manual trigger for cloud function - force monthly promotion
 * @return {Promise<Object>}
 */
export async function forceMonthlyPromotion() {
  try {
    console.log("🏆 Triggering cloud function for monthly promotion...");

    // Check authentication first
    if (!isUserAuthenticated()) {
      const isAuth = await waitForAuth();
      if (!isAuth) {
        console.log("⚠️ User not authenticated, using local fallback...");
        const results = await promoteUsers();
        const schedulerRef = ref(db, "scheduler/lastMonthlyPromotion");
        await set(schedulerRef, getCurrentMonthKey());
        return {
          success: true,
          results,
          message: "Local promotion completed (not authenticated)",
        };
      }
    }

    const triggerPromotion = httpsCallable(
        functions,
        "triggerMonthlyPromotion",
    );
    const result = await triggerPromotion();

    console.log("✅ Cloud function completed:", result.data);
    return result.data;
  } catch (error) {
    console.error("❌ Cloud function failed:", error);

    // Fallback to local function if cloud function not deployed yet
    if (error.code === "functions/not-found" ||
        error.code === "unauthenticated") {
      console.log("⚠️ Cloud function issue, using local fallback...");
      try {
        const results = await promoteUsers();
        const schedulerRef = ref(db, "scheduler/lastMonthlyPromotion");
        await set(schedulerRef, getCurrentMonthKey());
        return {
          success: true,
          results,
          message: "Local promotion completed (Cloud function unavailable)",
        };
      } catch (localError) {
        return {success: false, error: localError.message};
      }
    }

    return {success: false, error: error.message};
  }
}

/**
 * Check cloud function deployment status
 * @return {Promise<Object>}
 */
export async function checkCloudFunctionsStatus() {
  try {
    // Wait for auth
    await waitForAuth(2000);

    if (!isUserAuthenticated()) {
      return {
        dailyUpdateDeployed: false,
        monthlyPromotionDeployed: false,
        allDeployed: false,
        error: "User not authenticated",
      };
    }

    // Try to call functions to check if they exist
    const dailyExists = await httpsCallable(
        functions,
        "triggerDailyUpdate",
    )()
        .then(() => true)
        .catch((error) => {
          if (error.code === "functions/not-found") return false;
          // If we get auth or other errors, function exists
          return true;
        });

    const monthlyExists = await httpsCallable(
        functions,
        "triggerMonthlyPromotion",
    )()
        .then(() => true)
        .catch((error) => {
          if (error.code === "functions/not-found") return false;
          return true;
        });

    return {
      dailyUpdateDeployed: dailyExists,
      monthlyPromotionDeployed: monthlyExists,
      allDeployed: dailyExists && monthlyExists,
    };
  } catch (error) {
    return {
      dailyUpdateDeployed: false,
      monthlyPromotionDeployed: false,
      allDeployed: false,
      error: error.message,
    };
  }
}