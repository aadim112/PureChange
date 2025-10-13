import { useState, useEffect } from 'react';
import '../App.css'
import { db } from '../firebase';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { auth, googleProvider} from '../firebase';
import { update } from 'firebase/database';
import { ref, set, child,get} from 'firebase/database';
// ProfileSetup Component - Ready to integrate with React Router


function ProfileSetup() {
    const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    userName: '',
    gender: '',
    age: '',
    height: '',
    weight: '',
    religion: '',
    hobby: '',
    city: '',
    phoneNumber: ''
  });
  
  const [isUsernameDisabled, setIsUsernameDisabled] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [signupMethod, setSignupMethod] = useState('email');

  useEffect(() => {
    // Check if user signed up with email (username already set) or Google
    const checkSignupMethod = () => {
      // Get signup method from localStorage or passed props
      const method = localStorage.getItem('signupMethod') || 'email';
      setSignupMethod(method);
      
      if (method === 'email') {
        // Get existing username from localStorage
        const existingUsername = localStorage.getItem('UserName') || '';
        setFormData(prev => ({ ...prev, userName: existingUsername }));
        setIsUsernameDisabled(true);
      }
    };
    
    checkSignupMethod();
  }, []);

  const handleUserNameCheck = async (userName) => {
    if (!userName || userName.trim() === '') {
      setIsUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    
    try {
      // Replace with your actual Firebase database check
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, "users"));
      
      // Simulate API call for demo
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock check - replace with actual database logic from your code
      const takenUsernames = ['john', 'jane', 'admin', 'test'];
      const isTaken = takenUsernames.includes(userName.toLowerCase());
      
      setIsUsernameAvailable(!isTaken);
    } catch (error) {
      console.error("Error checking username:", error);
      setIsUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setFormData(prev => ({ ...prev, userName: value }));
    setIsUsernameAvailable(null);
  };

  const handleUsernameBlur = () => {
    if (!isUsernameDisabled && formData.userName) {
      handleUserNameCheck(formData.userName);
    }
  };

  const handleClear = () => {
    setFormData({
      name: '',
      userName: isUsernameDisabled ? formData.userName : '',
      gender: '',
      age: '',
      height: '',
      weight: '',
      religion: '',
      hobby: '',
      city: '',
      phoneNumber: ''
    });
    if (!isUsernameDisabled) {
      setIsUsernameAvailable(null);
    }
  };

  const isFormValid = () => {
    const requiredFields = ['name', 'userName', 'age', 'height', 'weight', 'hobby', 'city', 'phoneNumber'];
    const allRequiredFilled = requiredFields.every(field => formData[field] && formData[field].trim() !== '');
    
    // If Google signup, check username availability
    if (!isUsernameDisabled && signupMethod === 'google') {
      return allRequiredFilled && isUsernameAvailable === true;
    }
    
    return allRequiredFilled;
  };

  const handleNext = async () => {
    if (!isFormValid()) return;

    try {
      // Save profile data to Firebase
      const uid = auth.currentUser?.uid;
      await update(ref(db, 'users/' + uid), formData);
      
      console.log('Profile data:', formData);
      alert('Profile setup complete! (In production, this will navigate to next page)');
      
      // Use React Router navigation in your actual code:
      navigate('/home');
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: '600',
          color: '#2d3748',
          marginBottom: '10px',
          textAlign: 'center'
        }}>Complete Your Profile</h2>
        
        <p style={{
          color: '#718096',
          textAlign: 'center',
          marginBottom: '30px',
          fontSize: '14px'
        }}>Help us personalize your experience</p>

        <div style={{ display: 'grid', gap: '20px' }}>
          {/* Name */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#2d3748',
              marginBottom: '8px'
            }}>Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                transition: 'all 0.3s',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6E57FD'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Username */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#2d3748',
              marginBottom: '8px'
            }}>Username *</label>
            <input
              type="text"
              name="userName"
              value={formData.userName}
              onChange={handleUsernameChange}
              onBlur={handleUsernameBlur}
              placeholder="Enter unique username"
              disabled={isUsernameDisabled}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                transition: 'all 0.3s',
                outline: 'none',
                backgroundColor: isUsernameDisabled ? '#f7fafc' : 'white',
                cursor: isUsernameDisabled ? 'not-allowed' : 'text',
                boxSizing: 'border-box'
              }}
            />
            {!isUsernameDisabled && isCheckingUsername && (
              <p style={{ color: '#718096', fontSize: '12px', marginTop: '5px' }}>Checking availability...</p>
            )}
            {!isUsernameDisabled && isUsernameAvailable === false && (
              <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '5px' }}>Username already taken</p>
            )}
            {!isUsernameDisabled && isUsernameAvailable === true && (
              <p style={{ color: '#38a169', fontSize: '12px', marginTop: '5px' }}>Username available!</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#2d3748',
              marginBottom: '8px'
            }}>Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                transition: 'all 0.3s',
                outline: 'none',
                backgroundColor: 'white',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6E57FD'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          {/* Age, Height, Weight - Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#2d3748',
                marginBottom: '8px'
              }}>Age *</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                placeholder="Age"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '14px',
                  transition: 'all 0.3s',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6E57FD'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#2d3748',
                marginBottom: '8px'
              }}>Height (cm) *</label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleInputChange}
                placeholder="Height"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '14px',
                  transition: 'all 0.3s',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6E57FD'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#2d3748',
                marginBottom: '8px'
              }}>Weight (kg) *</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                placeholder="Weight"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '14px',
                  transition: 'all 0.3s',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6E57FD'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          {/* Religion */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#2d3748',
              marginBottom: '8px'
            }}>Religion</label>
            <select
              name="religion"
              value={formData.religion}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                transition: 'all 0.3s',
                outline: 'none',
                backgroundColor: 'white',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6E57FD'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            >
              <option value="">Select religion</option>
              <option value="hinduism">Hinduism</option>
              <option value="islam">Islam</option>
              <option value="christianity">Christianity</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Hobby */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#2d3748',
              marginBottom: '8px'
            }}>Hobby *</label>
            <input
              type="text"
              name="hobby"
              value={formData.hobby}
              onChange={handleInputChange}
              placeholder="e.g., Reading, Sports, Music"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                transition: 'all 0.3s',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6E57FD'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* City */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#2d3748',
              marginBottom: '8px'
            }}>City *</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="Enter your city"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                transition: 'all 0.3s',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6E57FD'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#2d3748',
              marginBottom: '8px'
            }}>Phone Number *</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="Enter your phone number"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                transition: 'all 0.3s',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6E57FD'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '15px',
          marginTop: '30px'
        }}>
          <button
            onClick={handleClear}
            style={{
              flex: 1,
              padding: '14px',
              background: '#2d3748',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => e.target.style.background = '#1a202c'}
            onMouseOut={(e) => e.target.style.background = '#2d3748'}
          >
            Clear
          </button>
          
          <button
            onClick={handleNext}
            disabled={!isFormValid()}
            style={{
              flex: 1,
              padding: '14px',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isFormValid() ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
              opacity: isFormValid() ? 1 : 0.6
            }}
            onMouseOver={(e) => isFormValid() && (e.target.style.background = '#5a45d8')}
            onMouseOut={(e) => isFormValid() && (e.target.style.background = '#6E57FD')}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileSetup;