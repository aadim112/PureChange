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

const MyProfile = [
  {label : "Ranking", variant : "secondary", route: '/leaderboard'},
  {label : "My Routine", variant : "secondary", route : "/routine"},
  {label : "Activity", variant: "secondary", route : "/activity"},
  {label : "My Page", variant: "primary", route : "/mypage"}
]

const StreakHolderBox  = ({NoFapDays,TotalDays}) =>{
    return(
        <div className={styles["streakHolder"]}>
            <div className={styles['StreakHolderheader']}>
                <Calender/><p style={{fontSize:'18px'}}>Month</p>
            </div>
            <div className={styles["StreakHolderInfo"]}>
                <p style={{fontSize:'14px'}}>No Fap:{NoFapDays}</p>
                <p style={{fontSize:'14px'}}>Daily: {TotalDays}</p>
            </div>  
        </div>
    )
}

const AchievementsBadges = ({ names = [] }) => {
  const [failedImages, setFailedImages] = useState(new Set());

  const handleImageError = (name) => {
    setFailedImages(prev => new Set([...prev, name]));
  };

  return (
    <div className={styles["badgeContainer"]}>
      {names.length > 0 ? (
        names.map((name, index) => (
          <div key={index} className={styles["badge"]}>
            {!failedImages.has(name) ? (
              <img src={`/achivement/${name}.svg`} alt={name} className={styles["badgeImage"]} onError={() => handleImageError(name)} /> ) : (
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


const CircularScoreBar= ({value}) => {
    const normalizedValue = Math.min(Math.max(value, 0), 100); // Clamp 0–100
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (normalizedValue / 100) * circumference;

    return (
        <div className="circular-score">
            <svg className={styles["circle"]} width="80" height="80">
                <circle className={styles["bg"]} cx="40"cy="40" r={radius} strokeWidth="10" fill="none"/>
                <circle className={styles["progress"]} cx="40" cy="40" r={radius} strokeWidth="10" fill="none" strokeDasharray={circumference} strokeDashoffset={offset}/>
                <text x="50%" y="50%" textAnchor="middle" dy=".3em" className={styles["text"]}> {normalizedValue}%</text>
            </svg>
        </div>
    );
};

export default function MyPage(){
    const navigate = useNavigate();
    const userId = ''
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
        healthScore : '',
        userType : '',
    });

    useEffect(()=>{
        fetchUserData();
    },[]);

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
                    healthScore : data.healthScore || '',
                    userType : data.UserType || '',
                };
                setUserData(formattedData);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
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
            
            // Clear localStorage
            localStorage.removeItem('userId');
            localStorage.removeItem('UserName');
            
            // Navigate to login/home page
            navigate('/');
        } catch (error) {
            console.error('Error during logout:', error);
            alert('Error logging out. Please try again.');
        }
    };
    return(
        <div>
            <Navbar pageName="Profile" buttons={MyProfile} Icon={User}/>
            <div className={styles["infoContainer"]}>
                <div className={styles["profilepanelContainer"]}>
                    <div className={styles["profilepanel"]}>
                        <Avatar initials={getInitials()} size="medium"/>
                        <div className={styles["OverviewInformation"]}>
                            <h2 style={{fontWeight: "600",fontSize:'26px'}}>{userData.Name}</h2>
                            <p style={{fontWeight: "500", fontSize:'12px'}}>{userData.UserName}</p>
                            <p style={{fontWeight: "400", fontSize:'12px'}}>{userData.Bio}</p>
                        </div>

                        <div className={styles["seperator"]}></div>

                        <div className={styles["extraInformation"]}>
                            <span style={{display:'flex',gap:'5px'}}><p style={{marginLeft:'20px',fontWeight:'600'}}>Email: </p><p>{userData.Email}</p></span>
                            <span style={{display:'flex',gap:'5px'}}><p style={{marginLeft:'20px',fontWeight:'600'}}>Phone No: </p><p>{userData.PhoneNumber}</p></span>
                            <span style={{display:'flex',gap:'5px'}}><p style={{marginLeft:'20px',fontWeight:'600'}}>Religion: </p><p>{userData.Religion}</p></span>
                            <span style={{display:'flex',gap:'5px'}}><p style={{marginLeft:'20px',fontWeight:'600'}}>Gender: </p><p>{userData.Gender}</p></span>
                        </div>

                        <div className={styles["seperator"]}></div>

                        <div className={styles["userPlanSection"]}>
                            <p>User Plan</p>
                            <div className={styles["userPlan"]}>{userData.userType}</div>
                            <button className={styles["upgradeButton"]} onClick={()=>{navigate('/pricing')}}>Upgrade Plan</button>
                        </div>


                        <div className={styles["actionButtons"]}>
                            <button style={{backgroundColor:'#6E57FF'}} onClick={()=>{navigate('/edit-profile')}}>Edit Profile</button>
                            <button style={{backgroundColor:'red'}} onClick={handleLogout}>Logout</button>
                        </div>
                    </div>
                </div>
                <div className={styles["OtherDetails"]}>
                    <div className={styles["DailyInformationContainer"]}>
                        <div className={styles["streakHistory"]}>
                            <h2>Streak History</h2>
                            <div className={styles["streakHolderContainer"]}>
                                <StreakHolderBox />
                                <StreakHolderBox />
                                <StreakHolderBox />
                                <StreakHolderBox />
                                <StreakHolderBox />
                                <StreakHolderBox />
                            </div>
                        </div>
                        <div className={styles["Achievements"]}>
                            <h2>Achievements</h2>
                            <div className={styles["AchievementHolder"]}>
                                <AchievementsBadges names={["bronze", "finisher", "firstlogin","gold","premium"]} />
                            </div>
                        </div>
                    </div>
                    <div className={styles["AnalyticsContainer"]}>
                        <div className={styles["Analytics"]}>
                            <h2>Analytics</h2>
                            <div className={styles["fitScoreContainer"]}>
                                <div className={styles["fitScore"]}>
                                    <div className={styles["fitPlot"]}>
                                        <p style={{fontWeight:'500',fontSize:'15px'}}>Fitness Score</p>
                                        <div className={styles["scoreGraph"]}>
                                            <CircularScoreBar value={userData.healthScore}/>
                                        </div>
                                        <p style={{color:'grey',fontWeight:'500',fontSize:'15px',width:'80%',textAlign:'center'}}>Good! {userData.healthScore}% Fit</p>
                                    </div>
                                    <div className={styles["fitSummary"]}></div>
                                </div>

                                <div className={styles["fitScore"]}>
                                    <div className={styles["fitPlot"]}>
                                        <p style={{fontWeight:'500',fontSize:'15px'}}>Consistency Score</p>
                                        <div className={styles["scoreGraph"]}>
                                            <CircularScoreBar value={90}/>
                                        </div>
                                        <p style={{color:'grey',textAlign:'center',fontWeight:'500',fontSize:'15px',width:'80%',textAlign:'center'}}>88% Consistent last 80 days</p>
                                    </div>
                                    <div className={styles["fitSummary"]}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}