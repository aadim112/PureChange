// consistencyService.js

/**
 * Calculates a comprehensive consistency score (0-100) based on user's habits and streaks
 * @param {Object} userData - Complete user data from Firebase
 * @returns {Object} - { score: number, breakdown: object, insights: string }
 */
export function calculateConsistencyScore(userData) {
  if (!userData) {
    return { score: 0, breakdown: {}, insights: "No data available" };
  }

  const breakdown = {};
  let totalScore = 0;
  let maxPossibleScore = 0;

  // 1. NoFap Streak Analysis (25 points max)
  const noFapScore = calculateNoFapScore(userData);
  breakdown.noFapStreak = noFapScore;
  totalScore += noFapScore.score;
  maxPossibleScore += 25;

  // 2. Daily Task Streak Analysis (25 points max)
  const dailyTaskScore = calculateDailyTaskScore(userData);
  breakdown.dailyTaskStreak = dailyTaskScore;
  totalScore += dailyTaskScore.score;
  maxPossibleScore += 25;

  // 3. Daily Checklist Completion (20 points max)
  const checklistScore = calculateChecklistScore(userData);
  breakdown.checklistCompletion = checklistScore;
  totalScore += checklistScore.score;
  maxPossibleScore += 20;

  // 4. Verse Engagement (10 points max)
  const verseScore = calculateVerseEngagement(userData);
  breakdown.verseEngagement = verseScore;
  totalScore += verseScore.score;
  maxPossibleScore += 10;

  // 5. Streak Momentum (15 points max)
  const momentumScore = calculateStreakMomentum(userData);
  breakdown.streakMomentum = momentumScore;
  totalScore += momentumScore.score;
  maxPossibleScore += 15;

  // 6. Monthly Consistency (5 points max)
  const monthlyScore = calculateMonthlyConsistency(userData);
  breakdown.monthlyConsistency = monthlyScore;
  totalScore += monthlyScore.score;
  maxPossibleScore += 5;

  // Calculate final percentage
  const finalScore = Math.round((totalScore / maxPossibleScore) * 100);

  // Generate insights
  const insights = generateInsights(finalScore, breakdown);

  return {
    score: finalScore,
    breakdown,
    insights,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * NoFap Streak Score (25 points)
 * - Current streak vs best streak
 * - Streak length relative to goal
 */
function calculateNoFapScore(userData) {
  const noFapData = userData.NoFapStreak || {};
  const currentStreak = noFapData.NFStreak || 0;
  const bestStreak = noFapData.BestStreak || 0;

  let score = 0;
  let details = {};

  // Base score from current streak (15 points)
  if (currentStreak === 0) {
    score += 0;
    details.streakPoints = 0;
  } else if (currentStreak <= 3) {
    score += 5;
    details.streakPoints = 5;
  } else if (currentStreak <= 7) {
    score += 10;
    details.streakPoints = 10;
  } else if (currentStreak <= 14) {
    score += 13;
    details.streakPoints = 13;
  } else {
    score += 15;
    details.streakPoints = 15;
  }

  // Consistency with best streak (10 points)
  if (bestStreak > 0) {
    const consistencyRatio = currentStreak / bestStreak;
    if (consistencyRatio >= 0.8) {
      score += 10;
      details.consistencyPoints = 10;
    } else if (consistencyRatio >= 0.6) {
      score += 7;
      details.consistencyPoints = 7;
    } else if (consistencyRatio >= 0.4) {
      score += 5;
      details.consistencyPoints = 5;
    } else if (consistencyRatio > 0) {
      score += 3;
      details.consistencyPoints = 3;
    }
  } else if (currentStreak > 0) {
    score += 5; // Bonus for starting
    details.consistencyPoints = 5;
  }

  return {
    score,
    maxScore: 25,
    currentStreak,
    bestStreak,
    details
  };
}

/**
 * Daily Task Streak Score (25 points)
 */
function calculateDailyTaskScore(userData) {
  const dailyTaskData = userData.DailyTaskStreak || {};
  const currentStreak = dailyTaskData.DTStreak || 0;
  const bestStreak = dailyTaskData.BestStreak || 0;

  let score = 0;
  let details = {};

  // Current streak score (15 points)
  if (currentStreak === 0) {
    score += 0;
    details.streakPoints = 0;
  } else if (currentStreak <= 3) {
    score += 5;
    details.streakPoints = 5;
  } else if (currentStreak <= 7) {
    score += 10;
    details.streakPoints = 10;
  } else if (currentStreak <= 14) {
    score += 13;
    details.streakPoints = 13;
  } else {
    score += 15;
    details.streakPoints = 15;
  }

  // Best streak performance (10 points)
  if (bestStreak > 0) {
    const consistencyRatio = currentStreak / bestStreak;
    if (consistencyRatio >= 0.8) {
      score += 10;
      details.performancePoints = 10;
    } else if (consistencyRatio >= 0.6) {
      score += 7;
      details.performancePoints = 7;
    } else if (consistencyRatio >= 0.4) {
      score += 5;
      details.performancePoints = 5;
    } else if (consistencyRatio > 0) {
      score += 3;
      details.performancePoints = 3;
    }
  } else if (currentStreak > 0) {
    score += 5;
    details.performancePoints = 5;
  }

  return {
    score,
    maxScore: 25,
    currentStreak,
    bestStreak,
    details
  };
}

/**
 * Daily Checklist Completion Score (20 points)
 */
function calculateChecklistScore(userData) {
  const dailyData = userData.dailyData || {};
  const checklist = dailyData.dailyChecklist || {};
  const lastUpdateDate = dailyData.lastChecklistUpdateDate;
  const today = new Date().toDateString();

  let score = 0;
  let completedTasks = 0;
  let totalTasks = Object.keys(checklist).length;

  if (totalTasks === 0) {
    return { score: 0, maxScore: 20, completionRate: 0, details: {} };
  }

  // Count completed tasks
  Object.values(checklist).forEach(task => {
    if (task[0] === true) completedTasks++;
  });

  const completionRate = (completedTasks / totalTasks) * 100;

  // Score based on completion rate (15 points)
  if (completionRate === 100) {
    score += 15;
  } else if (completionRate >= 80) {
    score += 12;
  } else if (completionRate >= 60) {
    score += 9;
  } else if (completionRate >= 40) {
    score += 6;
  } else if (completionRate >= 20) {
    score += 3;
  }

  // Recency bonus (5 points) - checked today
  if (lastUpdateDate === today) {
    score += 5;
  } else {
    // Partial points if checked yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastUpdateDate === yesterday.toDateString()) {
      score += 2;
    }
  }

  return {
    score,
    maxScore: 20,
    completionRate: Math.round(completionRate),
    completedTasks,
    totalTasks,
    isUpToDate: lastUpdateDate === today
  };
}

/**
 * Verse Engagement Score (10 points)
 */
function calculateVerseEngagement(userData) {
  const dailyData = userData.dailyData || {};
  const lastVerseDate = dailyData.lastVerseDate;
  const currentVerseIndex = dailyData.currentVerseIndex || 0;
  const shuffledVerses = dailyData.shuffledVerseKeys || [];
  const today = new Date().toDateString();

  let score = 0;

  // Daily engagement (5 points)
  if (lastVerseDate === today) {
    score += 5;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastVerseDate === yesterday.toDateString()) {
      score += 2;
    }
  }

  // Progress through verses (5 points)
  if (shuffledVerses.length > 0) {
    const progressRate = currentVerseIndex / shuffledVerses.length;
    if (progressRate >= 0.5) {
      score += 5;
    } else if (progressRate >= 0.3) {
      score += 3;
    } else if (progressRate > 0) {
      score += 2;
    }
  }

  return {
    score,
    maxScore: 10,
    lastEngaged: lastVerseDate,
    progress: Math.round((currentVerseIndex / shuffledVerses.length) * 100) || 0
  };
}

/**
 * Streak Momentum Score (15 points)
 * Rewards maintaining or improving streaks
 */
function calculateStreakMomentum(userData) {
  const noFapData = userData.NoFapStreak || {};
  const dailyTaskData = userData.DailyTaskStreak || {};
  
  const nfCurrent = noFapData.NFStreak || 0;
  const nfBest = noFapData.BestStreak || 0;
  const dtCurrent = dailyTaskData.DTStreak || 0;
  const dtBest = dailyTaskData.BestStreak || 0;

  let score = 0;

  // Momentum for matching or beating best streaks (10 points)
  if (nfCurrent >= nfBest && nfCurrent > 0) {
    score += 5; // On track or improving NoFap
  }
  if (dtCurrent >= dtBest && dtCurrent > 0) {
    score += 5; // On track or improving Daily Tasks
  }

  // Combined streak bonus (5 points)
  // Both streaks active
  if (nfCurrent > 0 && dtCurrent > 0) {
    if (nfCurrent >= 7 && dtCurrent >= 7) {
      score += 5; // Both strong
    } else if (nfCurrent >= 3 && dtCurrent >= 3) {
      score += 3; // Both moderate
    } else {
      score += 2; // Both started
    }
  }

  return {
    score,
    maxScore: 15,
    isImproving: (nfCurrent >= nfBest || dtCurrent >= dtBest),
    bothActive: (nfCurrent > 0 && dtCurrent > 0)
  };
}

/**
 * Monthly Consistency Score (5 points)
 * Based on monthly streak data
 */
function calculateMonthlyConsistency(userData) {
  const noFapMonthly = userData.NoFapStreak?.MonthlyStreak || {};
  const dailyTaskMonthly = userData.DailyTaskStreak?.MonthlyStreak || {};
  
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' }).replace(' ', '');
  
  const nfMonthlyDays = noFapMonthly[currentMonth] || 0;
  const dtMonthlyDays = dailyTaskMonthly[currentMonth] || 0;

  let score = 0;

  // Score based on monthly performance
  const avgMonthlyDays = (nfMonthlyDays + dtMonthlyDays) / 2;
  
  if (avgMonthlyDays >= 20) {
    score = 5;
  } else if (avgMonthlyDays >= 15) {
    score = 4;
  } else if (avgMonthlyDays >= 10) {
    score = 3;
  } else if (avgMonthlyDays >= 5) {
    score = 2;
  } else if (avgMonthlyDays > 0) {
    score = 1;
  }

  return {
    score,
    maxScore: 5,
    currentMonth,
    noFapDays: nfMonthlyDays,
    dailyTaskDays: dtMonthlyDays
  };
}

/**
 * Generate human-readable insights
 */
function generateInsights(score, breakdown) {
  let insights = [];

  if (score >= 90) {
    insights.push("Exceptional consistency! You're a role model.");
  } else if (score >= 80) {
    insights.push("Great consistency! Keep up the excellent work.");
  } else if (score >= 70) {
    insights.push("Good consistency. Small improvements will take you higher.");
  } else if (score >= 60) {
    insights.push("Decent progress. Focus on daily habits to improve.");
  } else if (score >= 50) {
    insights.push("You're building momentum. Stay committed!");
  } else {
    insights.push("Time to rebuild your routine. Start with small wins.");
  }

  // Specific suggestions
  if (breakdown.checklistCompletion?.completionRate < 60) {
    insights.push("Complete more daily tasks to boost your score.");
  }

  if (breakdown.noFapStreak?.currentStreak < 3) {
    insights.push("Focus on extending your NoFap streak.");
  }

  if (breakdown.dailyTaskStreak?.currentStreak < 3) {
    insights.push("Build your daily routine consistency.");
  }

  if (breakdown.streakMomentum?.bothActive) {
    insights.push("Great! Both streaks are active.");
  }

  return insights.join(" ");
}

/**
 * Get consistency score with days calculation
 * @param {Object} userData - User data from Firebase
 * @returns {Object} - Score, percentage, and days analyzed
 */
export function getConsistencyWithDays(userData) {
  const result = calculateConsistencyScore(userData);
  
  // Calculate days based on account age and streaks
  const createdAt = userData.createdAt ? new Date(userData.createdAt) : new Date();
  const today = new Date();
  const accountAgeDays = Math.floor((today - createdAt) / (1000 * 60 * 60 * 24));
  
  // Use last 80 days or account age, whichever is smaller
  const daysAnalyzed = Math.min(80, Math.max(accountAgeDays, 1));
  
  return {
    ...result,
    daysAnalyzed,
    accountAgeDays
  };
}