import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import styles from './LeaderboardPage.module.css';
import clsx from 'clsx';
import Navbar from './Navbar';
import Avatar from './Avatar';
import { ReactComponent as ColouredFlame } from "../assets/ColouredFlame.svg";
import { ReactComponent as RankIcon } from "../assets/RankIcon.svg";
import { 
  getUserRankingData, 
  getLeagueTopUsers, 
  initializeUserRanking,
  LEAGUES 
} from '../services/rankingService';
import usePageActivityTracker from '../hooks/usePageActivityTracker';

export default function LeaderboardPage() {
  const [currentMonth, setCurrentMonth] = useState('');
  const [userId, setUserId] = useState('');
  const [userData, setUserData] = useState({
    Name: null,
    UserName: '',
    Gender: '',
    Religion: '',
    streakNF: 0,
    streakNFB: 0,
    streakNFCM: 0,
    streakDT: 0,
    streakDTB: 0,
    streakDTCM: 0
  });
  const [userRanking, setUserRanking] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Track page activity for score updates
  usePageActivityTracker(userId);

  const getInitials = () => {
    if (userData.Name) {
      const names = userData.Name.split(' ');
      return names.length > 1
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0].substring(0, 2).toUpperCase();
    }
    return userData.UserName ? userData.UserName.substring(0, 2).toUpperCase() : 'U';
  };

  const [profileBig, setProfileBig] = useState(55);
  const [profileSmall, setProfileSmall] = useState(40);

  useEffect(() => {
    const updateProfileSize = () => {
      const width = window.innerWidth;
      if (width < 480) {
        setProfileBig(48);
        setProfileSmall(40);
      } else {
        setProfileBig(55);
        setProfileSmall(40);
      }
    };

    updateProfileSize();
    window.addEventListener("resize", updateProfileSize);
    return () => window.removeEventListener("resize", updateProfileSize);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        // Get current month
        const date = new Date();
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const currMon = `${monthNames[date.getMonth()]}${date.getFullYear()}`;
        setCurrentMonth(currMon);

        // Get userId
        const storedUserId = localStorage.getItem("userId");
        if (!storedUserId) {
          navigate("/");
          return;
        }
        setUserId(storedUserId);

        // Fetch user data
        const userRef = ref(db, `users/${storedUserId}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
          navigate("/");
          return;
        }

        const data = snapshot.val();
        const formattedData = {
          Name: data.Name || '',
          UserName: data.UserName || '',
          Gender: data.Gender || '',
          Religion: data.Religion || '',
          streakNF: data.NoFapStreak?.NFStreak || 0,
          streakNFB: data.NoFapStreak?.BestStreak || 1,
          streakNFCM: data?.NoFapStreak?.MonthlyStreak?.[currMon] || 1,
          streakDT: data.DailyTaskStreak?.DTStreak || 0,
          streakDTB: data.DailyTaskStreak?.BestStreak || 0,
          streakDTCM: data?.DailyTaskStreak?.MonthlyStreak?.[currMon] || 0,
        };
        setUserData(formattedData);

        // Initialize or get user ranking data
        let ranking = await getUserRankingData(storedUserId).catch(async (err) => {
          console.log("Initializing ranking for first time visit...");
          return await initializeUserRanking(storedUserId, data);
        });

        setUserRanking(ranking);

        // Fetch leaderboard data for user's league
        const currentLeague = ranking.currentLeague || LEAGUES.WARRIOR;
        const topUsers = await getLeagueTopUsers(currentLeague, 10);

        // Format leaderboard data
        const formattedLeaderboard = topUsers.map((user, index) => ({
          rank: index + 1,
          initials: user.name 
            ? (user.name.split(' ').length > 1 
                ? `${user.name.split(' ')[0][0]}${user.name.split(' ')[1][0]}`.toUpperCase()
                : user.name.substring(0, 2).toUpperCase())
            : user.username.substring(0, 2).toUpperCase(),
          name: user.name || user.username,
          NFstreak: user.NFStreak.toString(),
          DTstreak: user.DTStreak.toString(),
          globalRank: user.globalRank.toString(),
          highlight: user.userId === storedUserId,
          userId: user.userId
        }));

        // Check if current user is in top 10
        const userInTop10 = formattedLeaderboard.some(u => u.userId === storedUserId);

        // If user not in top 10, add them as 11th entry
        if (!userInTop10) {
          formattedLeaderboard.push({
            rank: ranking.leagueRank[currentLeague] || 0,
            initials: getInitials(),
            name: formattedData.Name || formattedData.UserName,
            NFstreak: formattedData.streakNF.toString(),
            DTstreak: formattedData.streakDT.toString(),
            globalRank: ranking.globalRank.toString(),
            highlight: true,
            userId: storedUserId
          });
        }

        setLeaderboardData(formattedLeaderboard);

      } catch (e) {
        console.error("❌ Initialization failed:", e);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [navigate]);

  if (loading) {
    return (
      <div className={styles["leaderboard-page"]}>
        <Navbar
          pageName="Leaderboard"
          Icon={RankIcon}
          buttons={[
            { label: "Activity", variant: "secondary", route: "/activity" },
            { label: "Ranking", variant: "primary", route: "/leaderboard" },
          ]}
        />
        <div className={styles["main-content"]}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["leaderboard-page"]}>
      <Navbar
        pageName="Leaderboard"
        Icon={RankIcon}
        buttons={[
          { label: "Activity", variant: "secondary", route: "/activity" },
          { label: "Ranking", variant: "primary", route: "/leaderboard" },
        ]}
      />
      
      <div className={styles["main-content"]}>
        {/* User Stats Card */}
        <div className={styles["user-stats-card"]}>
          <div className={styles["user-avatar"]}>
            <Avatar initials={getInitials()} size='medium'/>
            <div className={styles["user-name"]}>{userData.Name}</div>
            {userRanking && (
              <div className={styles["user-league"]}>
                <span className={styles["league-badge"]}>{userRanking.currentLeague}</span>
              </div>
            )}
          </div>

          <div className={styles["stat-item"]}>
            <div className={styles["stat-label"]}>Current Month</div>
            <div className={styles["stat-value-group"]}>
              <div className={styles["stat-value"]}>No Fap : </div>
              <ColouredFlame className={styles["flame"]}/>
              <div className={styles["stat-subvalue"]}>{userData.streakNFCM} Days</div>
            </div>
            <div className={styles["stat-value-group"]}>
              <div className={styles["stat-value"]}>Daily Task : </div>
              <ColouredFlame className={styles["flame"]}/>
              <div className={styles["stat-subvalue"]}>{userData.streakDTCM} Days</div>
            </div>
          </div>

          <div className={styles["stat-item"]}>
            <div className={styles["stat-label"]}>Best</div>
            <div className={styles["stat-value-group"]}>
              <div className={styles["stat-value"]}>No Fap : </div>
              <ColouredFlame className={styles["flame"]}/>
              <div className={styles["stat-subvalue"]}>{userData.streakNFB} Days</div>
            </div>
            <div className={styles["stat-value-group"]}>
              <div className={styles["stat-value"]}>Daily Task : </div>
              <ColouredFlame className={styles["flame"]}/>
              <div className={styles["stat-subvalue"]}>{userData.streakDTB} Days</div>
            </div>
          </div>

          <div className={styles["stat-item"]}>
            <div className={styles["stat-label"]}>Rank</div>
            {userRanking && (
              <>
                <div className={styles["stat-subvalue"]}>
                  {userRanking.leagueRank[userRanking.currentLeague] || 0}
                  {getOrdinalSuffix(userRanking.leagueRank[userRanking.currentLeague] || 0)} in {userRanking.currentLeague}
                </div>
                <div className={styles["stat-subvalue"]}>
                  {userRanking.globalRank || 0}<sup>th</sup> Global
                </div>
                {/* <div className={styles["stat-subvalue"]} style={{ marginTop: '8px', fontSize: '13px', color: '#6366f1' }}>
                  Score: {userRanking.score || 0}
                </div> */}
              </>
            )}
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className={styles["leaderboard-card"]}>
          <div className={styles["leaderboard-header"]}>
            <h2>Leaderboard - {userRanking?.currentLeague || 'Warrior'}</h2>
          </div>

          <div className={styles["leaderboard-list"]}>
            {/* Top 3 with special styling */}
            {leaderboardData.slice(0, 3).map((user) => (
              <div 
                key={user.userId} 
                className={clsx(
                  styles["leaderboard-item"],
                  user.highlight && styles["highlight"],
                  styles[`rank${user.rank}`]
                )}
              >
                <div className={styles["rank-section"]}>
                  <div className={styles["rank-number"]}>
                    {user.rank === 1 && '1st'}
                    {user.rank === 2 && '2nd'}
                    {user.rank === 3 && '3rd'}
                  </div>
                </div>
                <div className={styles["user-section"]}>
                  <Avatar size={profileBig} initials={user.initials} className={styles['usersAvatar']} />
                  <span className={styles["user-name-text"]}>{user.name}</span>
                </div>
                <div className={styles["stats-section"]}>
                  <div className={styles["streak"]}>NF: <span className={styles["streak-value"]}>{user.NFstreak}</span></div>
                  <div className={styles["streak"]}>DT: <span className={styles["streak-value"]}>{user.DTstreak}</span></div>
                  <div className={styles["gblrank"]}>GR: <span className={styles["gblrank-value"]}>{user.globalRank}</span></div>
                </div>
              </div>
            ))}

            {/* Rest of the rankings */}
            {leaderboardData.slice(3).map((user) => (
              <div 
                key={user.userId} 
                className={clsx(
                  styles["leaderboard-item"],
                  user.highlight && styles["highlight"]
                )}
              >
                <div className={styles["rank-section"]}>
                  <div className={styles["rank-number-plain"]}>{user.rank}</div>
                </div>
                <div className={styles["user-section"]}>
                  <Avatar size={profileSmall} initials={user.initials} className={clsx(styles['usersAvatar'],styles["small"])} />
                  <span className={styles["user-name-text"]}>{user.name}</span>
                </div>
                <div className={clsx(styles["stats-section"],styles["small"])}>
                  <div className={clsx(styles["streak"],styles["small"])}>NF: <span className={clsx(styles["streak-value"],styles["small"])}>{user.NFstreak}</span></div>
                  <div className={clsx(styles["streak"],styles["small"])}>DT: <span className={clsx(styles["streak-value"],styles["small"])}>{user.DTstreak}</span></div>
                  <div className={clsx(styles["gblrank"],styles["small"])}>GR: <span className={clsx(styles["gblrank-value"],styles["small"])}>{user.globalRank}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get ordinal suffix
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}