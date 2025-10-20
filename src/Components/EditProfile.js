import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, update, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../firebase';
import { ReactComponent as EditProfileIcon } from "../assets/EditProfile.svg"
import styles from './EditProfile.module.css';
import Navbar from './Navbar';
import Button from './Button';
import { getAuth, linkWithPopup, GoogleAuthProvider } from 'firebase/auth';

const EditProfile = () => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hasChanges, setHasChanges] = useState(false);
    const [authProviders, setAuthProviders] = useState({
        google: false,
        microsoft: false
    });
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
    const [originalData, setOriginalData] = useState({});
    const [verifiedEmail, setVerifiedEmail] = useState('');
    const [verifiedPhone, setVerifiedPhone] = useState('');
    const [emailCheckStatus, setEmailCheckStatus] = useState(''); // 'checking', 'available', 'taken'

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

    const checkAuthProviders = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            
            if (user) {
                const providers = user.providerData.map(provider => provider.providerId);
                setAuthProviders({
                    google: providers.includes('google.com'),
                    microsoft: providers.includes('microsoft.com'),
                    email: providers.includes('password')
                });
            }
        } catch (error) {
            console.error('Error checking auth providers:', error);
        }
    };

    const handleGoogleVerify = async () => {
        try {
            const auth = getAuth();
            const provider = new GoogleAuthProvider();
            await linkWithPopup(auth.currentUser, provider);
            setAuthProviders(prev => ({ ...prev, google: true }));
            alert('Google account linked successfully!');
        } catch (error) {
            console.error('Error linking Google account:', error);
            alert('Error linking Google account. Please try again.');
        }
    };

    // Check if email exists in database for another user
    const checkEmailExists = async (email) => {
        if (!email || email === verifiedEmail) {
            setEmailCheckStatus('');
            return false;
        }

        setEmailCheckStatus('checking');
        
        try {
            const userId = localStorage.getItem('userId');
            const usersRef = ref(db, 'users');
            const emailQuery = query(usersRef, orderByChild('Email'), equalTo(email));
            const snapshot = await get(emailQuery);

            if (snapshot.exists()) {
                // Check if the email belongs to another user
                const users = snapshot.val();
                const userIds = Object.keys(users);
                const belongsToAnotherUser = userIds.some(id => id !== userId);
                
                if (belongsToAnotherUser) {
                    setEmailCheckStatus('taken');
                    return true;
                } else {
                    setEmailCheckStatus('available');
                    return false;
                }
            } else {
                setEmailCheckStatus('available');
                return false;
            }
        } catch (error) {
            console.error('Error checking email:', error);
            setEmailCheckStatus('');
            return false;
        }
    };

    const handleEmailVerify = async () => {
        const emailTaken = await checkEmailExists(userData.Email);
        
        if (emailTaken) {
            alert('This email is already registered to another user. Please use a different email.');
        } else {
            alert('Email verification initiated. Please check your email for verification link.');
            // Add your email verification logic here
        }
    };

    useEffect(() => {
        fetchUserData();
        checkAuthProviders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                setOriginalData(formattedData);
                // Store verified email and phone from database
                setVerifiedEmail(data.Email || '');
                setVerifiedPhone(data.PhoneNumber || '');
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching user data:', error);
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const newUserData = {
            ...userData,
            [name]: value
        };
        setUserData(newUserData);
        
        // Reset email check status when email changes
        if (name === 'Email') {
            setEmailCheckStatus('');
        }
        
        // Check if any field has changed
        const isChanged = Object.keys(newUserData).some(
            key => newUserData[key] !== originalData[key]
        );
        setHasChanges(isChanged);
    };

    const handleSave = async () => {
        // Check if email is taken before saving
        if (userData.Email !== verifiedEmail) {
            const emailTaken = await checkEmailExists(userData.Email);
            if (emailTaken) {
                alert('This email is already registered to another user. Please use a different email.');
                return;
            }
        }

        setIsSaving(true);
        try {
            const userId = localStorage.getItem('userId');
            const userRef = ref(db, `users/${userId}`);
            await update(userRef, userData);
            setOriginalData(userData);
            setHasChanges(false);
            // Update verified email and phone after save
            setVerifiedEmail(userData.Email);
            setVerifiedPhone(userData.PhoneNumber);
            setEmailCheckStatus('');
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Error updating profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setUserData(originalData);
        setHasChanges(false);
        setEmailCheckStatus('');
    };

    // Check if email matches the verified email
    const isEmailVerified = userData.Email && userData.Email === verifiedEmail;
    
    // Check if phone matches the verified phone
    const isPhoneVerified = userData.PhoneNumber && userData.PhoneNumber === verifiedPhone;

    // Determine verify button text and state for email
    const getEmailVerifyButtonText = () => {
        if (isEmailVerified) return 'Verified';
        if (emailCheckStatus === 'checking') return 'Checking...';
        if (emailCheckStatus === 'taken') return 'Email Taken';
        return 'Verify';
    };

    const isEmailVerifyDisabled = isEmailVerified || 
                                   emailCheckStatus === 'checking' || 
                                   emailCheckStatus === 'taken' ||
                                   !userData.Email;

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-content">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles["mypage-container"]}>
        {/* Header */}
        <Navbar
            pageName="Edit Profile"
            Icon={EditProfileIcon}
            buttons={[{ label: "Activity", variant: "primary", route: "/activity" }]}
        />

        {/* Main Content */}
        <div className={styles["main-content"]}>
            <div className={styles["content-grid-profile"]}>
            {/* Left Section - Avatar */}
            <div className={styles["avatar-section"]}>
                <div className={styles["avatar-circle"]}>
                    <img src={localStorage.getItem("imgUrl")} className={styles["avatar-circle"]}/>
                </div>
                <p style={{ fontWeight: '600', margin: '10px', fontSize: '16px' }}>
                {localStorage.getItem('UserName')}
                </p>
                <Button
                variant='secondary'
                onClick={() => setIsEditing(!isEditing)}
                className={styles["edit-profile-button"]}
                >
                <span>Edit</span>
                </Button>
            </div>

            {/* Right Section - Form */}
            <div className={styles["form-section"]}>
                {/* Personal Information */}
                <div className={styles["form-card"]}>
                <h2 className={styles["form-title"]}>Personal Information</h2>

                <div className={styles["form-fields"]}>
                    {/* Name */}
                    <div className={styles["form-field"]}>
                    <label className={styles["field-label"]}>Name :</label>
                    <input
                        type="text"
                        name="Name"
                        value={userData.Name}
                        onChange={handleInputChange}
                        className={styles["field-input"]}
                    />
                    </div>

                    {/* Bio */}
                    <div className={styles["form-field"]}>
                    <label className={styles["field-label"]}>Bio :</label>
                    <input
                        type="text"
                        name="Bio"
                        value={userData.Bio}
                        onChange={handleInputChange}
                        className={styles["field-input"]}
                    />
                    </div>

                    {/* Email */}
                    <div className={styles["form-field"]}>
                    <label className={styles["field-label"]}>Email :</label>
                    <input
                        type="email"
                        name="Email"
                        value={userData.Email}
                        onChange={handleInputChange}
                        className={styles["field-input"]}
                    />
                    <button
                        className={`${styles["verify-button"]} ${
                        isEmailVerified
                            ? styles["verified"]
                            : emailCheckStatus === "taken"
                            ? styles["email-taken"]
                            : ""
                        }`}
                        disabled={isEmailVerifyDisabled}
                        onClick={handleEmailVerify}
                    >
                        {getEmailVerifyButtonText()}
                    </button>
                    </div>

                    {/* Phone No */}
                    <div className={styles["form-field"]}>
                    <label className={styles["field-label"]}>Phone No :</label>
                    <input
                        type="tel"
                        name="PhoneNumber"
                        value={userData.PhoneNumber}
                        onChange={handleInputChange}
                        className={styles["field-input"]}
                    />
                    <button
                        className={`${styles["verify-button"]} ${
                        isPhoneVerified ? styles["verified"] : ""
                        }`}
                        disabled={isPhoneVerified}
                    >
                        {isPhoneVerified ? "Verified" : "Verify"}
                    </button>
                    </div>

                    {/* Gender */}
                    <div className={styles["form-field"]}>
                    <label className={styles["field-label"]}>Gender :</label>
                    <select
                        name="Gender"
                        value={userData.Gender}
                        onChange={handleInputChange}
                        className={styles["field-input"]}
                    >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                    </div>

                    {/* Religion */}
                    <div className={styles["form-field"]}>
                    <label className={styles["field-label"]}>Religion :</label>
                    <select
                        name="Religion"
                        value={userData.Religion}
                        onChange={handleInputChange}
                        className={styles["field-input"]}
                    >
                        <option value="">Select religion</option>
                        <option value="hinduism">Hinduism</option>
                        <option value="islam">Islam</option>
                        <option value="christianity">Christianity</option>
                        <option value="other">Other</option>
                    </select>
                    </div>

                    {/* Weight */}
                    <div className={styles["form-field"]}>
                    <label className={styles["field-label"]}>Weight :</label>
                    <input
                        type="text"
                        name="Weight"
                        value={userData.Weight}
                        onChange={handleInputChange}
                        placeholder="kg"
                        className={styles["field-input"]}
                    />
                    </div>

                    {/* Height */}
                    <div className={styles["form-field"]}>
                    <label className={styles["field-label"]}>Height :</label>
                    <input
                        type="text"
                        name="Height"
                        value={userData.Height}
                        onChange={handleInputChange}
                        placeholder="cm"
                        className={styles["field-input"]}
                    />
                    </div>

                    {/* Age */}
                    <div className={styles["form-field"]}>
                    <label className={styles["field-label"]}>Age :</label>
                    <input
                        type="number"
                        name="Age"
                        value={userData.Age}
                        onChange={handleInputChange}
                        className={styles["field-input"]}
                    />
                    </div>

                    {/* City */}
                    <div className={styles["form-field"]}>
                    <label className={styles["field-label"]}>City :</label>
                    <input
                        type="text"
                        name="City"
                        value={userData.City}
                        onChange={handleInputChange}
                        className={styles["field-input"]}
                    />
                    </div>

                    {/* Hobby */}
                    <div className={styles["form-field"]}>
                    <label className={styles["field-label"]}>Hobby :</label>
                    <input
                        type="text"
                        name="Hobby"
                        value={userData.Hobby}
                        onChange={handleInputChange}
                        className={styles["field-input"]}
                    />
                    </div>
                </div>
                </div>

                {/* Accounts */}
                <div className={styles["form-card"]}>
                <h2 className={styles["form-title"]}>Accounts</h2>

                <div className={styles["form-fields"]}>
                    {/* Google */}
                    <div className={styles["form-field"]}>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <label className={styles["field-label"]}>Google :</label>
                    <input
                        type="text"
                        disabled
                        value={authProviders.google ? verifiedEmail : ""}
                        placeholder={authProviders.google ? "" : "Not connected"}
                        className={`${styles["field-input"]} ${styles["disabled-input"]}`}
                    />
                    <button
                        className={`${styles["verify-button"]} ${
                        authProviders.google ? styles["connected"] : ""
                        }`}
                        disabled={authProviders.google}
                    >
                        {authProviders.google ? "Connected" : "Not Connected"}
                    </button>
                    </div>

                    {/* Microsoft */}
                    <div className={styles["form-field"]}>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#F25022" d="M0 0h11.377v11.372H0z"/>
                        <path fill="#7FBA00" d="M12.623 0H24v11.372H12.623z"/>
                        <path fill="#00A4EF" d="M0 12.628h11.377V24H0z"/>
                        <path fill="#FFB900" d="M12.623 12.628H24V24H12.623z"/>
                    </svg>
                    <label className={styles["field-label"]}>Microsoft :</label>
                    <input
                        type="text"
                        disabled
                        placeholder="Not connected"
                        className={`${styles["field-input"]} ${styles["disabled-input"]}`}
                    />
                    <button className={styles["verify-button"]}>Verify</button>
                    </div>
                </div>
                </div>

                {/* Action Buttons */}
                <div className={styles["action-buttons"]}>
                <div>
                    <Button
                        onClick={handleCancel}
                        disabled={!hasChanges || isSaving}
                        variant="secondary"
                    >
                    Cancel
                    </Button>
                    <Button                        
                        disabled={!hasChanges || isSaving}
                        className={styles["saveButton"]}
                        variant="primary"
                        onClick={handleSave}
                    >
                    {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
                <Button
                    className={styles["LogOut"]}
                    variant="primary"
                    onClick={handleLogout}
                >
                    Logout
                </Button>
                </div>
            </div>
            </div>
        </div>
        <br />
        </div>

    );
};

export default EditProfile;