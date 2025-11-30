import { ref, get, set, update, runTransaction } from 'firebase/database';
import { db } from '../firebase';

// League definitions
export const LEAGUES = {
  WARRIOR: 'Warrior',
  ELITE: 'Elite',
  CONQUEROR: 'Conqueror'
};

export const LEAGUE_ORDER = [LEAGUES.WARRIOR, LEAGUES.ELITE, LEAGUES.CONQUEROR];
export const PROMOTION_COUNT = 10;

export const PAGE_POINTS = {
  '/activity': 0.5, // +0.5 per minute
  '/content': 0.3,  
  '/leaderboard': 0.2, 
  '/more-content': 0.4, 
  '/routine': 0.3,
  '/chatroom': 0.2,  
  '/pricing': -0.1,  
  '/edit-profile': 0.1     
};

/**
 * Calculate initial score (out of 500) based on 8 parameters
 * @param {Object} userData - User's data from database
 * @returns {number} Score between 0-500
 */
export function calculateInitialScore(userData) {
  const weights = {
    NFStreak: 80,      // 80 points max
    NFBStreak: 60,     // 60 points max
    NFCMStreak: 50,    // 50 points max
    DTStreak: 70,      // 70 points max
    DTBStreak: 50,     // 50 points max
    DTCMStreak: 40,    // 40 points max
    HealthScore: 100,  // 100 points max (0-100 scale)
    ConsistencyScore: 50 // 50 points max
  };

  const scores = {
    NFStreak: Math.min((userData.NoFapStreak?.NFStreak || 0) * 2, weights.NFStreak),
    NFBStreak: Math.min((userData.NoFapStreak?.BestStreak || 0) * 1.5, weights.NFBStreak),
    NFCMStreak: Math.min((userData.NoFapStreak?.MonthlyStreak?.[getCurrentMonthKey()] || 0) * 2.5, weights.NFCMStreak),
    DTStreak: Math.min((userData.DailyTaskStreak?.DTStreak || 0) * 2.5, weights.DTStreak),
    DTBStreak: Math.min((userData.DailyTaskStreak?.BestStreak || 0) * 2, weights.DTBStreak),
    DTCMStreak: Math.min((userData.DailyTaskStreak?.MonthlyStreak?.[getCurrentMonthKey()] || 0) * 2, weights.DTCMStreak),
    HealthScore: Math.min((userData.HealthScore || 0), weights.HealthScore),
    ConsistencyScore: calculateConsistencyScore(userData)
  };

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  return Math.max(0, Math.min(500, Math.round(totalScore)));
}

/**
 * Calculate consistency score based on user's activity history
 * @param {Object} userData - User's data
 * @returns {number} Consistency score (0-50)
 */
function calculateConsistencyScore(userData) {
  const dailyData = userData.dailyData || {};
  const today = new Date().toDateString();
  
  // Check last 30 days of activity
  let consistentDays = 0;
  const lastChecklistUpdate = new Date(dailyData.lastChecklistUpdateDate || 0);
  const lastNFUpdate = new Date(dailyData.lastNFUpdateDate || 0);
  const lastDTUpdate = new Date(dailyData.lastDTUpdateDate || 0);
  
  const daysSinceLastActivity = Math.floor((new Date() - Math.max(lastChecklistUpdate, lastNFUpdate, lastDTUpdate)) / (1000 * 60 * 60 * 24));
  
  // More recent activity = higher consistency
  if (daysSinceLastActivity === 0) consistentDays = 30;
  else if (daysSinceLastActivity <= 1) consistentDays = 25;
  else if (daysSinceLastActivity <= 3) consistentDays = 20;
  else if (daysSinceLastActivity <= 7) consistentDays = 15;
  else if (daysSinceLastActivity <= 14) consistentDays = 10;
  else consistentDays = 5;
  
  return Math.min(50, Math.round((consistentDays / 30) * 50));
}

/**
 * Get current month key (e.g., "January2025")
 */
function getCurrentMonthKey() {
  const date = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  return `${monthNames[date.getMonth()]}${date.getFullYear()}`;
}

/**
 * Initialize ranking data for a user
 * @param {string} userId - User's ID
 * @param {Object} userData - User's full data
 */
export async function initializeUserRanking(userId, userData) {
  try {
    const rankingRef = ref(db, `users/${userId}/ranking`);
    const snapshot = await get(rankingRef);
    
    if (snapshot.exists()) {
      console.log("✅ User ranking already initialized");
      return snapshot.val();
    }

    // Calculate initial score
    const initialScore = calculateInitialScore(userData);
    
    const rankingData = {
      score: initialScore,
      globalRank: 0,
      currentLeague: LEAGUES.WARRIOR,
      leagueRank: {
        [LEAGUES.WARRIOR]: 0,
        [LEAGUES.ELITE]: 0,
        [LEAGUES.CONQUEROR]: 0
      },
      lastScoreUpdate: new Date().toISOString(),
      monthJoined: getCurrentMonthKey(),
      pageActivity: {},
      scoreHistory: {
        [new Date().toDateString()]: initialScore
      }
    };

    await set(rankingRef, rankingData);
    console.log(`✅ Initialized ranking for user ${userId} with score ${initialScore}`);
    
    return rankingData;
  } catch (error) {
    console.error("❌ Error initializing user ranking:", error);
    throw error;
  }
}

/**
 * Update user's score based on parameter changes
 * @param {string} userId - User's ID
 * @param {Object} userData - Updated user data
 */
export async function updateUserScore(userId, userData) {
  try {
    const rankingRef = ref(db, `users/${userId}/ranking`);
    const snapshot = await get(rankingRef);
    
    if (!snapshot.exists()) {
      return await initializeUserRanking(userId, userData);
    }

    const currentRanking = snapshot.val();
    const newBaseScore = calculateInitialScore(userData);
    
    // Add accumulated page activity points
    const pageActivityPoints = Object.values(currentRanking.pageActivity || {})
      .reduce((sum, points) => sum + points, 0);
    
    const newScore = Math.max(0, Math.round(newBaseScore + pageActivityPoints));
    
    await update(rankingRef, {
      score: newScore,
      lastScoreUpdate: new Date().toISOString(),
      [`scoreHistory/${new Date().toDateString()}`]: newScore
    });

    console.log(`✅ Updated score for user ${userId}: ${currentRanking.score} → ${newScore}`);
    return newScore;
  } catch (error) {
    console.error("❌ Error updating user score:", error);
    throw error;
  }
}

/**
 * Track page activity and update score
 * @param {string} userId - User's ID
 * @param {string} pagePath - Current page path
 * @param {number} minutesSpent - Minutes spent on page
 */
export async function trackPageActivity(userId, pagePath, minutesSpent) {
  try {
    const pointsPerMinute = PAGE_POINTS[pagePath] || 0;
    const points = pointsPerMinute * minutesSpent;
    
    if (points === 0) return;

    const rankingRef = ref(db, `users/${userId}/ranking`);
    const snapshot = await get(rankingRef);
    
    if (!snapshot.exists()) return;

    const currentRanking = snapshot.val();
    const currentPagePoints = currentRanking.pageActivity?.[pagePath] || 0;
    const newPagePoints = currentPagePoints + points;
    
    const updates = {
      [`pageActivity/${pagePath}`]: newPagePoints,
      score: Math.max(0, currentRanking.score + points),
      lastScoreUpdate: new Date().toISOString()
    };

    await update(rankingRef, updates);
    console.log(`✅ Tracked ${minutesSpent}min on ${pagePath}: ${points > 0 ? '+' : ''}${points.toFixed(1)} points`);
  } catch (error) {
    console.error("❌ Error tracking page activity:", error);
  }
}

/**
 * Get top N users from a specific league
 * @param {string} league - League name
 * @param {number} limit - Number of users to fetch
 * @returns {Array} Array of user data with rankings
 */
export async function getLeagueTopUsers(league, limit = 10) {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) return [];

    const users = [];
    snapshot.forEach((childSnapshot) => {
      const userData = childSnapshot.val();
      const ranking = userData.ranking;
      
      if (ranking && ranking.currentLeague === league) {
        users.push({
          userId: childSnapshot.key,
          name: userData.Name,
          username: userData.UserName,
          score: ranking.score,
          league: ranking.currentLeague,
          leagueRank: ranking.leagueRank?.[league] || 0,
          globalRank: ranking.globalRank || 0,
          NFStreak: userData.NoFapStreak?.NFStreak || 0,
          DTStreak: userData.DailyTaskStreak?.DTStreak || 0
        });
      }
    });

    // Sort by score (descending)
    users.sort((a, b) => b.score - a.score);
    
    return users.slice(0, limit);
  } catch (error) {
    console.error("❌ Error getting league top users:", error);
    return [];
  }
}

/**
 * Update all users' league ranks based on current scores
 * Should be run once daily via scheduled function
 */
export async function updateAllLeagueRanks() {
  try {
    console.log("🔄 Starting league rank update...");
    
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) return;

    // Group users by league
    const leagueUsers = {
      [LEAGUES.WARRIOR]: [],
      [LEAGUES.ELITE]: [],
      [LEAGUES.CONQUEROR]: []
    };

    snapshot.forEach((childSnapshot) => {
      const userData = childSnapshot.val();
      const ranking = userData.ranking;
      
      if (ranking && ranking.currentLeague) {
        leagueUsers[ranking.currentLeague].push({
          userId: childSnapshot.key,
          score: ranking.score,
          league: ranking.currentLeague
        });
      }
    });

    // Update ranks within each league
    for (const league of LEAGUE_ORDER) {
      const users = leagueUsers[league];
      users.sort((a, b) => b.score - a.score);
      
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const rankingRef = ref(db, `users/${user.userId}/ranking`);
        
        await update(rankingRef, {
          [`leagueRank/${league}`]: i + 1
        });
      }
      
      console.log(`✅ Updated ${users.length} users in ${league}`);
    }

    // Update global ranks
    await updateGlobalRanks();
    
    console.log("✅ League rank update completed");
  } catch (error) {
    console.error("❌ Error updating league ranks:", error);
  }
}

/**
 * Update global ranks (Conqueror -> Elite -> Warrior order)
 */
async function updateGlobalRanks() {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) return;

    const allUsers = [];
    
    snapshot.forEach((childSnapshot) => {
      const userData = childSnapshot.val();
      const ranking = userData.ranking;
      
      if (ranking && ranking.currentLeague) {
        allUsers.push({
          userId: childSnapshot.key,
          league: ranking.currentLeague,
          leagueRank: ranking.leagueRank?.[ranking.currentLeague] || 0,
          score: ranking.score
        });
      }
    });

    // Sort: First by league order, then by league rank
    allUsers.sort((a, b) => {
      const leagueIndexA = LEAGUE_ORDER.indexOf(a.league);
      const leagueIndexB = LEAGUE_ORDER.indexOf(b.league);
      
      if (leagueIndexA !== leagueIndexB) {
        return leagueIndexB - leagueIndexA; // Higher league first
      }
      
      return a.leagueRank - b.leagueRank; // Lower rank number = higher position
    });

    // Assign global ranks
    for (let i = 0; i < allUsers.length; i++) {
      const user = allUsers[i];
      const rankingRef = ref(db, `users/${user.userId}/ranking`);
      
      await update(rankingRef, {
        globalRank: i + 1
      });
    }

    console.log(`✅ Updated global ranks for ${allUsers.length} users`);
  } catch (error) {
    console.error("❌ Error updating global ranks:", error);
  }
}

/**
 * Promote top users to next league (run at month end)
 * @returns {Object} Promotion results
 */
export async function promoteUsers() {
  try {
    console.log("🏆 Starting monthly league promotions...");
    
    const currentMonth = getCurrentMonthKey();
    const promotions = {
      [LEAGUES.WARRIOR]: [],
      [LEAGUES.ELITE]: []
    };

    // Get top users from Warrior
    const warriorTop = await getLeagueTopUsers(LEAGUES.WARRIOR, PROMOTION_COUNT);
    for (const user of warriorTop) {
      const rankingRef = ref(db, `users/${user.userId}/ranking`);
      await update(rankingRef, {
        currentLeague: LEAGUES.ELITE,
        promotedAt: new Date().toISOString(),
        promotedFrom: LEAGUES.WARRIOR,
        monthPromoted: currentMonth
      });
      promotions[LEAGUES.WARRIOR].push(user.username);
    }

    // Get top users from Elite
    const eliteTop = await getLeagueTopUsers(LEAGUES.ELITE, PROMOTION_COUNT);
    for (const user of eliteTop) {
      const rankingRef = ref(db, `users/${user.userId}/ranking`);
      await update(rankingRef, {
        currentLeague: LEAGUES.CONQUEROR,
        promotedAt: new Date().toISOString(),
        promotedFrom: LEAGUES.ELITE,
        monthPromoted: currentMonth
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

/**
 * Get user's complete ranking data
 * @param {string} userId - User's ID
 * @returns {Object} User's ranking data
 */
export async function getUserRankingData(userId) {
  try {
    const rankingRef = ref(db, `users/${userId}/ranking`);
    const snapshot = await get(rankingRef);
    
    if (!snapshot.exists()) {
      const userRef = ref(db, `users/${userId}`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        return await initializeUserRanking(userId, userSnapshot.val());
      }
      
      throw new Error("User not found");
    }

    return snapshot.val();
  } catch (error) {
    console.error("❌ Error getting user ranking data:", error);
    throw error;
  }
}