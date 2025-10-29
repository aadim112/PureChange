import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import styles from './PricingPage.module.css';
import { ReactComponent as CreditIcon } from '../assets/Content.svg';
import { ref } from 'firebase/database';
import { db } from '../firebase';
import { set,get } from 'firebase/database';


const CheckIcon = () => (
  <div className={styles["check-icon"]}>
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);



export default function PricingPage() {
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
          name: userData.Name,
          email: userData.Email,
          contact: userData.PhoneNumber,
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

  const plans = [
    {
      name: 'Free',
      description: 'For individuals who want to try out the most advanced features',
      price: 0,
      popular: false,
      features: [
        'Access to daily verses',
        'Basic streak tracking',
        'Daily checklist (4 items)',
        'View leaderboard',
        'General content access',
        'Basic achievement badges',
        'Profile customization',
      ],
    },
    {
      name: 'Pro',
      description: 'For creators ramping up their content production',
      price: isAnnual ? 11 : 500,
      oldPrice: isAnnual ? 22 : null,
      popular: true,
      discount: isAnnual ? 'FIRST MONTH 50% OFF' : null,
      features: [
        'Everything in Free, plus',
        'Unlimited access to Pro content library',
        'Advanced analytics dashboard',
        'Customizable checklist (unlimited items)',
        'Priority support',
        'Export progress reports',
        'Ad-free experience',
        'Exclusive pro badges',
        'Custom routine templates',
      ],
    },
    {
      name: 'Elite',
      description: 'For professionals seeking premium guidance and support',
      price: isAnnual ? 99 : 800,
      popular: false,
      features: [
        'Everything in Pro, plus',
        'Unlimited Elite exclusive content',
        '1-on-1 consultation calls',
        'Personal accountability coach',
        'Custom routine builder',
        'Advanced habit analytics',
        'Community group access',
        'Lifetime achievement badges',
        'Priority content access',
        'Personalized coaching sessions',
      ],
    },
  ];

  return (
    <div className={styles["pricing-page"]}>
      <Navbar
        pageName="Pricing"
        Icon={CreditIcon}
        buttons={[
          { label: "Ranking", variant: "secondary", route: "/leaderboard" },
          { label: "My Routine", variant: "secondary", route: "/routine" },
          { label: "Activity", variant: "secondary", route: "/activity" },
          { label: "My Page", variant: "secondary", route: "/mypage" },
        ]}
      />

      <div className={styles["header"]}>
        <h1 className={styles["title"]}>Pricing</h1>
        <p className={styles["subtitle"]}>
          Plans built for creators and business of all sizes
        </p>
        
        {/* <div className={styles["billing-toggle"]}>
          <span className={`${styles["toggle-label"]} ${!isAnnual ? styles["active"] : ''}`}>
            Monthly
          </span>
          <label className={styles["toggle-switch"]}>
            <input
              type="checkbox"
              checked={isAnnual}
              onChange={() => setIsAnnual(!isAnnual)}
            />
            <span className={styles["slider"]}></span>
          </label>
          <span className={`${styles["toggle-label"]} ${isAnnual ? styles["active"] : ''}`}>
            Annual
          </span>
          {isAnnual && <span className={styles["badge"]}>2 MONTHS FREE</span>}
        </div> */}
      </div>

      <div className={styles["pricing-container"]}>
        <div className={styles["pricing-grid"]}>
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`${styles["pricing-card"]} ${plan.popular ? styles["popular-card"] : ''}`}
            >
              {plan.popular && (
                <div className={styles["popular-badge"]}>MOST POPULAR</div>
              )}

              <div className={styles["plan-header"]}>
                <h2 className={styles["plan-name"]}>{plan.name}</h2>
                <p className={styles["plan-description"]}>{plan.description}</p>
              </div>

              <div className={styles["price-section"]}>
                {plan.discount && (
                  <span className={styles["discount"]}>{plan.discount}</span>
                )}
                <div className={styles["price-container"]}>
                  {plan.oldPrice && (
                    <span className={styles["old-price"]}>₹{plan.oldPrice}</span>
                  )}
                  <span className={styles["currency"]}>₹</span>
                  <span className={styles["price"]}>{plan.price}</span>
                  <span className={styles["period"]}>per month</span>
                </div>
              </div>

              <button
                className={`${styles["get-started-btn"]} ${plan.name === 'Free' ? styles["btn-secondary"] : ''}`}
                onClick={() => createOrder(plan.price)}
              >
                GET STARTED
              </button>

              <div className={styles["features-list"]}>
                <p className={styles["features-title"]}>
                  {plan.name === 'Free' ? 'Features:' : `Everything in ${index === 1 ? 'Free' : 'Pro'}, plus:`}
                </p>
                {plan.features.map((feature, i) => (
                  <div key={i} className={styles["feature-item"]}>
                    <CheckIcon />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}