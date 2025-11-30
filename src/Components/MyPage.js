import Navbar from "./Navbar"
import { ReactComponent as User } from "../assets/User.svg"
import styles from './MyPage.module.css';
import {ReactComponent as Calender} from '../assets/Calender.svg'
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import { ref, get } from "firebase/database";
import Avatar from "./Avatar";
import UpgradePopup from './UpgradePlanPopup';
import { calculateConsistencyScore, getConsistencyWithDays } from "../services/consistencyService";
import { getUserBadges, autoAwardBadges, BADGE_TYPES } from "../services/badgeService";

const StreakHolderBox = ({month = "Month", NoFapDays, TotalDays}) => {
    return(
        <div className={styles["streakHolder"]}>
            <div className={styles['StreakHolderheader']}>
                <Calender/><p style={{fontSize:'18px'}}>{month}</p>
            </div>
            <div className={styles["StreakHolderInfo"]}>
                <p style={{fontSize:'14px'}}>No Fap: {NoFapDays || 0}</p>
                <p style={{fontSize:'14px'}}>Daily: {TotalDays || 0}</p>
            </div>  
        </div>
    )
}

const AchievementsBadges = ({ badges = [] }) => {
  const [failedImages, setFailedImages] = useState(new Set());

  const handleImageError = (name) => {
    setFailedImages(prev => new Set([...prev, name]));
  };

  return (
    <div className={styles["badgeContainer"]}>
      {badges.length > 0 ? (
        badges.map((name, index) => (
          <div key={index} className={styles["badge"]} title={name}>
            {!failedImages.has(name) ? (
              <img 
                src={`/achivement/${name}.svg`} 
                alt={name} 
                className={styles["badgeImage"]} 
                onError={() => handleImageError(name)} 
              /> 
            ) : (
              <div className={styles["badgePlaceholder"]}>🏆</div>
            )}
          </div>
        ))
      ) : (
        <p className={styles["noBadgeText"]}>No Achievements Yet</p>
      )}
    </div>
  );
};

const CircularScoreBar = ({value}) => {
    const normalizedValue = Math.min(Math.max(value, 0), 100);
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (normalizedValue / 100) * circumference;

    return (
        <div className="circular-score">
            <svg className={styles["circle"]} width="80" height="80">
                <circle className={styles["bg"]} cx="40" cy="40" r={radius} strokeWidth="10" fill="none"/>
                <circle className={styles["progress"]} cx="40" cy="40" r={radius} strokeWidth="10" fill="none" strokeDasharray={circumference} strokeDashoffset={offset}/>
                <text x="50%" y="50%" textAnchor="middle" dy=".3em" className={styles["text"]}> {normalizedValue}%</text>
            </svg>
        </div>
    );
};

export default function MyPage(){
    const navigate = useNavigate();
    const [userData, setUserData] = useState({
        Name: '',
        Bio: '',
        Email: '',
        PhoneNumber: '',
        Gender: '',
        Religion: '',
        Weight: '',
        Height: '',
        Age: '',
        City: '',
        Hobby: '',
        UserName: '',
        HealthScore: '',
        userType: '',
    });
    const [monthlyStreaks, setMonthlyStreaks] = useState([]);
    const [consistencyData, setConsistencyData] = useState({
        score: 0,
        daysAnalyzed: 80,
        insights: ''
    });
    const [fullUserData, setFullUserData] = useState(null);
    const [upgradePopupData, setUpgradePopupData] = useState({
        show: false,
        requiredPlan: ''
    });
    const [userBadges, setUserBadges] = useState([]);
    const [isLoadingBadges, setIsLoadingBadges] = useState(true);

    useEffect(() => {
        fetchUserData();
        fetchMonthlyStreaks();
    }, []);

    const fetchUserData = async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                navigate('/');
                return;
            }

            const userRef = ref(db, `users/${userId}`);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                const data = snapshot.val();
                
                // Store complete data for consistency calculation
                setFullUserData(data);
                
                const formattedData = {
                    Name: data.Name || '',
                    Bio: data.Bio || '',
                    Email: data.Email || '',
                    PhoneNumber: data.PhoneNumber || '',
                    Gender: data.Gender || '',
                    Religion: data.Religion || '',
                    Weight: data.Weight || '',
                    Height: data.Height || '',
                    Age: data.Age || '',
                    City: data.City || '',
                    Hobby: data.Hobby || '',
                    UserName: data.UserName || '',
                    HealthScore: data.HealthScore || '',
                    userType: data.UserType || '',
                };
                setUserData(formattedData);
                
                // Calculate consistency score
                const consistency = getConsistencyWithDays(data);
                setConsistencyData({
                    score: consistency.score,
                    daysAnalyzed: consistency.daysAnalyzed,
                    insights: consistency.insights,
                    breakdown: consistency.breakdown
                });
                
                // Fetch and auto-award badges
                await fetchAndAwardBadges(userId, data);
                
                console.log('Consistency Score:', consistency);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const fetchAndAwardBadges = async (userId, userData) => {
        try {
            setIsLoadingBadges(true);
            
            // First, auto-award badges based on achievements
            const awardResult = await autoAwardBadges(userId, userData);
            
            if (awardResult.awarded.length > 0) {
                console.log('New badges awarded:', awardResult.awarded);
                // You could show a toast notification here
                // showToast(`Congratulations! You earned ${awardResult.awarded.length} new badge(s)!`);
            }
            
            // Then fetch all badges
            const badgeResult = await getUserBadges(userId);
            
            if (badgeResult.success) {
                setUserBadges(badgeResult.badges);
                console.log('User badges:', badgeResult.badges);
            } else {
                console.error('Failed to fetch badges');
                setUserBadges([]);
            }
            
        } catch (error) {
            console.error('Error fetching badges:', error);
            setUserBadges([]);
        } finally {
            setIsLoadingBadges(false);
        }
    };

    const fetchMonthlyStreaks = async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            const noFapStreakRef = ref(db, `users/${userId}/NoFapStreak/MonthlyStreak`);
            const dailyTaskStreakRef = ref(db, `users/${userId}/DailyTaskStreak/MonthlyStreak`);
            
            const [noFapSnapshot, dailyTaskSnapshot] = await Promise.all([
                get(noFapStreakRef),
                get(dailyTaskStreakRef)
            ]);

            const noFapData = noFapSnapshot.exists() ? noFapSnapshot.val() : {};
            const dailyTaskData = dailyTaskSnapshot.exists() ? dailyTaskSnapshot.val() : {};

            // Get all unique months from both datasets
            const allMonths = new Set([...Object.keys(noFapData), ...Object.keys(dailyTaskData)]);
            
            const streaksArray = Array.from(allMonths).map(month => ({
                month: month,
                NoFapDays: noFapData[month] || 0,
                TotalDays: dailyTaskData[month] || 0
            }));
            
            // Sort by most recent months
            streaksArray.sort((a, b) => b.month.localeCompare(a.month));
            
            setMonthlyStreaks(streaksArray);
        } catch (error) {
            console.error('Error fetching monthly streaks:', error);
        }
    };

    const getInitials = () => {
        if (userData.Name) {
            const names = userData.Name.split(' ');
            return names.length > 1
                ? `${names[0][0]}${names[1][0]}`.toUpperCase()
                : names[0].substring(0, 2).toUpperCase();
        }
        return userData.UserName ? userData.UserName.substring(0, 2).toUpperCase() : 'U';
    };

    const handleLogout = async () => {
        try {
            const auth = getAuth();
            await auth.signOut();
            
            localStorage.removeItem('userId');
            localStorage.removeItem('UserName');
            
            navigate('/');
        } catch (error) {
            console.error('Error during logout:', error);
            alert('Error logging out. Please try again.');
        }
    };

    const handleNavClick = (label, route) => {
        const userType = userData.userType || 'Free'; 
        
        if (label === "My Routine" && userType === 'Free') {
            setUpgradePopupData({ show: true, requiredPlan: 'Pro' });
        } else {
            navigate(route);
        }
    };

    const navButtons = [
        { 
            label: "My Routine", 
            variant: "secondary", 
            action: () => handleNavClick("My Routine", "/routine")
        },
        { label: "Activity", variant: "secondary", route: "/activity" },
        { label: "My Page", variant: "primary", route: "/mypage" }
    ];

    return(
        <div>
            <Navbar pageName="Profile" buttons={navButtons} Icon={User}/>
            <div className={styles["infoContainer"]}>
                <div className={styles["profilepanelContainer"]}>
                    <div className={styles["profilepanel"]}>
                        <Avatar initials={getInitials()} size="medium"/>
                        <div className={styles["OverviewInformation"]}>
                            <h2 style={{fontWeight: "600", fontSize:'26px'}}>{userData.Name}</h2>
                            <p style={{fontWeight: "500", fontSize:'12px'}}>{userData.UserName}</p>
                            <p style={{fontWeight: "400", fontSize:'12px'}}>{userData.Bio}</p>
                        </div>

                        <div className={styles["extraInformation"]}>
                            <span style={{display:'flex', gap:'5px'}}>
                                <p style={{marginLeft:'20px', fontWeight:'600'}}>Email: </p>
                                <p>{userData.Email}</p>
                            </span>
                            <span style={{display:'flex', gap:'5px'}}>
                                <p style={{marginLeft:'20px', fontWeight:'600'}}>Phone No: </p>
                                <p>{userData.PhoneNumber}</p>
                            </span>
                            <span style={{display:'flex', gap:'5px'}}>
                                <p style={{marginLeft:'20px', fontWeight:'600'}}>Religion: </p>
                                <p>{userData.Religion}</p>
                            </span>
                            <span style={{display:'flex', gap:'5px'}}>
                                <p style={{marginLeft:'20px', fontWeight:'600'}}>Gender: </p>
                                <p>{userData.Gender}</p>
                            </span>
                        </div>

                        <div className={styles["userPlanSection"]}>
                            <p>User Plan</p>
                            <div className={styles["userPlan"]}>{userData.userType}</div>
                            <button className={styles["upgradeButton"]} onClick={() => {navigate('/pricing')}}>
                                Upgrade Plan
                            </button>
                        </div>

                        <div className={styles["actionButtons"]}>
                            <button 
                                style={{backgroundColor:'#6E57FF'}} 
                                onClick={() => {navigate('/edit-profile')}}
                            >
                                Edit Profile
                            </button>
                            <button 
                                style={{backgroundColor:'red'}} 
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
                <div className={styles["OtherDetails"]}>
                    <div className={styles["DailyInformationContainer"]}>
                        <div className={styles["streakHistory"]}>
                            <h2>Streak History</h2>
                            <div className={styles["streakHolderContainer"]}>
                                {monthlyStreaks.length > 0 ? (
                                    monthlyStreaks.map((streak, index) => (
                                        <StreakHolderBox 
                                            key={index}
                                            month={streak.month}
                                            NoFapDays={streak.NoFapDays}
                                            TotalDays={streak.TotalDays}
                                        />
                                    ))
                                ) : (
                                    <p style={{color: 'grey', padding: '20px'}}>
                                        No streak data available
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className={styles["Achievements"]}>
                            <h2>Achievements</h2>
                            <div className={styles["AchievementHolder"]}>
                                {isLoadingBadges ? (
                                    <p style={{color: 'grey', padding: '20px'}}>
                                        Loading badges...
                                    </p>
                                ) : (
                                    <AchievementsBadges badges={userBadges} />
                                )}
                            </div>
                            {!isLoadingBadges && userBadges.length > 0 && (
                                <p style={{
                                    fontSize: '12px', 
                                    color: 'grey', 
                                    textAlign: 'center', 
                                    marginTop: '10px'
                                }}>
                                    {userBadges.length} badge{userBadges.length !== 1 ? 's' : ''} earned
                                </p>
                            )}
                        </div>
                    </div>
                    <div className={styles["AnalyticsContainer"]}>
                        <div className={styles["Analytics"]}>
                            <h2>Analytics</h2>
                            <div className={styles["fitScoreContainer"]}>
                                <div className={styles["fitScore"]}>
                                    <div className={styles["fitPlot"]}>
                                        <p style={{fontWeight:'500', fontSize:'15px'}}>
                                            Fitness Score
                                        </p>
                                        <div className={styles["scoreGraph"]}>
                                            <CircularScoreBar value={userData.HealthScore}/>
                                        </div>
                                        <p style={{
                                            color:'grey',
                                            fontWeight:'500',
                                            fontSize:'15px',
                                            width:'80%',
                                            textAlign:'center'
                                        }}>
                                            Good! {userData.HealthScore}% Fit
                                        </p>
                                    </div>
                                    <div className={styles["fitSummary"]}></div>
                                </div>

                                <div className={styles["fitScore"]}>
                                    <div className={styles["fitPlot"]}>
                                        <p style={{fontWeight:'500', fontSize:'15px'}}>
                                            Consistency Score
                                        </p>
                                        <div className={styles["scoreGraph"]}>
                                            <CircularScoreBar value={consistencyData.score}/>
                                        </div>
                                        <p style={{
                                            color:'grey',
                                            textAlign:'center',
                                            fontWeight:'500',
                                            fontSize:'15px',
                                            width:'80%'
                                        }}>
                                            {consistencyData.score}% Consistent last {consistencyData.daysAnalyzed} days
                                        </p>
                                    </div>
                                    <div className={styles["fitSummary"]}>
                                        {consistencyData.insights && (
                                            <p style={{
                                                fontSize:'12px', 
                                                color:'grey', 
                                                padding:'10px', 
                                                textAlign:'center'
                                            }}>
                                                {consistencyData.insights}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <UpgradePopup 
                show={upgradePopupData.show} 
                onClose={() => setUpgradePopupData({ ...upgradePopupData, show: false })} 
                requiredPlan={upgradePopupData.requiredPlan} 
            />
        </div>
    )
}