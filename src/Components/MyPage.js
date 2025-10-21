import Navbar from "./Navbar"
import { ReactComponent as User } from "../assets/User.svg"
import styles from './MyPage.module.css';
import {ReactComponent as Calender} from '../assets/Calender.svg'
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import { ref, get } from "firebase/database";
import Avatar from "./Avatar";

const MyProfile = [
  {label : "Ranking", variant : "secondary", route: '/leaderboard'},
  {label : "My Routine", variant : "secondary", route : "/myroutine"},
  {label : "Activity", variant: "secondary", route : "/activity"},
  {label : "My Page", variant: "primary", route : "/mypage"}
]

const StreakHolderBox  = ({NoFapDays,TotalDays}) =>{
    return(
        <div className={styles["streakHolder"]}>
            <div className={styles['StreakHolderheader']}>
                <Calender/><p>Month</p>
            </div>
            <div className={styles["StreakHolderInfo"]}>
                <p>No Fap:{NoFapDays}</p>
                <p>Daily: {TotalDays}</p>
            </div>  
        </div>
    )
}

const AchievementsBadges = ({}) => {
    return(
        <div className={styles["badge"]}>

        </div>
    )
}

export default function MyPage(){
    const navigate = useNavigate();
    const [userId,setUserId] = useState('');
    const [imgUrl,setImgUrl] = useState('');
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
        UserName: ''
    });

    useEffect(()=>{
        console.log("User from MyPage",userId);
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
                    UserName: data.UserName || ''
                };
                setUserData(formattedData);
                setImgUrl(localStorage.getItem("imgURl"));
                console.log("Image Url",imgUrl);
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
                <div className={styles["profilepanel"]}>
                    <Avatar initials={getInitials()} size="medium"/>
                    <div className={styles["OverviewInformation"]}>
                        <h2 style={{fontWeight: "600"}}>{userData.Name}</h2>
                        <p style={{fontWeight: "500", fontSize:'16px'}}>{userData.UserName}</p>
                        <p style={{fontWeight: "400", fontSize:'14px'}}>{userData.Bio}</p>
                    </div>

                    <div className={styles["seperator"]}></div>

                    <div className={styles["extraInformation"]}>
                        <p>Email: {userData.Email}</p>
                        <p>Phone No: {userData.PhoneNumber}</p>
                        <p>Religion: {userData.Religion}</p>
                        <p>Gender: {userData.Gender}</p>
                    </div>

                    <div className={styles["seperator"]}></div>

                    <div className={styles["linkedAcc"]}>
                        <p>Linked Account</p>
                        <div></div>
                    </div>


                    <div className={styles["actionButtons"]}>
                        <button style={{backgroundColor:'#9240FF'}} onClick={()=>{navigate('/edit-profile')}}>Edit Profile</button>
                        <button style={{backgroundColor:'red'}} onClick={handleLogout}>Logout</button>
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
                                <AchievementsBadges/>
                                <AchievementsBadges/>
                                <AchievementsBadges/>
                                <AchievementsBadges/>
                                <AchievementsBadges/>
                                <AchievementsBadges/>
                                <AchievementsBadges/>
                            </div>
                        </div>
                    </div>
                    <div className={styles["AnalyticsContainer"]}>
                        <div className={styles["Analytics"]}>
                            <h2>Analytics</h2>
                            <div className={styles["fitScore"]}>
                                <div className={styles["fitPlot"]}>
                                    <p style={{fontWeight:'600'}}>Fitness Score</p>
                                    <div className={styles["scoreGraph"]}>

                                    </div>
                                    <p style={{color:'grey'}}>Good! 75% Fit</p>
                                </div>
                                <div className={styles["fitSummary"]}></div>
                            </div>

                            <div className={styles["fitScore"]}>
                                <div className={styles["fitPlot"]}>
                                    <p style={{fontWeight:'600'}}>Consistency Score</p>
                                    <div className={styles["scoreGraph"]}>

                                    </div>
                                    <p style={{color:'grey',textAlign:'center'}}>88% Consistent last 80 days</p>
                                </div>
                                <div className={styles["fitSummary"]}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}