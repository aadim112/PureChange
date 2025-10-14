import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, update } from 'firebase/database';
import { db } from '../firebase';
import './EditProfile.css';
import { getAuth, linkWithPopup, GoogleAuthProvider } from 'firebase/auth';

const MyPage = () => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
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

    const checkAuthProviders = async () => {
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
            const providers = user.providerData.map(provider => provider.providerId);
            setAuthProviders({
                google: providers.includes('google.com'),
                microsoft: providers.includes('microsoft.com'),
                email: providers.includes('password') // This means email/password registration
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
                setUserData({
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
                });
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching user data:', error);
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const userId = localStorage.getItem('userId');
            const userRef = ref(db, `users/${userId}`);
            await update(userRef, userData);
            setIsEditing(false);
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Error updating profile. Please try again.');
        } finally {
            setIsSaving(false);
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
        <div className="mypage-container">
            {/* Header */}
            <header className="mypage-header">
                <div className="header-left">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                    <h1 className="header-title">Edit Profile</h1>
                </div>
                <button
                    onClick={() => navigate('/activity')}
                    className="activity-button"
                >
                    Activity
                </button>
            </header>

            {/* Main Content */}
            <div className="main-content">
                <div className="content-grid">
                    {/* Left Section - Avatar */}
                    <div className="avatar-section">
                        <div className="avatar-circle">
                            {getInitials()}
                        </div>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="edit-profile-button"
                        >
                            <span>✎</span>
                            <span>edit</span>
                        </button>
                    </div>

                    {/* Right Section - Form */}
                    <div className="form-section">
                        {/* Personal Information */}
                        <div className="form-card">
                            <h2 className="form-title">
                                Personal Information
                            </h2>

                            <div className="form-fields">
                                {/* Name */}
                                <div className="form-field">
                                    <label className="field-label">Name :</label>
                                    <input
                                        type="text"
                                        name="Name"
                                        value={userData.Name}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="field-input"
                                    />
                                </div>

                                {/* Bio */}
                                <div className="form-field">
                                    <label className="field-label">Bio :</label>
                                    <input
                                        type="text"
                                        name="Bio"
                                        value={userData.Bio}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="field-input"
                                    />
                                </div>

                                {/* Email */}
                                <div className="form-field">
                                    <label className="field-label">Email :</label>
                                    <input
                                        type="email"
                                        name="Email"
                                        value={userData.Email}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="field-input"
                                    />
                                    <button className="verify-button">
                                        Verify
                                    </button>
                                </div>

                                {/* Phone No */}
                                <div className="form-field">
                                    <label className="field-label">Phone No :</label>
                                    <input
                                        type="tel"
                                        name="PhoneNumber"
                                        value={userData.PhoneNumber}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="field-input"
                                    />
                                    <button className="verify-button">
                                        Verify
                                    </button>
                                </div>

                                {/* Gender */}
                                <div className="form-field">
                                    <label className="field-label">Gender :</label>
                                    <select
                                        name="Gender"
                                        value={userData.Gender}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="field-input"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                {/* Religion */}
                                <div className="form-field">
                                    <label className="field-label">Religion :</label>
                                    <select
                                        name="Religion"
                                        value={userData.Religion}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="field-input"
                                    >
                                        <option value="">Select religion</option>
                                        <option value="hinduism">Hinduism</option>
                                        <option value="islam">Islam</option>
                                        <option value="christianity">Christianity</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                {/* Weight */}
                                <div className="form-field">
                                    <label className="field-label">Weight :</label>
                                    <input
                                        type="text"
                                        name="Weight"
                                        value={userData.Weight}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        placeholder="kg"
                                        className="field-input"
                                    />
                                </div>

                                {/* Height */}
                                <div className="form-field">
                                    <label className="field-label">Height :</label>
                                    <input
                                        type="text"
                                        name="Height"
                                        value={userData.Height}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        placeholder="cm"
                                        className="field-input"
                                    />
                                </div>

                                {/* Age */}
                                <div className="form-field">
                                    <label className="field-label">Age :</label>
                                    <input
                                        type="number"
                                        name="Age"
                                        value={userData.Age}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="field-input"
                                    />
                                </div>

                                {/* City */}
                                <div className="form-field">
                                    <label className="field-label">City :</label>
                                    <input
                                        type="text"
                                        name="City"
                                        value={userData.City}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="field-input"
                                    />
                                </div>

                                {/* Hobby */}
                                <div className="form-field">
                                    <label className="field-label">Hobby :</label>
                                    <input
                                        type="text"
                                        name="Hobby"
                                        value={userData.Hobby}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="field-input"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Accounts */}
                        <div className="form-card">
                            <h2 className="form-title">
                                Accounts
                            </h2>

                            <div className="form-fields">
                                {/* Google */}
                                <div className="form-field">
                                    <svg width="20" height="20" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    <label className="field-label">Google :</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={authProviders.google ? userData.Email : ''}
                                        placeholder={authProviders.google ? '' : 'Not connected'}
                                        className="field-input disabled-input"
                                    />
                                    <button 
                                        className={`verify-button ${authProviders.google ? 'connected' : ''}`}
                                        disabled={authProviders.google}
                                    >
                                        {authProviders.google ? 'Connected' : 'Not Connected'}
                                    </button>
                                </div>

                                {/* Microsoft */}
                                <div className="form-field">
                                    <svg width="20" height="20" viewBox="0 0 24 24">
                                        <path fill="#F25022" d="M0 0h11.377v11.372H0z"/>
                                        <path fill="#7FBA00" d="M12.623 0H24v11.372H12.623z"/>
                                        <path fill="#00A4EF" d="M0 12.628h11.377V24H0z"/>
                                        <path fill="#FFB900" d="M12.623 12.628H24V24H12.623z"/>
                                    </svg>
                                    <label className="field-label">Microsoft :</label>
                                    <input
                                        type="text"
                                        disabled
                                        placeholder="Not connected"
                                        className="field-input disabled-input"
                                    />
                                    <button className="verify-button">
                                        Verify
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {isEditing && (
                            <div className="action-buttons">
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        fetchUserData();
                                    }}
                                    disabled={isSaving}
                                    className="cancel-button"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="save-button"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyPage;