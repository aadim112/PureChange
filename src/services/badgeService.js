// badgeService.js
import { ref, get, set, update } from "firebase/database";
import { db } from "../firebase";

/**
 * Badge Service for managing user badges
 */

// Available badge types (you can expand this)
export const BADGE_TYPES = {
  BRONZE: "bronze",
  SILVER: "silver", 
  GOLD: "gold",
  ELIT: "elit",
  FINISHER: "finisher",
  FIRST_LOGIN: "firstlogin",
  Pro: "pro",
  WEEK_WARRIOR: "weekwarrior",
  MONTH_MASTER: "monthmaster",
  CONSISTENCY_KING: "consistencyking",
  STREAK_STARTER: "streakstarter",
  DAILY_CHAMPION: "dailychampion"
};

/**
 * Adds a badge to user's badge collection
 * @param {string} userId - The user's unique ID
 * @param {string} badgeName - The badge name to add (use BADGE_TYPES constants)
 * @returns {Promise<{success: boolean, message: string, badges: Array}>}
 */
export const addBadge = async (userId, badgeName) => {
  try {
    if (!userId) {
      return {
        success: false,
        message: "User ID is required",
        badges: []
      };
    }

    if (!badgeName) {
      return {
        success: false,
        message: "Badge name is required",
        badges: []
      };
    }

    // Reference to user's badges array
    const badgesRef = ref(db, `users/${userId}/badges`);
    
    // Get current badges
    const snapshot = await get(badgesRef);
    let currentBadges = [];
    
    if (snapshot.exists()) {
      currentBadges = snapshot.val();
      // Ensure it's an array
      if (!Array.isArray(currentBadges)) {
        currentBadges = [];
      }
    }

    // Check if badge already exists
    if (currentBadges.includes(badgeName)) {
      return {
        success: false,
        message: `Badge "${badgeName}" already exists for this user`,
        badges: currentBadges
      };
    }

    // Add new badge
    const updatedBadges = [...currentBadges, badgeName];
    
    // Update database
    await set(badgesRef, updatedBadges);

    return {
      success: true,
      message: `Badge "${badgeName}" added successfully`,
      badges: updatedBadges
    };

  } catch (error) {
    console.error("Error adding badge:", error);
    return {
      success: false,
      message: `Error adding badge: ${error.message}`,
      badges: []
    };
  }
};

/**
 * Removes a badge from user's collection
 * @param {string} userId - The user's unique ID
 * @param {string} badgeName - The badge name to remove
 * @returns {Promise<{success: boolean, message: string, badges: Array}>}
 */
export const removeBadge = async (userId, badgeName) => {
  try {
    if (!userId || !badgeName) {
      return {
        success: false,
        message: "User ID and badge name are required",
        badges: []
      };
    }

    const badgesRef = ref(db, `users/${userId}/badges`);
    const snapshot = await get(badgesRef);
    
    if (!snapshot.exists()) {
      return {
        success: false,
        message: "User has no badges",
        badges: []
      };
    }

    let currentBadges = snapshot.val();
    if (!Array.isArray(currentBadges)) {
      currentBadges = [];
    }

    // Filter out the badge
    const updatedBadges = currentBadges.filter(badge => badge !== badgeName);

    if (currentBadges.length === updatedBadges.length) {
      return {
        success: false,
        message: `Badge "${badgeName}" not found`,
        badges: currentBadges
      };
    }

    await set(badgesRef, updatedBadges);

    return {
      success: true,
      message: `Badge "${badgeName}" removed successfully`,
      badges: updatedBadges
    };

  } catch (error) {
    console.error("Error removing badge:", error);
    return {
      success: false,
      message: `Error removing badge: ${error.message}`,
      badges: []
    };
  }
};

/**
 * Gets all badges for a user
 * @param {string} userId - The user's unique ID
 * @returns {Promise<{success: boolean, badges: Array}>}
 */
export const getUserBadges = async (userId) => {
  try {
    if (!userId) {
      return { success: false, badges: [] };
    }

    const badgesRef = ref(db, `users/${userId}/badges`);
    const snapshot = await get(badgesRef);
    
    if (snapshot.exists()) {
      const badges = snapshot.val();
      return {
        success: true,
        badges: Array.isArray(badges) ? badges : []
      };
    }

    return { success: true, badges: [] };

  } catch (error) {
    console.error("Error fetching badges:", error);
    return { success: false, badges: [] };
  }
};

/**
 * Checks if user has a specific badge
 * @param {string} userId - The user's unique ID
 * @param {string} badgeName - The badge name to check
 * @returns {Promise<boolean>}
 */
export const hasBadge = async (userId, badgeName) => {
  try {
    const result = await getUserBadges(userId);
    return result.badges.includes(badgeName);
  } catch (error) {
    console.error("Error checking badge:", error);
    return false;
  }
};

/**
 * Awards multiple badges at once
 * @param {string} userId - The user's unique ID
 * @param {Array<string>} badgeNames - Array of badge names to add
 * @returns {Promise<{success: boolean, message: string, badges: Array, added: Array, skipped: Array}>}
 */
export const addMultipleBadges = async (userId, badgeNames) => {
  try {
    if (!userId || !Array.isArray(badgeNames)) {
      return {
        success: false,
        message: "User ID and badge names array are required",
        badges: [],
        added: [],
        skipped: []
      };
    }

    const badgesRef = ref(db, `users/${userId}/badges`);
    const snapshot = await get(badgesRef);
    
    let currentBadges = [];
    if (snapshot.exists()) {
      currentBadges = snapshot.val();
      if (!Array.isArray(currentBadges)) {
        currentBadges = [];
      }
    }

    const added = [];
    const skipped = [];

    // Filter out duplicates
    badgeNames.forEach(badgeName => {
      if (currentBadges.includes(badgeName)) {
        skipped.push(badgeName);
      } else {
        added.push(badgeName);
      }
    });

    if (added.length === 0) {
      return {
        success: false,
        message: "All badges already exist",
        badges: currentBadges,
        added: [],
        skipped
      };
    }

    const updatedBadges = [...currentBadges, ...added];
    await set(badgesRef, updatedBadges);

    return {
      success: true,
      message: `Added ${added.length} new badge(s)`,
      badges: updatedBadges,
      added,
      skipped
    };

  } catch (error) {
    console.error("Error adding multiple badges:", error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      badges: [],
      added: [],
      skipped: []
    };
  }
};

/**
 * Auto-award badges based on user achievements
 * @param {string} userId - The user's unique ID
 * @param {Object} userData - Complete user data object
 * @returns {Promise<{awarded: Array, message: string}>}
 */
export const autoAwardBadges = async (userId, userData) => {
  try {
    const badgesToAward = [];

    // Check for various achievements and award badges
    
    // Streak-based badges
    if (userData.NoFapStreak?.BestStreak >= 7) {
      badgesToAward.push(BADGE_TYPES.STREAK_STARTER);
    }
    if (userData.NoFapStreak?.BestStreak >= 30) {
      badgesToAward.push(BADGE_TYPES.MONTH_MASTER);
    }

    // Daily task badges
    if (userData.DailyTaskStreak?.BestStreak >= 7) {
      badgesToAward.push(BADGE_TYPES.WEEK_WARRIOR);
    }
    if (userData.DailyTaskStreak?.BestStreak >= 30) {
      badgesToAward.push(BADGE_TYPES.DAILY_CHAMPION);
    }

    // Premium user badge
    if (userData.UserType === 'Elite' || userData.UserType === 'Pro') {
      badgesToAward.push(BADGE_TYPES.PREMIUM);
    }

    // Health score badges
    if (userData.HealthScore >= 50 && userData.HealthScore < 70) {
      badgesToAward.push(BADGE_TYPES.BRONZE);
    }
    if (userData.HealthScore >= 70 && userData.HealthScore < 85) {
      badgesToAward.push(BADGE_TYPES.SILVER);
    }
    if (userData.HealthScore >= 85) {
      badgesToAward.push(BADGE_TYPES.GOLD);
    }

    // First login badge
    if (userData.createdAt) {
      badgesToAward.push(BADGE_TYPES.FIRST_LOGIN);
    }

    // Award all earned badges
    if (badgesToAward.length > 0) {
      const result = await addMultipleBadges(userId, badgesToAward);
      return {
        awarded: result.added,
        message: `Awarded ${result.added.length} new badge(s)`
      };
    }

    return {
      awarded: [],
      message: "No new badges to award"
    };

  } catch (error) {
    console.error("Error auto-awarding badges:", error);
    return {
      awarded: [],
      message: `Error: ${error.message}`
    };
  }
};