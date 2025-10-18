import { useEffect, useState } from 'react';
import './App.css';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { ref, set, child, get } from 'firebase/database';
import { db } from './firebase';
import { Route, useNavigate, Routes } from 'react-router-dom';
import ProfileSetup from './Components/ProfileSetup';
import TestPage from './Components/TestPage';
import Question from './Components/Questions';
import MyPage from './Components/EditProfile';
import ContentPage from './Components/ContentPage';
import LeaderboardPage from './Components/LeaderboardPage';
import './Components/EditProfile.css'
import ActivityPage from './Components/ActivityPage';

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
  const navigate = useNavigate();

  const handleUserName = async (userName) => {
    if (!userName || userName.trim() === '') {
      setIsAvailable(null);
      return false;
    }

    setIsCheckingUsername(true);
    try {
      // Check in the usernames node for faster lookup
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
  
  // Google Sign-in/Sign-up (handles both cases)
  const handleGoogleAuth = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const uid = user.uid;
      
      setUser(user);
      setShowAuth(false);
      
      // Store user ID
      localStorage.setItem('userId', uid);

      // Check if user already exists in database
      const userRef = ref(db, `users/${uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        // Existing user - Sign In
        const userData = snapshot.val();
        
        // Check if profile is completed (all required fields filled)
        const isProfileComplete = userData.Name && userData.Age && userData.Height && 
                                   userData.Weight && userData.Hobby && userData.City && 
                                   userData.PhoneNumber;
        
        if (isProfileComplete) {
          localStorage.setItem('profileCompleted', 'true');
          localStorage.setItem('UserName', userData.UserName);
          navigate('/home');
        } else {
          localStorage.setItem('signupMethod', 'google');
          localStorage.removeItem('profileCompleted');
          navigate('/profile-setup');
        }
        
        console.log("✅ User signed in:", uid);
      } else {
        // New user - Sign Up
        await set(userRef, {
          Name: "",
          OtherData: {},
          Gender: "",
          Age: "",
          Height: "",
          Weight: "",
          BestStreak: 0,
          PreviousStreak: [],
          UserType: "Normal",
          UserName: "",
          Achievements: [],
          Hobby: "",
          City: "",
          Religion: "",
          PhoneNumber: "",
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
      // Validate username
      if (!userName || userName.trim() === '') {
        throw new Error("Username is required");
      }

      // Check if username is available (fixed condition)
      if (isAvailable === false) {
        throw new Error("Username already taken");
      }

      // Verify username availability one more time before creating account
      const isUsernameValid = await handleUserName(userName);
      if (!isUsernameValid) {
        throw new Error("Username already taken");
      }

      // Create user with email and password
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      const uid = user.uid;

      setUser(user);
      setShowAuth(false);

      // Store user data in Realtime Database
      await set(ref(db, 'users/' + uid), {
        Name: "",
        OtherData: {},
        Gender: "",
        Age: "",
        Height: "",
        Weight: "",
        BestStreak: 0,
        PreviousStreak: [],
        UserType: "Normal",
        UserName: userName,
        Achievements: [],
        Hobby: "",
        City: "",
        Religion: "",
        PhoneNumber: "",
        createdAt: new Date().toISOString(),
      });

      // Store username mapping for quick lookups
      await set(ref(db, `usernames/${userName.toLowerCase()}`), uid);

      // Store user ID and signup method
      localStorage.setItem('userId', uid);
      localStorage.removeItem('profileCompleted');
      localStorage.setItem('signupMethod', 'email');
      localStorage.setItem('UserName', userName);
      
      navigate('/profile-setup');
      console.log("✅ User registered and stored in database:", uid);
    } catch (error) {
      console.error("❌ Error while signing up:", error);

      // Handle specific Firebase errors
      if (error.code === "auth/email-already-in-use") {
        setError("Email is already registered");
      } else if (error.code === "auth/weak-password") {
        setError("Password should be at least 6 characters");
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else if (error.message.includes("Username")) {
        setError(error.message);
      } else {
        setError("Something went wrong. Please try again.");
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
      
      // Store user ID for the session
      localStorage.setItem('userId', user.uid);
      
      // Check if profile is completed by reading user data
      const userRef = ref(db, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // Check if all required profile fields are filled
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

  return (
    <Routes>
      <Route path="/" element={
        <div className="App">
          <div className='Offers'>
            <p>Offer Information will be over here</p>
          </div>
          <header>
            <div className='logo'>Pure Change</div>
            <div className='options'>
              <button className='homebutton'>Home</button>
              <button className='startbutton' onClick={() => setShowAuth(true)}>
                Get Started
              </button>
            </div>
          </header>
          
          {showAuth && (
            <div className='authentication'>
              <div className='card'>
                <button className='close-btn' onClick={() => setShowAuth(false)}>
                  ×
                </button>
                <div className='card-content'>
                  <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                  <p className='subtitle'>{isLogin ? 'Sign in to continue your journey' : 'Sign up to get started with Pure Change'}</p>
                  
                  <button className='google-btn' onClick={handleGoogleAuth}>
                    <svg className='google-icon' viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {isLogin ? 'Continue with Google' : 'Sign up with Google'}
                  </button>
                  
                  <div className='divider'>
                    <span>or</span>
                  </div>
                  
                  <div className='auth-form'>
                    {!isLogin && (
                      <div className='input-group'>
                        <label>UserName</label>
                        <input 
                          type="text" 
                          placeholder="Enter unique User Name" 
                          value={userName}
                          onChange={(e) => setUserName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          onBlur={() => handleUserName(userName)}
                          required={true}
                        />
                        {isCheckingUsername && <p style={{color:'blue'}}>Checking availability...</p>}
                        {isAvailable === false && <p style={{color:'red'}}>Username already taken</p>}
                        {isAvailable === true && <p style={{color:'green'}}>Username available!</p>}
                      </div>
                    )}

                    <div className='input-group'>
                      <label>Email</label>
                      <input 
                        type="email" 
                        placeholder="Enter your email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required={true}
                      />
                    </div>
                    
                    <div className='input-group'>
                      <label>Password</label>
                      <input 
                        type="password" 
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={true}
                      />
                    </div>

                    {error && <div className='error-message' style={{color:'red'}}>{error}</div>}
                    <button 
                      className='signin-btn' 
                      onClick={handleSubmit}
                      disabled={!isLogin && isCheckingUsername}
                    >
                      {isLogin ? 'Sign In' : 'Sign Up'}
                    </button>
                  </div>
                  
                  <p className='toggle-text'>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <span className='toggle-link' onClick={() => setIsLogin(!isLogin)}>
                      {isLogin ? 'Sign Up' : 'Sign In'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
          <div>
            <button className='testPage' onClick={() => navigate('/testpage')}>
                Test Page
            </button>
          </div>
        </div>
      } />
      <Route path="/profile-setup" element={<ProfileSetup />} />
      <Route path='/testpage' element={<TestPage/>} />
      <Route path="/question" element={<Question/>} />
      <Route path='/mypage' element={<MyPage/>} />
      <Route path="/activity" element={<ActivityPage/>} />
      <Route path="/content" element={<ContentPage/>} />
      <Route path="/leaderboard" element={<LeaderboardPage/>} />
    </Routes>
  );
}

export default App;