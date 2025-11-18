  import { useState, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { ref, update, get, set } from 'firebase/database';
  import { db } from '../firebase';
  import styles from './ProfileSetup.module.css';
  import Button from './Button';

  function ProfileSetup() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
      Name: '',
      UserName: '',
      Gender: '',
      Age: '',
      Height: '',
      Weight: '',
      Religion: '',
      Hobby: '',
      City: '',
      PhoneNumber: '',
      ReferralCode: '' // NEW FIELD
    });

    const [isUsernameDisabled, setIsUsernameDisabled] = useState(false);
    const [isUsernameAvailable, setIsUsernameAvailable] = useState(null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [signupMethod, setSignupMethod] = useState('email');
    const [isSaving, setIsSaving] = useState(false);

    // Referral states
    const [isReferralChecking, setIsReferralChecking] = useState(false);
    const [isReferralValid, setIsReferralValid] = useState(null);

    useEffect(() => {
      const profileCompleted = localStorage.getItem('profileCompleted');
      if (profileCompleted === 'true') {
        navigate('/question', { replace: true });
        return;
      }

      const checkSignupMethod = () => {
        const method = localStorage.getItem('signupMethod') || 'email';
        setSignupMethod(method);

        if (method === 'email') {
          const existingUsername = localStorage.getItem('UserName') || '';
          setFormData(prev => ({ ...prev, UserName: existingUsername }));
          setIsUsernameDisabled(true);
        }
      };
      checkSignupMethod();
    }, [navigate]);

    const handleUserNameCheck = async (userName) => {
      if (!userName || userName.trim() === '') {
        setIsUsernameAvailable(null);
        return;
      }
      setIsCheckingUsername(true);
      try {
        const usernameRef = ref(db, `usernames/${userName}`);
        const snapshot = await get(usernameRef);
        setIsUsernameAvailable(!snapshot.exists());
      } catch (error) {
        console.error("Error checking username:", error);
        setIsUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    // Check referral code validity
    const handleReferralCheck = async () => {
      const code = formData.ReferralCode.trim();
      if (!code) {
        setIsReferralValid(null);
        return;
      }

      setIsReferralChecking(true);

      try {
        const referralRef = ref(db, `content/referrals/${code}`);
        const snapshot = await get(referralRef);

        if (!snapshot.exists()) {
          setIsReferralValid(false);
          return;
        }

        const data = snapshot.val();
        const expiresAtStr = data.expiresAtStr;

        if (!expiresAtStr) {
          setIsReferralValid(false);
          return;
        }

        const expiresDate = new Date(expiresAtStr);
        const now = new Date();

        if (expiresDate > now) {
          setIsReferralValid(true);
        } else {
          setIsReferralValid(false);
        }
      } catch (error) {
        console.error("Referral validation error:", error);
        setIsReferralValid(false);
      } finally {
        setIsReferralChecking(false);
      }
    };

    const handleInputChange = (e) => {
      const { name, value } = e.target;

      setFormData(prev => ({ ...prev, [name]: value }));

      if (name === "ReferralCode") {
        setIsReferralValid(null);
      }
    };

    const handleUsernameChange = (e) => {
      const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      setFormData(prev => ({ ...prev, UserName: value }));
      setIsUsernameAvailable(null);
    };

    const handleUsernameBlur = () => {
      if (!isUsernameDisabled && formData.UserName) {
        handleUserNameCheck(formData.UserName);
      }
    };

    const handleClear = () => {
      setFormData({
        Name: '',
        UserName: isUsernameDisabled ? formData.UserName : '',
        Gender: '',
        Age: '',
        Height: '',
        Weight: '',
        Religion: '',
        Hobby: '',
        City: '',
        PhoneNumber: '',
        ReferralCode: ''
      });

      if (!isUsernameDisabled) setIsUsernameAvailable(null);
      setIsReferralValid(null);
    };

    const isFormValid = () => {
      const requiredFields = ['Name', 'UserName', 'Age', 'Height', 'Weight', 'Hobby', 'City', 'PhoneNumber'];
      const allRequiredFilled = requiredFields.every(
        field => formData[field] && formData[field].trim() !== ''
      );

      if (!allRequiredFilled) return false;

      // Username (Google signup)
      if (!isUsernameDisabled && signupMethod === 'google') {
        if (isUsernameAvailable !== true) return false;
      }

      // Referral code: if entered, must be valid
      if (formData.ReferralCode.trim() !== '') {
        if (isReferralValid !== true) return false;
      }

      return true;
    };

    const handleNext = async () => {
    if (!isFormValid()) return;

    setIsSaving(true);
    try {
      const userId = localStorage.getItem('userId');

      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      const updates = {
        Name: formData.Name,
        UserName: formData.UserName,
        Gender: formData.Gender,
        Age: formData.Age,
        Height: formData.Height,
        Weight: formData.Weight,
        Religion: formData.Religion,
        Hobby: formData.Hobby,
        City: formData.City,
        PhoneNumber: formData.PhoneNumber,
        ReferralCode: formData.ReferralCode || null,
        updatedAt: new Date().toISOString()
      };

      // If referral code is valid, add referrer information
      if (formData.ReferralCode.trim() !== '' && isReferralValid === true) {
        try {
          const referralCode = formData.ReferralCode;
          const referralRef = ref(db, `content/referrals/${referralCode}/creator`);
          const creatorSnapshot = await get(referralRef);
          
          if (creatorSnapshot.exists()) {
            const referrerId = creatorSnapshot.val();
            updates['referer/code'] = referralCode;
            updates['referer/refererid'] = referrerId;

            // Add current user to the joined array in content/referrals
            const joinedRef = ref(db, `content/referrals/${referralCode}/joined`);
            const joinedSnapshot = await get(joinedRef);
            
            let joinedArray = [];
            if (joinedSnapshot.exists()) {
              joinedArray = joinedSnapshot.val();
              // Ensure it's an array
              if (!Array.isArray(joinedArray)) {
                joinedArray = [];
              }
            }
            
            // Add current user if not already in array
            if (!joinedArray.includes(userId)) {
              joinedArray.push(userId);
              await set(joinedRef, joinedArray);
            }

            // Add current user to the referrer's joined list in users/{referrerId}/joined
            const referrerJoinedRef = ref(db, `users/${referrerId}/joined/${userId}`);
            await set(referrerJoinedRef, formData.Name);
          }
        } catch (error) {
          console.error('Error fetching referrer ID:', error);
          // Continue with profile save even if referrer fetch fails
        }
      }

      const userRef = ref(db, `users/${userId}`);
      await update(userRef, updates);

      if (signupMethod === 'google') {
        const usernameRef = ref(db, `usernames/${formData.UserName}`);
        await set(usernameRef, userId);
      }

      localStorage.setItem('profileCompleted', 'true');
      localStorage.setItem('UserName', formData.UserName);

      alert('Profile setup complete!');
      navigate('/question', { replace: true });
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(`Error saving profile: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

    return (
      <div className={styles["profile-container"]}>
        <div className={styles["profile-card"]}>
          <h2 className={styles["profile-title"]}>Complete Your Profile</h2>
          <p className={styles["profile-subtitle"]}>Help us personalize your experience</p>

          <div className={styles["form-grid"]}>

            {/* Row 1: Name & Username */}
            <div className={styles["grid-2"]}>
              <div className={styles["input-group"]}>
                <label>Name *</label>
                <input type="text" name="Name" value={formData.Name}
                  onChange={handleInputChange} placeholder="Enter your full name" />
              </div>
              <div className={styles["input-group"]}>
                <label>Username *</label>
                <input
                  type="text"
                  name="UserName"
                  value={formData.UserName}
                  onChange={handleUsernameChange}
                  onBlur={handleUsernameBlur}
                  placeholder="Enter unique username"
                  disabled={isUsernameDisabled}
                  className={isUsernameDisabled ? styles['disabled'] : ''}
                />
                {!isUsernameDisabled && isCheckingUsername && <p className={styles["info-text"]}>Checking availability...</p>}
                {!isUsernameDisabled && isUsernameAvailable === false && <p className={styles["error-text"]}>Username already taken</p>}
                {!isUsernameDisabled && isUsernameAvailable === true && <p className={styles["success-text"]}>Username available!</p>}
              </div>
            </div>

            {/* Row 2: Gender & Religion */}
            <div className={styles["grid-2"]}>
              <div className={styles["input-group"]}>
                <label>Gender</label>
                <select name="Gender" value={formData.Gender} onChange={handleInputChange}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
              <div className={styles["input-group"]}>
                <label>Religion</label>
                <select name="Religion" value={formData.Religion} onChange={handleInputChange}>
                  <option value="">Select religion</option>
                  <option value="hinduism">Hinduism</option>
                  <option value="islam">Islam</option>
                  <option value="christianity">Christianity</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Row 3: Age, Height, Weight */}
            <div className={styles["grid-3"]}>
              <div className={styles["input-group"]}>
                <label>Age *</label>
                <input type="number" name="Age" value={formData.Age} onChange={handleInputChange} placeholder="Age" />
              </div>
              <div className={styles["input-group"]}>
                <label>Height (cm) *</label>
                <input type="number" name="Height" value={formData.Height} onChange={handleInputChange} placeholder="Height" />
              </div>
              <div className={styles["input-group"]}>
                <label>Weight (kg) *</label>
                <input type="number" name="Weight" value={formData.Weight} onChange={handleInputChange} placeholder="Weight" />
              </div>
            </div>

            {/* Row 4: Hobby & City */}
            <div className={styles["grid-2"]}>
              <div className={styles["input-group"]}>
                <label>Hobby *</label>
                <input type="text" name="Hobby" value={formData.Hobby} onChange={handleInputChange} placeholder="e.g., Reading, Sports, Music" />
              </div>
              <div className={styles["input-group"]}>
                <label>City *</label>
                <input type="text" name="City" value={formData.City} onChange={handleInputChange} placeholder="Enter your city" />
              </div>
            </div>

            {/* Row 5: Phone Number */}
            <div className={styles["grid-1"]}>
              <div className={styles["input-group"]}>
                <label>Phone Number *</label>
                <input type="tel" name="PhoneNumber" value={formData.PhoneNumber} onChange={handleInputChange} placeholder="Enter your phone number" />
              </div>
            </div>

            {/* Row 6: Referral Code */}
            <div className={styles["grid-1"]}>
              <div className={styles["input-group"]}>
                <label>Referral Code (optional)</label>
                <input
                  type="text"
                  name="ReferralCode"
                  value={formData.ReferralCode}
                  onChange={handleInputChange}
                  onBlur={handleReferralCheck}
                  placeholder="Enter referral code"
                />

                {isReferralChecking && (
                  <p className={styles["info-text"]}>Checking referral...</p>
                )}

                {isReferralValid === true && (
                  <p className={styles["success-text"]}>Referral code valid!</p>
                )}

                {isReferralValid === false && (
                  <p className={styles["error-text"]}>Invalid or expired referral code</p>
                )}
              </div>
            </div>

          </div>

          <div className={styles["button-group"]}>
            <Button onClick={handleClear} variant='secondary'>Clear</Button>
            <Button
              onClick={handleNext}
              disabled={!isFormValid() || isSaving}
              variant='primary'
            >
              {isSaving ? 'Saving...' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  export default ProfileSetup;
