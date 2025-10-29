import { useEffect, useState } from 'react';
import styles from './App.module.css';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, sendEmailVerification, applyActionCode } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { ref, set, child, get } from 'firebase/database';
import { db } from './firebase';
import { Route, useLocation, Navigate , useNavigate, Routes } from 'react-router-dom';
import ProfileSetup from './Components/ProfileSetup';
import TestPage from './Components/TestPage';
import Question from './Components/Questions';
import EditProfile from './Components/EditProfile';
import ContentPage from './Components/ContentPage';
import LeaderboardPage from './Components/LeaderboardPage';
import ActivityPage from './Components/ActivityPage';
import Button from './Components/Button';
import MyPage from './Components/MyPage';
import MoreContentPage from './Components/MoreContentPage';
import PersonalisedRoutinePage from './Components/PersonalisedRoutinePage';
import AdminLogin from './Components/AdminLogin';
import AdminControlPage from './Components/AdminControlPage';

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [isAvailable, setIsAvailable] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [pendingUserData, setPendingUserData] = useState(null);
  const [verificationTimer, setVerificationTimer] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/") {
      localStorage.removeItem("isAdminLoggedIn");
    }
  }, [location]);

  // Timer effect for verification email resend
  useEffect(() => {
    let interval;
    if (verificationTimer > 0) {
      interval = setInterval(() => {
        setVerificationTimer(prev => prev - 1);
      }, 1000);
    }
    if(localStorage.getItem('userId')){
      navigate('/activity');
    }
    else if (location.pathname=='/admin'){
      navigate('/admin');
    }
    else{
      navigate('/');
    }
    return () => clearInterval(interval);
  }, [verificationTimer]);

  const handleUserName = async (userName) => {
    if (!userName || userName.trim() === '') {
      setIsAvailable(null);
      return false;
    }

    setIsCheckingUsername(true);
    try {
      const usernameRef = ref(db, `usernames/${userName.toLowerCase()}`);
      const snapshot = await get(usernameRef);

      if (snapshot.exists()) {
        setIsAvailable(false);
        setIsCheckingUsername(false);
        return false;
      } else {
        setIsAvailable(true);
        setIsCheckingUsername(false);
        return true;
      }
    } catch (error) {
      console.error("Error checking username:", error);
      setIsAvailable(null);
      setIsCheckingUsername(false);
      return false;
    }
  };

  // Send verification email
  const sendVerificationEmail = async (user) => {
    try {
      await sendEmailVerification(user);
      setIsVerificationSent(true);
      setVerificationTimer(60); // 1 minute before can resend
      setError('');
      console.log("Verification email sent to:", user.email);
    } catch (error) {
      console.error("Error sending verification email:", error);
      setError("Failed to send verification email. Please try again.");
    }
  };

  // Check if email is verified
  const checkEmailVerification = async (user) => {
    try {
      // Reload user to get latest emailVerified status
      await user.reload();
      
      if (user.emailVerified) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking email verification:", error);
      return false;
    }
  };

  
  // Complete sign up after email verification
  const completeSignUp = async () => {
    try {
      const isVerified = await checkEmailVerification(auth.currentUser);
      
      if (!isVerified) {
        setError("Please verify your email first");
        return;
      }

      const uid = auth.currentUser.uid;

      // Store user data in Realtime Database
      await set(ref(db, 'users/' + uid), {
        Name: "",
        OtherData: {},
        Gender: "",
        Age: "",
        Height: "",
        Weight: "",
        NoFapStreak: {
          BestStreak:1,
          NFStreak:1,
        },
        DailyTaskStreak: {
          BestStreak:0,
          DTStreak:0,
        },
        dailyData: {
          fapLastAskedDate: "",
          fapLastAskedTimeTag: "",
          lastDTUpdateDate: "",
          lastNFUpdateDate: "",
          lastChecklistUpdateDate: "",
        },
        UserType: "Normal",
        UserName: pendingUserData.userName,
        Achievements: [],
        Hobby: "",
        City: "",
        Religion: "",
        PhoneNumber: "",
        Email: pendingUserData.email,
        createdAt: new Date().toISOString(),
      });

      // Store username mapping
      await set(ref(db, `usernames/${pendingUserData.userName.toLowerCase()}`), uid);

      // Store user ID and signup method
      localStorage.setItem('userId', uid);
      localStorage.removeItem('emailVerificationPending');
      localStorage.setItem('signupMethod', 'email');
      localStorage.setItem('UserName', pendingUserData.userName);
      
      // IMPORTANT: Set profileCompleted to false so user goes to profile-setup
      localStorage.removeItem('profileCompleted');

      // Clear states
      setPendingUserData(null);
      setShowEmailVerification(false);
      setIsVerificationSent(false);
      setVerificationTimer(0);
      setShowAuth(false); // Close the auth modal
      setUser(auth.currentUser);

      console.log("✅ User registered and stored in database:", uid);
      
      // Navigate to profile-setup AFTER all state updates
      setTimeout(() => {
        navigate('/profile-setup');
      }, 100);
      
    } catch (error) {
      console.error("❌ Error completing sign up:", error);
      setError("Failed to complete registration. Please try again.");
    }
  };

  const handleResendEmail = async () => {
    if (verificationTimer > 0) {
      setError("Please wait before requesting a new verification email");
      return;
    }
    
    try {
      await sendVerificationEmail(auth.currentUser);
      setError('');
    } catch (error) {
      console.error("Error resending verification email:", error);
      setError("Failed to resend verification email");
    }
  };

  // Google Sign-in/Sign-up
  const handleGoogleAuth = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const uid = user.uid;
      const email = user.email;
      const imgurl = user.photoURL;

      setUser(user);
      setShowAuth(false);

      localStorage.setItem('userId', uid);

      const userRef = ref(db, `users/${uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        const isProfileComplete = userData.Name && userData.Age && userData.Height &&
          userData.Weight && userData.Hobby && userData.City &&
          userData.PhoneNumber;

        if (isProfileComplete) {
          localStorage.setItem('profileCompleted', 'true');
          localStorage.setItem('UserName', userData.UserName);
          localStorage.setItem('imgUrl',imgurl);
          console.log("Image Url",imgurl);
          navigate('/activity');
        } else {
          localStorage.setItem('signupMethod', 'google');
          localStorage.removeItem('profileCompleted');
          navigate('/profile-setup');
        }

        console.log("✅ User signed in:", uid);
      } else {
        await set(userRef, {
          Name: "",
          OtherData: {},
          Gender: "",
          Age: "",
          Height: "",
          Weight: "",
          NoFapStreak: {
            BestStreak:1,
            NFStreak:1,
          },
          DailyTaskStreak: {
            BestStreak:0,
            DTStreak:0,
          },
          dailyData: {
            fapLastAskedDate: "",
            fapLastAskedTimeTag: "",
            lastDTUpdateDate: "",
            lastNFUpdateDate: "",
            lastChecklistUpdateDate: "",
          },
          UserType: "Normal",
          UserName: "",
          Achievements: [],
          Hobby: "",
          City: "",
          Religion: "",
          PhoneNumber: "",
          Email: email,
          createdAt: new Date().toISOString(),
        });

        localStorage.removeItem('profileCompleted');
        localStorage.setItem('signupMethod', 'google');

        navigate('/profile-setup');
        console.log("✅ New user registered and stored in database:", uid);
      }

      console.log('User: ', result.user);
    } catch (error) {
      setError(error.message);
      console.log(error);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (!userName || userName.trim() === '') {
        throw new Error("Username is required");
      }

      if (isAvailable === false) {
        throw new Error("Username already taken");
      }

      const isUsernameValid = await handleUserName(userName);
      if (!isUsernameValid) {
        throw new Error("Username already taken");
      }

      // Create user account
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Store pending user data
      setPendingUserData({
        email,
        password,
        userName,
      });

      // Send verification email
      await sendVerificationEmail(user);
      
      // Show verification screen
      setShowEmailVerification(true);
      setError('');

    } catch (error) {
      console.error("❌ Error while signing up:", error);

      if (error.code === "auth/email-already-in-use") {
        setError("Email is already registered");
      } else if (error.code === "auth/weak-password") {
        setError("Password should be at least 6 characters");
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else if (error.message.includes("Username")) {
        setError(error.message);
      } else {
        setError(error.message || "Something went wrong. Please try again.");
      }
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      setUser(user);
      setShowAuth(false);

      localStorage.setItem('userId', user.uid);

      const userRef = ref(db, `users/${user.uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();

        const isProfileComplete = userData.Name && userData.Age && userData.Height &&
          userData.Weight && userData.Hobby && userData.City &&
          userData.PhoneNumber;

        if (isProfileComplete) {
          localStorage.setItem('profileCompleted', 'true');
          localStorage.setItem('UserName', userData.UserName);
          navigate('/activity');
        } else {
          localStorage.setItem('signupMethod', 'email');
          localStorage.removeItem('profileCompleted');
          navigate('/profile-setup');
        }
      } else {
        localStorage.setItem('signupMethod', 'email');
        navigate('/profile-setup');
      }
    } catch (error) {
      setError("Invalid Credentials");
      console.log(error);
    }
  };

  const handleSubmit = (e) => {
    if (isLogin) {
      handleSignIn(e);
    } else {
      handleSignUp(e);
    }
  };

const createOrder = async (amount) => {
  try {
    const response = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });

const order = await response.json();

  const options = {
    key: "rzp_test_RZByCgPA3CgmMz", // ✅ Use your Razorpay *public* key here (not secret)
    amount: order.amount,
    currency: order.currency,
    name: "My Website Name",
    description: "Payment for Order",
    order_id: order.id, // ✅ order id from backend
    handler: function (response) {
      // ✅ This runs after successful payment
      alert("Payment Successful!");
      console.log("Payment details:", response);
      // You can send this response to your backend for verification
    },
    prefill: {
      name: "Test User",
      email: "test@example.com",
      contact: "9999999999",
    },
    theme: {
      color: "#3399cc",
    },
  };

  const razorpay = new window.Razorpay(options);
    razorpay.open();
  } catch (err) {
    console.error(err);
  }
};


  return (
    <Routes>
      <Route path="/" element={
        <div className={styles["App"]}>
          <div className={styles["Offers"]}>
            <p>Offer Information will be over here</p>
          </div>
          <header>
            <div className={styles["logo"]}>Pure Change</div>
            <div className={styles["options"]}>
              <button className={styles["homebutton"]}>Home</button>
              <button className={styles["startbutton"]} onClick={() => {
                setShowAuth(true);
                setShowEmailVerification(false);
                setIsLogin(true);
                setError('');
              }}>
                Get Started
              </button>
            </div>
          </header>

          {showAuth && (
            <div className={styles["authentication"]}>
              <div className={styles["card"]}>
                <button className={styles["close-btn"]} onClick={() => {
                  setShowAuth(false);
                  setShowEmailVerification(false);
                  setError('');
                }}>
                  ×
                </button>
                <div className={styles["card-content"]}>
                  {showEmailVerification ? (
                    // Email Verification Screen
                    <>
                      <h2>Verify Your Email</h2>
                      <p className={styles["subtitle"]}>We've sent a verification email to {pendingUserData?.email}</p>

                      <div className={styles["auth-form"]}>
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <p style={{ marginBottom: '20px' }}>Click the verification link in your email to continue</p>
                          <button
                            className={styles["signin-btn"]}
                            onClick={completeSignUp}
                            style={{ marginBottom: '15px' }}
                          >
                            I've Verified My Email
                          </button>
                          <p style={{ color: '#666', fontSize: '14px' }}>
                            {isVerificationSent && "Verification email sent successfully"}
                          </p>
                        </div>

                        {error && <div className={styles["error-message"]} style={{ color: 'red' }}>{error}</div>}
                      </div>

                      <p className={styles["toggle-text"]}>
                        Didn't receive email?{' '}
                        <span
                          className={styles["toggle-link"]}
                          onClick={handleResendEmail}
                          style={{ cursor: verificationTimer > 0 ? 'not-allowed' : 'pointer', opacity: verificationTimer > 0 ? 0.5 : 1 }}
                        >
                          {verificationTimer > 0 ? `Resend in ${verificationTimer}s` : 'Resend Email'}
                        </span>
                      </p>

                      <p className={styles["toggle-text"]}>
                        <span
                          className={styles["toggle-link"]}
                          onClick={() => {
                            setShowEmailVerification(false);
                            setPendingUserData(null);
                            setError('');
                            setVerificationTimer(0);
                            setIsVerificationSent(false);
                          }}
                        >
                          Back
                        </span>
                      </p>
                    </>
                  ) : (
                    // Sign In/Sign Up Screen
                    <>
                      <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                      <p className={styles["subtitle"]}>{isLogin ? 'Sign in to continue your journey' : 'Sign up to get started with Pure Change'}</p>

                      <button className={styles["google-btn"]} onClick={handleGoogleAuth}>
                        <svg className={styles["google-icon"]} viewBox="0 0 24 24" width="20" height="20">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {isLogin ? 'Continue with Google' : 'Sign up with Google'}
                      </button>

                      <div className={styles["divider"]}>
                        <span>or</span>
                      </div>

                      <div className={styles["auth-form"]}>
                        {!isLogin && (
                          <div className={styles["input-group"]}>
                            <label>UserName</label>
                            <input
                              type="text"
                              placeholder="Enter unique User Name"
                              value={userName}
                              onChange={(e) => setUserName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                              onBlur={() => handleUserName(userName)}
                              required={true}
                            />
                            {isCheckingUsername && <p style={{ color: 'blue' }}>Checking availability...</p>}
                            {isAvailable === false && <p style={{ color: 'red' }}>Username already taken</p>}
                            {isAvailable === true && <p style={{ color: 'green' }}>Username available!</p>}
                          </div>
                        )}

                        <div className={styles["input-group"]}>
                          <label>Email</label>
                          <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required={true}
                          />
                        </div>

                        <div className={styles["input-group"]}>
                          <label>Password</label>
                          <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required={true}
                          />
                        </div>

                        {error && <div className={styles["error-message"]} style={{ color: 'red' }}>{error}</div>}
                        <button
                          className={styles["signin-btn"]}
                          onClick={handleSubmit}
                          disabled={!isLogin && isCheckingUsername}
                        >
                          {isLogin ? 'Sign In' : 'Sign Up'}
                        </button>
                      </div>

                      <p className={styles["toggle-text"]}>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <span className={styles["toggle-link"]} onClick={() => {
                          setIsLogin(!isLogin);
                          setError('');
                          setEmail('');
                          setPassword('');
                          setUserName('');
                          setIsAvailable(null);
                        }}>
                          {isLogin ? 'Sign Up' : 'Sign In'}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={styles['HeroInformation']}>
            <h2>Build Decscipline, Keep your Streak, Stay Motivated</h2>
            <p>Track your progress, check off healthy habits, and consume uplifiting content design to strengthen self control and focus. Simple tools, real momentum.</p>
            <Button variant='primary' onClick={() => {
                setShowAuth(true);
                setShowEmailVerification(false);
                setIsLogin(true);
                setError('');
              }} className={styles['startTrackingButton']}>Start Tracking</Button>
          </div>

          <div className={styles['FistInformationSection']}>
            <div className={styles['headerInformation']}>
              <h2>What You Get</h2>
              <p>Everything you need to stay consistent and motivated </p>
            </div>
            
            <div className={styles['FeaturesCards']}>

              <div className={styles['streakCardContainer']}>
                <div className={styles['streakCard']}></div>
                <div className={styles['FistInformationStatsCard']}>
                  <h2>25k+</h2>
                  <p>Daily Check-ins</p>
                </div>
              </div>

              <div className={styles['streakCardContainer']}>
                <div className={styles['streakCard']}></div>
                <div className={styles['FistInformationStatsCard']}>
                  <h2>92%</h2>
                  <p>Feel More Focused</p>
                </div>
              </div>

              <div className={styles['streakCardContainer']}>
                <div className={styles['streakCard']}></div>
                <div className={styles['FistInformationStatsCard']}>
                  <h2>4.5/5</h2>
                  <p>Community Rating</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <button className={styles["testPage"]} onClick={() => navigate('/testpage')}>
              Test Page
            </button>

            <button className={styles["testPage"]} onClick={() => createOrder(900)}>
              Payment
            </button>
          </div>
        </div>
      } />
      <Route path='/mypage' element={<MyPage/>} />
      <Route path="/profile-setup" element={<ProfileSetup />} />
      <Route path='/testpage' element={<TestPage/>} />
      <Route path="/question" element={<Question/>} />
      <Route path="/activity" element={<ActivityPage/>} />
      <Route path="/content" element={<ContentPage/>} />
      <Route path="/leaderboard" element={<LeaderboardPage/>} />
      <Route path='/edit-profile' element={<EditProfile />} />
      <Route path='/more-content' element={<MoreContentPage />} />
      <Route path='/routine' element={<PersonalisedRoutinePage />} />
      <Route path='/admin' element={<AdminLogin />} />
      <Route
        path='/admin-controls'
        element={
          localStorage.getItem("isAdminLoggedIn") === "true"
            ? <AdminControlPage />
            : <div style={{ textAlign: "center", marginTop: "50px" }}>
                <h3>Unauthorized Access</h3>
                <p>You are not allowed to view this page.</p>
              </div>
        }
      />
    </Routes>
  );
}

export default App;