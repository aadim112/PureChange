import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import styles from './PricingPage.module.css';
import { ref, set, get } from 'firebase/database';
import { db } from '../firebase';
import { ReactComponent as CreditIcon } from '../assets/Pricing.svg';

const CheckIcon = () => (
  <div className={styles["check-icon"]}>
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);
const planLevels = { Free: 1, Pro: 2, Elite: 3 };

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const navigate = useNavigate();
  const [userData, setUserData] = useState('');
  const [navButtons,setNavButtons] = useState([{ label: "Activity", variant: "primary", route: "/activity" }]);
  const [userPlanLevel, setUserPlanLevel] = useState(1);

  useEffect(() => {
    async function init() {
      try {
        const storedUserId = localStorage.getItem("userId");
        if (!storedUserId) {
          navigate("/");
          return;
        }

        const userRef = ref(db, `users/${storedUserId}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) return;

        const data = snapshot.val();
        const formattedData = {
          Name: data.Name || '',
          UserName: data.UserName || '',
          Gender: data.Gender || '',
          UserType: data.UserType || '',
        };
        setUserData(formattedData);
        const level = planLevels[data.UserType] || 1;
        setUserPlanLevel(level);
      } catch (e) {
        console.error("❌ Initialization failed:", e);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (userData.UserType === 'Normal') {
      setNavButtons([]);
    }
  }, [userData.UserType]);

  const updateUserTypeAndRedirect = async (planName) => {
    try {
      const storedUserId = localStorage.getItem("userId");
      if (!storedUserId) return;

      const userRef = ref(db, `users/${storedUserId}/UserType`);
      await set(userRef, planName);

      setUserData((prev) => ({ ...prev, UserType: planName }));

      const currentDate = new Date().toDateString();
      let expirydate = new Date();
      const startdateRef = ref(db, `users/${storedUserId}/dailyData/planStartDate`);
      const expirydateRef = ref(db, `users/${storedUserId}/dailyData/planExpiryDate`);
      expirydate.setDate(expirydate.getDate() + (isAnnual ? 365 : 30));
      expirydate = expirydate.toDateString();
      await set(expirydateRef, expirydate);
      await set(startdateRef, currentDate);

      navigate('/activity');
    } catch (error) {
      console.error("❌ Failed to update UserType:", error);
    }
  };

  const createOrder = async (amount, planName) => {
    if (planName === 'Free') {
      alert("You have activated the Free plan!");
      await updateUserTypeAndRedirect(planName);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const order = await response.json();
      const options = {
        key: "rzp_test_RZByCgPA3CgmMz",
        amount: order.amount,
        currency: order.currency,
        name: "My Website Name",
        description: "Payment for Order",
        order_id: order.id,
        handler: async function (response) {
          alert("Payment Successful!");
          console.log("Payment details:", response);
          await updateUserTypeAndRedirect(planName);
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
      price: isAnnual ? 11 : 499,
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
      price: isAnnual ? 99 : 799,
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
        buttons={navButtons}
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
          {plans.map((plan, index) => {
            const isCurrentPlan = userData?.UserType === plan.name;

            return (
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
                  className={`${styles["get-started-btn"]} 
                              ${plan.name === 'Free' ? styles["btn-secondary"] : ''} 
                              ${isCurrentPlan ? styles["current-plan-btn"] : ''}`}
                  onClick={() => {
                    if (!isCurrentPlan && planLevels[plan.name] >= userPlanLevel) {
                      createOrder(plan.price, plan.name);
                    }
                  }}
                  disabled={isCurrentPlan || planLevels[plan.name] < userPlanLevel}
                >
                  {isCurrentPlan
                    ? "CURRENT PLAN"
                    : planLevels[plan.name] < userPlanLevel
                    ? "NOT AVAILABLE"
                    : "GET STARTED"}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}