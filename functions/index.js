// functions/index.js
// Firebase Cloud Functions for Automated Ranking System

const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");

// Set global options
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.database();

// ============================================
// HELPER FUNCTIONS (Same logic as your rankingService.js)
// ============================================

const LEAGUES = {
  WARRIOR: "Warrior",
  ELITE: "Elite",
  CONQUEROR: "Conqueror",
};

const LEAGUE_ORDER = [LEAGUES.WARRIOR, LEAGUES.ELITE, LEAGUES.CONQUEROR];
const PROMOTION_COUNT = 10;

/**
 * Get current month key in format MonthNameYear
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
 * Calculate consistency score based on user activity
 * @param {Object} userData - User data object
 * @return {number} Consistency score
 */
function calculateConsistencyScore(userData) {
  const dailyData = userData.dailyData || {};

  const lastChecklistUpdate =
    new Date(dailyData.lastChecklistUpdateDate || 0);
  const lastNFUpdate = new Date(dailyData.lastNFUpdateDate || 0);
  const lastDTUpdate = new Date(dailyData.lastDTUpdateDate || 0);

  const daysSinceLastActivity = Math.floor(
      (new Date() -
      Math.max(lastChecklistUpdate, lastNFUpdate, lastDTUpdate)) /
      (1000 * 60 * 60 * 24),
  );

  let consistentDays = 0;
  if (daysSinceLastActivity === 0) consistentDays = 30;
  else if (daysSinceLastActivity <= 1) consistentDays = 25;
  else if (daysSinceLastActivity <= 3) consistentDays = 20;
  else if (daysSinceLastActivity <= 7) consistentDays = 15;
  else if (daysSinceLastActivity <= 14) consistentDays = 10;
  else consistentDays = 5;

  return Math.min(50, Math.round((consistentDays / 30) * 50));
}

/**
 * Calculate initial score for a user
 * @param {Object} userData - User data object
 * @return {number} Calculated score
 */
function calculateInitialScore(userData) {
  const currentMonth = getCurrentMonthKey();

  const weights = {
    NFStreak: 80,
    NFBStreak: 60,
    NFCMStreak: 50,
    DTStreak: 70,
    DTBStreak: 50,
    DTCMStreak: 40,
    HealthScore: 100,
    ConsistencyScore: 50,
  };

  const scores = {
    NFStreak: Math.min(
        (userData.NoFapStreak?.NFStreak || 0) * 2,
        weights.NFStreak,
    ),
    NFBStreak: Math.min(
        (userData.NoFapStreak?.BestStreak || 0) * 1.5,
        weights.NFBStreak,
    ),
    NFCMStreak: Math.min(
        (userData.NoFapStreak?.MonthlyStreak?.[currentMonth] || 0) * 2.5,
        weights.NFCMStreak,
    ),
    DTStreak: Math.min(
        (userData.DailyTaskStreak?.DTStreak || 0) * 2.5,
        weights.DTStreak,
    ),
    DTBStreak: Math.min(
        (userData.DailyTaskStreak?.BestStreak || 0) * 2,
        weights.DTBStreak,
    ),
    DTCMStreak: Math.min(
        (userData.DailyTaskStreak?.MonthlyStreak?.[currentMonth] || 0) * 2,
        weights.DTCMStreak,
    ),
    HealthScore: Math.min(
        (userData.HealthScore || 0),
        weights.HealthScore,
    ),
    ConsistencyScore: calculateConsistencyScore(userData),
  };

  const totalScore = Object.values(scores)
      .reduce((sum, score) => sum + score, 0);
  return Math.max(0, Math.min(500, Math.round(totalScore)));
}

/**
 * Update score for a single user
 * @param {string} userId - User ID
 * @param {Object} userData - User data object
 * @return {Promise<void>}
 */
async function updateUserScore(userId, userData) {
  try {
    const rankingRef = db.ref(`users/${userId}/ranking`);
    const snapshot = await rankingRef.once("value");

    if (!snapshot.exists()) {
      console.log(`No ranking data for user ${userId}, skipping`);
      return;
    }

    const currentRanking = snapshot.val();
    const newBaseScore = calculateInitialScore(userData);

    const pageActivityPoints = Object.values(
        currentRanking.pageActivity || {},
    ).reduce((sum, points) => sum + points, 0);

    const newScore = Math.max(
        0,
        Math.round(newBaseScore + pageActivityPoints),
    );

    await rankingRef.update({
      score: newScore,
      lastScoreUpdate: new Date().toISOString(),
      [`scoreHistory/${new Date().toDateString()}`]: newScore,
    });

    const oldScore = currentRanking.score;
    console.log(
        `✅ Updated score for user ${userId}: ${oldScore} → ${newScore}`,
    );
  } catch (error) {
    console.error(`❌ Error updating score for user ${userId}:`, error);
  }
}

/**
 * Update scores for all users
 * @return {Promise<void>}
 */
async function updateAllUserScores() {
  try {
    console.log("🔄 Updating all user scores...");

    const usersSnapshot = await db.ref("users").once("value");
    if (!usersSnapshot.exists()) {
      console.log("No users found");
      return;
    }

    let count = 0;
    const promises = [];

    usersSnapshot.forEach((childSnapshot) => {
      const userId = childSnapshot.key;
      const userData = childSnapshot.val();

      if (userData.ranking) {
        promises.push(updateUserScore(userId, userData));
        count++;
      }
    });

    await Promise.all(promises);
    console.log(`✅ Updated scores for ${count} users`);
  } catch (error) {
    console.error("❌ Error updating all user scores:", error);
    throw error;
  }
}

/**
 * Update league ranks for all users
 * @return {Promise<void>}
 */
async function updateAllLeagueRanks() {
  try {
    console.log("🔄 Starting league rank update...");

    const usersSnapshot = await db.ref("users").once("value");
    if (!usersSnapshot.exists()) {
      console.log("No users found");
      return;
    }

    const leagueUsers = {
      [LEAGUES.WARRIOR]: [],
      [LEAGUES.ELITE]: [],
      [LEAGUES.CONQUEROR]: [],
    };

    usersSnapshot.forEach((childSnapshot) => {
      const userData = childSnapshot.val();
      const ranking = userData.ranking;

      if (ranking && ranking.currentLeague) {
        leagueUsers[ranking.currentLeague].push({
          userId: childSnapshot.key,
          score: ranking.score,
          league: ranking.currentLeague,
        });
      }
    });

    // Update ranks within each league
    for (const league of LEAGUE_ORDER) {
      const users = leagueUsers[league];
      users.sort((a, b) => b.score - a.score);

      const updates = {};
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        updates[`users/${user.userId}/ranking/leagueRank/${league}`] = i + 1;
      }

      await db.ref().update(updates);
      console.log(`✅ Updated ${users.length} users in ${league}`);
    }

    // Update global ranks
    await updateGlobalRanks();

    console.log("✅ League rank update completed");
  } catch (error) {
    console.error("❌ Error updating league ranks:", error);
    throw error;
  }
}

/**
 * Update global ranks for all users
 * @return {Promise<void>}
 */
async function updateGlobalRanks() {
  try {
    const usersSnapshot = await db.ref("users").once("value");
    if (!usersSnapshot.exists()) return;

    const allUsers = [];

    usersSnapshot.forEach((childSnapshot) => {
      const userData = childSnapshot.val();
      const ranking = userData.ranking;

      if (ranking && ranking.currentLeague) {
        allUsers.push({
          userId: childSnapshot.key,
          league: ranking.currentLeague,
          leagueRank: ranking.leagueRank?.[ranking.currentLeague] || 0,
          score: ranking.score,
        });
      }
    });

    allUsers.sort((a, b) => {
      const leagueIndexA = LEAGUE_ORDER.indexOf(a.league);
      const leagueIndexB = LEAGUE_ORDER.indexOf(b.league);

      if (leagueIndexA !== leagueIndexB) {
        return leagueIndexB - leagueIndexA;
      }

      return a.leagueRank - b.leagueRank;
    });

    const updates = {};
    for (let i = 0; i < allUsers.length; i++) {
      const user = allUsers[i];
      updates[`users/${user.userId}/ranking/globalRank`] = i + 1;
    }

    await db.ref().update(updates);
    console.log(`✅ Updated global ranks for ${allUsers.length} users`);
  } catch (error) {
    console.error("❌ Error updating global ranks:", error);
    throw error;
  }
}

/**
 * Promote top users to higher leagues
 * @return {Promise<Object>} Promotion results
 */
async function promoteUsers() {
  try {
    console.log("🏆 Starting monthly league promotions...");

    const currentMonth = getCurrentMonthKey();
    const promotions = {
      [LEAGUES.WARRIOR]: [],
      [LEAGUES.ELITE]: [],
    };

    // Get top users from Warrior
    const warriorSnapshot = await db.ref("users")
        .orderByChild("ranking/currentLeague")
        .equalTo(LEAGUES.WARRIOR)
        .once("value");

    const warriorUsers = [];
    warriorSnapshot.forEach((child) => {
      const userData = child.val();
      warriorUsers.push({
        userId: child.key,
        username: userData.UserName,
        score: userData.ranking?.score || 0,
      });
    });

    warriorUsers.sort((a, b) => b.score - a.score);
    const warriorTop = warriorUsers.slice(0, PROMOTION_COUNT);

    for (const user of warriorTop) {
      await db.ref(`users/${user.userId}/ranking`).update({
        currentLeague: LEAGUES.ELITE,
        promotedAt: new Date().toISOString(),
        promotedFrom: LEAGUES.WARRIOR,
        monthPromoted: currentMonth,
      });
      promotions[LEAGUES.WARRIOR].push(user.username);
    }

    // Get top users from Elite
    const eliteSnapshot = await db.ref("users")
        .orderByChild("ranking/currentLeague")
        .equalTo(LEAGUES.ELITE)
        .once("value");

    const eliteUsers = [];
    eliteSnapshot.forEach((child) => {
      const userData = child.val();
      eliteUsers.push({
        userId: child.key,
        username: userData.UserName,
        score: userData.ranking?.score || 0,
      });
    });

    eliteUsers.sort((a, b) => b.score - a.score);
    const eliteTop = eliteUsers.slice(0, PROMOTION_COUNT);

    for (const user of eliteTop) {
      await db.ref(`users/${user.userId}/ranking`).update({
        currentLeague: LEAGUES.CONQUEROR,
        promotedAt: new Date().toISOString(),
        promotedFrom: LEAGUES.ELITE,
        monthPromoted: currentMonth,
      });
      promotions[LEAGUES.ELITE].push(user.username);
    }

    // Update all ranks after promotions
    await updateAllLeagueRanks();

    console.log("✅ Monthly promotions completed:", promotions);
    return promotions;
  } catch (error) {
    console.error("❌ Error promoting users:", error);
    throw error;
  }
}

// ============================================
// SCHEDULED CLOUD FUNCTIONS (V2)
// ============================================

/**
 * Daily Rank Update - Runs every day at midnight UTC
 */
exports.dailyRankUpdate = onSchedule(
    {
      schedule: "0 0 * * *",
      timeZone: "UTC",
      memory: "512MiB",
    },
    async (event) => {
      try {
        console.log(
            "🕐 Daily rank update triggered at:",
            new Date().toISOString(),
        );

        const schedulerRef = db.ref("scheduler/lastDailyUpdate");
        const snapshot = await schedulerRef.once("value");

        const today = new Date().toDateString();
        const lastUpdate = snapshot.exists() ? snapshot.val() : null;

        if (lastUpdate === today) {
          console.log("✅ Daily rank update already completed today");
          return null;
        }

        console.log("🔄 Running daily updates...");

        // Step 1: Update all user scores
        await updateAllUserScores();

        // Step 2: Update league and global ranks
        await updateAllLeagueRanks();

        // Step 3: Record completion
        await schedulerRef.set(today);

        console.log("✅ Daily rank update completed successfully");
        return null;
      } catch (error) {
        console.error("❌ Daily rank update failed:", error);
        throw error;
      }
    },
);

/**
 * Monthly Promotion - Runs on the last day of every month at 11:59 PM UTC
 */
exports.monthlyPromotion = onSchedule(
    {
      schedule: "59 23 28-31 * *",
      timeZone: "UTC",
      memory: "512MiB",
    },
    async (event) => {
      try {
        console.log(
            "🕐 Monthly promotion check triggered at:",
            new Date().toISOString(),
        );

        // Check if today is actually the last day of the month
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // If tomorrow is not in the same month, then today is the last day
        const isLastDayOfMonth = tomorrow.getMonth() !== today.getMonth();

        if (!isLastDayOfMonth) {
          console.log("ℹ️ Not the last day of month yet, skipping");
          return null;
        }

        const schedulerRef = db.ref("scheduler/lastMonthlyPromotion");
        const snapshot = await schedulerRef.once("value");

        const currentMonth = getCurrentMonthKey();
        const lastPromotion = snapshot.exists() ? snapshot.val() : null;

        if (lastPromotion === currentMonth) {
          console.log("✅ Monthly promotion already completed this month");
          return null;
        }

        console.log("🏆 Running monthly league promotions...");

        // Promote users
        const results = await promoteUsers();

        // Record completion
        await schedulerRef.set(currentMonth);

        console.log("✅ Monthly promotions completed:", results);
        return results;
      } catch (error) {
        console.error("❌ Monthly promotion failed:", error);
        throw error;
      }
    },
);

/**
 * Manual trigger for daily update (HTTP callable)
 */
exports.triggerDailyUpdate = onCall(
    {maxInstances: 1},
    async (request) => {
      // Check if user is authenticated
      if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "User must be authenticated to trigger updates",
        );
      }

      // Optional: Check if user is admin
      // Uncomment and modify this section if you want admin-only access
      /*
      const userRef = db.ref(`users/${request.auth.uid}`);
      const userSnapshot = await userRef.once("value");
      const userData = userSnapshot.val();

      if (!userData || userData.role !== "admin") {
        throw new HttpsError(
            "permission-denied",
            "Only admins can trigger manual updates",
        );
      }
      */

      try {
        console.log("🔄 Manual daily update triggered by:", request.auth.uid);

        await updateAllUserScores();
        await updateAllLeagueRanks();

        await db.ref("scheduler/lastDailyUpdate")
            .set(new Date().toDateString());

        return {success: true, message: "Daily update completed"};
      } catch (error) {
        console.error("❌ Manual daily update failed:", error);
        throw new HttpsError("internal", error.message);
      }
    },
);

/**
 * Manual trigger for monthly promotion (HTTP callable)
 */
exports.triggerMonthlyPromotion = onCall(
    {maxInstances: 1},
    async (request) => {
      // Check if user is authenticated
      if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "User must be authenticated to trigger promotions",
        );
      }

      // Optional: Check if user is admin
      // Uncomment and modify this section if you want admin-only access
      /*
      const userRef = db.ref(`users/${request.auth.uid}`);
      const userSnapshot = await userRef.once("value");
      const userData = userSnapshot.val();

      if (!userData || userData.role !== "admin") {
        throw new HttpsError(
            "permission-denied",
            "Only admins can trigger manual promotions",
        );
      }
      */

      try {
        console.log(
            "🏆 Manual monthly promotion triggered by:",
            request.auth.uid,
        );

        const results = await promoteUsers();

        await db.ref("scheduler/lastMonthlyPromotion")
            .set(getCurrentMonthKey());

        return {success: true, results};
      } catch (error) {
        console.error("❌ Manual monthly promotion failed:", error);
        throw new HttpsError("internal", error.message);
      }
    },
);
