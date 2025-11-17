import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import styles from './ActivityPage.module.css';
import Navbar from './Navbar';
import { ReactComponent as Flame } from "../assets/Flame.svg"
import { ReactComponent as NoSign } from "../assets/NoSign.svg"
import { ReactComponent as Sun } from "../assets/Sun.svg"
import ImgGeneralContent from "../assets/ImgGeneralContent.png";
import ImgProContent from "../assets/ImgProContent.png";
import ImgEliteContent from "../assets/ImgEliteContent.png";
import ImgDailyQuotes from "../assets/ImgDailyQuotes.png";
import { useNavigate } from 'react-router-dom';
import { ref, set, get, } from 'firebase/database';
import { db } from '../firebase';
import {
  initDailyDataIfMissing,
  updateDailyDataFields,
  toggleChecklistItem,
  handleDailyVerseLogic,
  buildDailyChecklistForUser
} from "../services/contentService";
import { generateEmergencyMotivation } from '../services/llmService';
import {
  createReferralCode,
  fetchReferralInfo,
  saveBankDetails,
  appendTransaction,
  isReferralCodeValid,
  revokeReferralCode
} from "../services/referalService";
import referralRules from '../services/referalService';

function CardImage({ src, alt }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    img.src = src;
    img.onload = () => { if (!cancelled) setLoaded(true); };
    img.onerror = () => { if (!cancelled) setFailed(true); };
    return () => { cancelled = true; };
  }, [src]);

  return (
    // .card-image contains the gradient background and *fixed* rectangle size.
    <div className={styles["card-image"]} aria-hidden={!src}>
      {/* image element placed in DOM always but toggled with CSS classes for smoother layout */}
      {src ? (
        <img
          className={`${styles["card-image__img"]} ${loaded ? styles["is-loaded"] : ""} ${failed ? styles["is-failed"] : ""}`}
          src={src}
          alt={alt || ""}
          draggable={false}
        />
      ) : null}
      {/* gradient remains as background of .card-image until .is-loaded is present */}
    </div>
  );
}

const ReferralPopup = memo(function ReferralPopup({
  show,
  onClose,
  referralData,
  loading,
  createCode,        // function to create code (parent)
  revokeCode,        // function to revoke (parent)
  saveBankAndCreate, // function (parent) -> accepts bankDetails object
  fetchFresh         // optional parent refresh function
}) {
  const [showBankForm, setShowBankForm] = useState(false);
  const [creatingCode, setCreatingCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bankForm, setBankForm] = useState({ type: 'upi', name: '', upiId: '', accountNumber: '', ifsc: '' });
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    setErrorMsg('');
    if (!referralData?.bank_details) {
      setShowBankForm(false);
    }
    const bd = referralData?.bank_details;
    if (bd) {
      setBankForm({
        type: bd.type || "upi",
        name: bd.name || "",
        upiId: bd.upiId || "",
        accountNumber: bd.accountNumber || "",
        ifsc: bd.ifsc || ""
      });
    }
    setTimeout(() => { firstInputRef.current && firstInputRef.current.focus(); }, 80);
    // lock body scroll while popup open
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [show, referralData]);

  const handleGenerate = useCallback(async () => {
    setErrorMsg('');
    try {
      // if bank_details not present in referralData, show bank form instead
      if (!referralData?.bank_details) {
        setShowBankForm(true);
        setTimeout(() => firstInputRef.current && firstInputRef.current.focus(), 80);
        return;
      }
      setCreatingCode(true);
      await createCode();
      if (fetchFresh) await fetchFresh();
    } catch (e) {
      console.error(e);
      setErrorMsg('Unable to create code. Try again.');
    } finally {
      setCreatingCode(false);
    }
  }, [createCode, referralData, fetchFresh]);

  const handleSaveAndCreate = useCallback(async () => {
    setErrorMsg('');
    try {
      // basic validation
      if (bankForm.type === "upi" && !bankForm.upiId) {
        setErrorMsg("Enter UPI id.");
        return;
      }
      if (bankForm.type === "bank" && (!bankForm.accountNumber || !bankForm.ifsc || !bankForm.name)) {
        setErrorMsg("Fill account name, number and IFSC.");
        return;
      }
      // call parent to save; it will create code if requested
      await saveBankAndCreate(bankForm, true);
      if (fetchFresh) await fetchFresh();
      setShowBankForm(false);
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || "Failed to save details. Try again.");
    }
  }, [bankForm, saveBankAndCreate, fetchFresh]);

  if (!show) return null;

  const referral = referralData?.referral || null;
  const joined = referralData?.joined || [];
  const transactions = referralData?.transactions || [];

  return (
    <div className={styles["refer-overlay"]}>
      <div className={styles["refer-popup"]} role="dialog" aria-modal="true">
        <div className={styles["refer-header"]}>
          <h3>Refer & Earn</h3>
          <p className={styles["small-muted"]}>Invite friends — earn ₹100 (Pro) / ₹300 (Elite). Payout within 48 hours.</p>
        </div>

        <div className={styles["refer-body"]}>
          {loading ? (
            <div className={styles["refer-loading"]}>Loading…</div>
          ) : (
            <>
              {/* Refer & Earn quick rules (generated from rulebook) */}
              <div className={styles["refer-guidelines"]} aria-hidden={loading ? "true" : "false"}>
                <h4 className={styles["guidelines-title"]}>How Refer & Earn works</h4>

                <ol className={styles["guidelines-list"]}>
                  {referralRules.map((r, idx) => (
                    <li className={styles["guideline-item"]} key={r.id}>
                      <div className={styles["guideline-main"]}>
                        <strong>{r.title}</strong>
                        <span className={styles["guideline-short"]}>{r.short}</span>
                      </div>

                      {/* info icon: tooltip text pulled from rule details */}
                      <button
                        className={styles["info-btn"]}
                        type="button"
                        aria-label={`${r.title} details`}
                        data-tooltip={r.details}
                      >
                        i
                      </button>
                    </li>
                  ))}
                </ol>
              </div>

              <div className={styles["refer-section"]}>
                <label className={styles["label"]}>Your Referral Code</label>
                {referral && referral.code ? (
                  <div className={styles["code-row"]}>
                    <div className={styles["code-box"]}>{referral.code}</div>
                    <div className={styles["code-meta"]}>
                      <small>Expires: {referral.expiresAt ? new Date(referral.expiresAt).toLocaleString() : referral.expiresAtStr}</small>
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button className={styles["btn-secondary"]} 
                          onClick={() => {
                            setShowBankForm(true);
                            setTimeout(() => firstInputRef.current?.focus(), 80);
                          }}>
                          Change Account Details
                        </button>

                        <button className={styles["btn-danger"]} onClick={revokeCode}>Revoke</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button className={styles["btn-primary"]} onClick={handleGenerate} disabled={creatingCode}>
                      {creatingCode ? "Creating…" : "Generate Code (48h)"}
                    </button>
                    <button className={styles["btn-secondary"]} onClick={onClose}>Close</button>
                  </div>
                )}
                {errorMsg && <div className={styles["error"]}>{errorMsg}</div>}
              </div>

              {showBankForm && (
                <div className={styles["refer-section"]}>
                  <label className={styles["label"]}>Payout Details</label>

                  <div className={styles["form-row"]}>
                    <select
                      value={bankForm.type}
                      onChange={(e) => setBankForm((p) => ({ ...p, type: e.target.value }))}
                      className={styles["input"]}
                    >
                      <option value="upi">UPI</option>
                      <option value="bank">Bank Account</option>
                    </select>
                  </div>

                  {bankForm.type === "upi" ? (
                    <>
                      <input
                        ref={firstInputRef}
                        className={styles["input"]}
                        placeholder="UPI ID (example@bank)"
                        value={bankForm.upiId}
                        onChange={(e) => setBankForm((p) => ({ ...p, upiId: e.target.value }))}
                        maxLength={64}
                        autoComplete="off"
                        inputMode="text"
                        spellCheck="false"
                      />
                      <input
                        className={styles["input"]}
                        placeholder="Account holder name"
                        value={bankForm.name}
                        onChange={(e) => setBankForm((p) => ({ ...p, name: e.target.value }))}
                        maxLength={80}
                        autoComplete="name"
                      />
                    </>
                  ) : (
                    <>
                      <input
                        ref={firstInputRef}
                        className={styles["input"]}
                        placeholder="Account holder name"
                        value={bankForm.name}
                        onChange={(e) => setBankForm((p) => ({ ...p, name: e.target.value }))}
                        maxLength={80}
                        autoComplete="name"
                      />
                      <input
                        className={styles["input"]}
                        placeholder="Account number"
                        value={bankForm.accountNumber}
                        onChange={(e) => setBankForm((p) => ({ ...p, accountNumber: e.target.value }))}
                        maxLength={30}
                        inputMode="numeric"
                        autoComplete="off"
                      />
                      <input
                        className={styles["input"]}
                        placeholder="IFSC code (e.g. HDFC0001234)"
                        value={bankForm.ifsc}
                        onChange={(e) => setBankForm((p) => ({ ...p, ifsc: e.target.value.toUpperCase() }))}
                        maxLength={11}
                        autoComplete="off"
                      />
                    </>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className={styles["btn-primary"]} onClick={handleSaveAndCreate}>Save & Generate</button>
                    <button className={styles["btn-secondary"]} onClick={() => setShowBankForm(false)}>Cancel</button>
                  </div>
                  {errorMsg && <div className={styles["error"]}>{errorMsg}</div>}
                </div>
              )}

              <div className={styles["refer-section"]}>
                <label className={styles["label"]}>People joined with your code</label>
                {(!referralData || !referralData.joined || referralData.joined.length === 0) ? (
                  <p className={styles["small-muted"]}>No one has joined via your code yet.</p>
                ) : (
                  <ul className={styles["joined-list"]}>
                    {referralData.joined.map((j, idx) => (
                      <li key={j.uid || idx}><strong>{j.userName || j.uid}</strong> <small className={styles["small-muted"]}> — {j.when}</small></li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={styles["refer-section"]}>
                <label className={styles["label"]}>Transaction History</label>
                {(!referralData || !referralData.transactions || referralData.transactions.length === 0) ? (
                  <p className={styles["small-muted"]}>No payouts yet.</p>
                ) : (
                  <table className={styles["tx-table"]}>
                    <thead><tr><th>Date</th><th>Amount</th><th>Reason</th></tr></thead>
                    <tbody>
                      {referralData.transactions.map(tx => (
                        <tr key={tx.txid}>
                          <td>{new Date(tx.whenMs || tx.when).toLocaleString()}</td>
                          <td>₹{tx.amount}</td>
                          <td>{tx.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>

        <button className={styles["refer-close"]} onClick={onClose} aria-label="Close referral popup">✕</button>
      </div>
    </div>
  );
});

export async function syncDailyFields(userId, updates, setDailyData) {
  await updateDailyDataFields(userId, updates);
  await setDailyData(prev => ({ ...prev, ...updates }));
}

export default function ActivityPage() {
  // const [activeTab, setActiveTab] = useState('activity');
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState('');
  const [userId, setUserId] = useState('');
  const [userData, setUserData] = useState({
      Name: null,
      UserName: '',
      Gender: '',
      Religion: '',
      Goal: '',
      UserType: '',
      Hobby: '',
      streakNF: 0,
      streakNFB: 0,
      streakNFCM: 0,
      streakDT: 0,
      streakDTB: 0,
      streakDTCM: 0
  });
  const [showFapPopup, setShowFapPopup] = useState(false);
  const [showCustomPopup, setShowCustomPopup] = useState(false); // New popup state
  const [popupTimeTag, setPopupTimeTag] = useState('');
  const [checklist, setChecklist] = useState({});
  const [dailyData, setDailyData] = useState({});
  const [todayVerse, setTodayVerse] = useState(null);
  const [emergencyMotivation, setEmergencyMotivation] = useState(null);
  const [showCongratsPopup, setShowCongratsPopup] = useState(false);
  const [loadingEmergency, setLoadingEmergency] = useState(false);
  const [showReferPopup, setShowReferPopup] = useState(false);
  const [loadingRefer, setLoadingRefer] = useState(false);
  const [referralData, setReferralData] = useState(null); // { referral, joined, transactions, bank_details }

  useEffect(() => {
    async function init() {
      try {
        // Fetch current month
        const date = new Date();
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const currMon = `${monthNames[date.getMonth()]}${date.getFullYear()}`;
        setCurrentMonth(currMon);

        // Get userId from localStorage
        const storedUserId = localStorage.getItem("userId");
        if (!storedUserId) {
          navigate("/");
          return;
        }
        setUserId(storedUserId);

        // Fetch user data from Firebase
        const userRef = ref(db, `users/${storedUserId}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) return;

        const data = snapshot.val();
        const formattedData = {
          Name: data.Name || '',
          UserName: data.UserName || '',
          Gender: data.Gender || '',
          Religion: data.Religion || '',
          Goal: data.Goal || '',
          UserType: data.UserType || 'Normal',
          Hobby: data.Hobby || '',
          streakNF: data.NoFapStreak.NFStreak || 0,
          streakNFB: data.NoFapStreak.BestStreak || 1,
          streakNFCM: data?.NoFapStreak?.MonthlyStreak?.[currMon] || 1,
          streakDT: data.DailyTaskStreak.DTStreak || 0,
          streakDTB: data.DailyTaskStreak.BestStreak || 0,
          streakDTCM: data?.DailyTaskStreak?.MonthlyStreak?.[currMon] || 0,
        };
        setUserData(formattedData);

        if (data.UserType === 'Normal') {
          navigate('/pricing');
          return;
        }

        // Initialize daily data only after user data ready
        const masterChecklist = await buildDailyChecklistForUser(storedUserId);
        const daily = await initDailyDataIfMissing(storedUserId, masterChecklist);
        setChecklist(daily.dailyChecklist || masterChecklist);
        setDailyData(daily);

        // Fetch today's verse
        const contentSnap = await get(ref(db, `content/religionalContent/${data.Religion}`));
        if (contentSnap.exists()) {
          const allVerses = contentSnap.val();
          const allVerseKeys = Object.keys(allVerses);
          const todayVerseKey = await handleDailyVerseLogic(storedUserId, allVerseKeys);
          setTodayVerse(allVerses[todayVerseKey]);
        }

        // Checking user subscription status
        if (data.UserType === 'Pro' || data.UserType === 'Elite') {
          const now = new Date();
          const expiryStr = daily.planExpiryDate;
          const expiryDate = new Date(expiryStr);

          if (now >= expiryDate) {
            const subscribe = window.confirm("Your subscription has expired. You have been downgraded to Normal plan. Would you like to renew your subscription?");
            if (subscribe) {
              const userTypeRef = ref(db, `users/${storedUserId}/UserType`);
              await set(userTypeRef, 'Normal');
              navigate('/pricing');
            } else {
              const userTypeRef = ref(db, `users/${storedUserId}/UserType`);
              await set(userTypeRef, 'Free');
              setUserData(prev => ({ ...prev, UserType: 'Free' }));
            }
          }
        }

        if (data.UserType === 'Free') {
          const now = new Date();
          const expiryStr = daily.planExpiryDate;
          const expiryDate = new Date(expiryStr);

          if (now >= expiryDate) {
            const expirydateRef = ref(db, `users/${storedUserId}/dailyData/planExpiryDate`);
            const snapshot = await get(expirydateRef);

            if (snapshot.exists()) {
              let expirydate = new Date(snapshot.val());
              expirydate.setDate(expirydate.getDate() + 30);
              const newExpiry = expirydate.toDateString();
              await set(expirydateRef, newExpiry);
            }
          }
        }

      } catch (e) {
        console.error("❌ Initialization failed:", e);
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (!userData.Name || dailyData.fapLastAskedDate === undefined) return;

    if (dailyData.fapLastAskedDate === "" || dailyData.fapLastAskedDate === null) {
      setPopupTimeTag('morning');
      setShowFapPopup(true);
      return;
    }

    if (shouldAskFapQuestion()) {
      setShowFapPopup(true);
    }
  }, [userData.Name, dailyData.fapLastAskedDate]);

  useEffect(() => {
    if (userData.Name && dailyData.fapLastAskedDate) {
      checkDailyNFStreak();
    }
    if (userData.Name && dailyData.lastDTUpdateDate) {
      checkDailyDTStreak();
    }
  }, [userData.Name, dailyData.fapLastAskedDate, dailyData.lastDTUpdateDate]);

  useEffect(() => {
    if (checklist === undefined || dailyData.lastDTUpdateDate === undefined) return;
    const allComplete = Object.values(checklist).every(valueArray => valueArray[0] === true);

    const today = new Date().toDateString();
    const lastUpdate = dailyData.lastDTUpdateDate;

    if (allComplete && lastUpdate !== today) {
      updateDTStreak(false);
    }
  }, [checklist, dailyData.lastDTUpdateDate]);

  const shouldAskFapQuestion = () => {
    if (userData.streakNF === 0) return false;
    const now = new Date();
    const hour = now.getHours();
    const today = new Date().toDateString();

    const lastAskedDate = dailyData.fapLastAskedDate || null;
    const lastAskedTimeTag = dailyData.fapLastAskedTimeTag || null;

    if (lastAskedDate !== today && hour < 18) {
      setPopupTimeTag('morning');
      return true;
    }
    if (hour >= 18 && hour < 22 && !(lastAskedDate === today && lastAskedTimeTag === 'evening')) {
      setPopupTimeTag('evening');
      return true;
    }
    if (hour >= 22 && !(lastAskedDate === today && lastAskedTimeTag === 'night')) {
      setPopupTimeTag('night');
      return true;
    }
    return false;
  };

  const handleFapResponse = async (didFap) => {
    const today = new Date().toDateString();

    if (didFap) {
      updateNFStreak(true);
    }

    await syncDailyFields(userId, {
      fapLastAskedDate: today,
      fapLastAskedTimeTag: popupTimeTag
    }, setDailyData);

    setShowFapPopup(false);
  };

  const handleOpenCustomPopup = async () => {
    setShowCustomPopup(true);
    setLoadingEmergency(true);

    try {
      const motivation = await generateEmergencyMotivation(
        userData.Goal,
        userData.streakNF,
        userData.Hobby,
        checklist
      );
      setEmergencyMotivation(motivation);
    } catch (error) {
      console.error("Error generating emergency content:", error);
      setEmergencyMotivation({
        line1: "You are stronger than this moment.",
        line2: "This urge will pass in 30 minutes.",
        tasks: [
          { title: "Write down one next-step toward goal (15 minutes)", estimate_minutes: 15 },
          { title: "Short breathing meditation (10 minutes)", estimate_minutes: 10 },
          { title: userData.Hobby ? `${userData.Hobby} now (5+ minutes)` : "Go for a walk (5+ minutes)", estimate_minutes: 5 }
        ],
        total_minutes: 30
      });
    } finally {
      setLoadingEmergency(false);
    }
  };

  const handleCloseCustomPopup = (fapped) => {
    if (fapped) {
      updateNFStreak(true);
    }
    setShowCustomPopup(false);
  };

  const toggleChecklist = async (itemKey) => {
    const currentItem = checklist[itemKey];
    const newChecked = !currentItem[0];
    const newChecklist = { ...checklist, [itemKey]: [newChecked, currentItem[1]] };
    
    setChecklist(newChecklist); // instant UI update
    await toggleChecklistItem(userId, itemKey, newChecked, currentItem[1]);
    await syncDailyFields(userId, {
      dailyChecklist: newChecklist,
      lastChecklistUpdateDate: new Date().toDateString()
    }, setDailyData);
  };

  const checkDailyNFStreak = async () => {
    if (!userId) return;

    const today = new Date().toDateString();
    const lastUpdate = dailyData.lastNFUpdateDate;

    if (lastUpdate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    if (lastUpdate === yesterdayString) {
      updateNFStreak(false);
    }
    else if (!lastUpdate || lastUpdate === "" || lastUpdate === undefined || lastUpdate === null) {
      await syncDailyFields(userId, { lastNFUpdateDate: today }, setDailyData);
    } 
    else {
      updateNFStreak(true);
    }
  };

  const checkDailyDTStreak = async () => {
    if (!userId) return; 
    const today = new Date().toDateString();
    const lastUpdate = dailyData.lastDTUpdateDate;

    if (lastUpdate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    if (lastUpdate && lastUpdate !== yesterdayString && lastUpdate !== today) {
      updateDTStreak(true);
    }
  };

  const updateNFStreak = async (reset = false) => {
    try {
      const streakRef = ref(db, `users/${userId}/NoFapStreak/NFStreak`);
      const bestRef = ref(db, `users/${userId}/NoFapStreak/BestStreak`);
      const monthRef = ref(db, `users/${userId}/NoFapStreak/MonthlyStreak/${currentMonth}`);

      const newStreak = reset ? 0 : userData.streakNF + 1;
      let newBest = userData.streakNFB;

      let newMonthly = reset ? userData.streakNFCM : userData.streakNFCM + 1;

      if (!reset && newStreak > userData.streakNFB) {
        newBest = newStreak;
        set(bestRef, newBest);
      }
      set(monthRef, newMonthly);
      set(streakRef, newStreak);

      setUserData(prevData => ({
        ...prevData,
        streakNF: newStreak,
        streakNFB: newBest,
        streakNFCM: newMonthly
      }));
      await syncDailyFields(userId, { lastNFUpdateDate: new Date().toDateString() }, setDailyData);
    } catch (e) {
      console.error("Failed Updating No Fap Streak!", e);
    }
  };

  const updateDTStreak = async (reset = false) => {
    try {
      const streakRef = ref(db, `users/${userId}/DailyTaskStreak/DTStreak`);
      const bestRef = ref(db, `users/${userId}/DailyTaskStreak/BestStreak`);
      const monthRef = ref(db, `users/${userId}/DailyTaskStreak/MonthlyStreak/${currentMonth}`);
      let newMonthly = reset ? userData.streakDTCM : userData.streakDTCM + 1;

      const newStreak = reset ? 0 : userData.streakDT + 1;
      let newBest = userData.streakDTB;

      if (!reset && newStreak > userData.streakDTB) {
        newBest = newStreak;
        set(bestRef, newBest);
      }
      set(monthRef, newMonthly);
      set(streakRef, newStreak);

      setUserData(prevData => ({
        ...prevData,
        streakDT: newStreak,
        streakDTB: newBest,
        streakDTCM: newMonthly
      }));

      if (!reset) {
        await syncDailyFields(userId, { lastDTUpdateDate: new Date().toDateString() }, setDailyData);
      }
    } catch (e) {
      console.error("Failed Updating Daily Task Streak!", e);
    }
  };

  // Open refer popup & load data
  const handleOpenReferEarnPopup = async () => {
    setShowReferPopup(true);
    setLoadingRefer(true);
    try {
      const data = await fetchReferralInfo(userId);
      setReferralData(data);
    } catch (e) {
      console.error("Failed to fetch referral info", e);
      setReferralData(null);
    } finally {
      setLoadingRefer(false);
    }
  };

  // generate referral code (asks for bank details first if missing)
  const handleGenerateCode = async () => {
    try {
      // if bank details are missing, do nothing here - popup will show the form
      if (!referralData || !referralData.bank_details) {
        return;
      }

      // create the referral code and refresh the referralData
      await createReferralCode(userId);
      const data = await fetchReferralInfo(userId);
      setReferralData(data);
    } catch (e) {
      console.error("Failed to create code", e);
      // optionally: set a parent-level error state if you want to show a global message
    }
  };

  // Save bank details and then create code if requested
  const handleSaveBankAndCreateCode = async (bankDetails = {}, createAfter = true) => {
    try {
      if (bankDetails.type === 'upi' && !bankDetails.upiId) {
        throw new Error('Please enter your UPI id.');
      }
      if (bankDetails.type === 'bank' && (!bankDetails.accountNumber || !bankDetails.ifsc || !bankDetails.name)) {
        throw new Error('Please fill bank name, account number and IFSC.');
      }

      await saveBankDetails(userId, bankDetails);
      const data = await fetchReferralInfo(userId);
      setReferralData(data);

      if (createAfter) {
        await handleGenerateCode(); // will only create if bank_details now present
      }
    } catch (e) {
      console.error("Failed saving bank details", e);
      throw e; // let popup show the error message
    }
  };

  const handleRevokeCode = async () => {
    try {
      const res = await revokeReferralCode(userId);

      setReferralData(prev => ({ ...(prev || {}), referral: null }));
      
      const data = await fetchReferralInfo(userId);
      setReferralData(data);
    } catch (e) {
      console.error("Failed to revoke referral code:", e);
    }
  };

  // show the persisted daily quote from user's dailyData
  const [persistedDailyQuote, setPersistedDailyQuote] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPersistedDailyQuote() {
      try {
        const uid = localStorage.getItem('userId'); // same pattern used elsewhere
        if (!uid) {
          // fallback: use localStorage (if MoreContentPage stored it)
          const local = localStorage.getItem('dailyQuote');
          if (!cancelled) setPersistedDailyQuote(local || null);
          return;
        }

        const dRef = ref(db, `users/${uid}/dailyData/lastMotivationSelection`);
        const snap = await get(dRef);
        if (!cancelled) {
          if (snap && snap.exists()) {
            const sel = snap.val();
            const q = sel && sel.quote && sel.quote.actual_content ? sel.quote.actual_content : null;
            if (q) setPersistedDailyQuote(q);
            else {
              // fallback to localStorage if present
              const local = localStorage.getItem('dailyQuote');
              setPersistedDailyQuote(local || null);
            }
          } else {
            // no DB entry -> fallback
            const local = localStorage.getItem('dailyQuote');
            setPersistedDailyQuote(local || null);
          }
        }
      } catch (err) {
        console.warn('Failed to read daily selection from DB', err);
        if (!cancelled) {
          const local = localStorage.getItem('dailyQuote');
          setPersistedDailyQuote(local || null);
        }
      }
    }

    loadPersistedDailyQuote();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className={styles["activity-page"]}>
      <Navbar
        pageName="Activity"
        Icon={Flame}
        buttons={[
          { label: "Refer & Earn", variant: "secondary", action: handleOpenReferEarnPopup },
          { label: "Resist the Urge", variant: "emergency", action: handleOpenCustomPopup },
          { label: "Chat Room", variant: "secondary", route: "/chatroom" },
          { label: "Ranking", variant: "secondary", route: "/leaderboard" },
          { label: "My Page", variant: "secondary", route: "/mypage" },
          { label: "Activity", variant: "primary", route: "/activity" },
        ]}
      />

      <div className={styles["body"]}>
        {/* Daily Question */}
        <div 
        className={styles["daily-question-card"]}
        onClick={() => navigate('/content')}
        >
          <h3 className={styles["daily-question-header"]}>Daily Question</h3>
          {todayVerse ? (
            <p className={styles["daily-question-text"]}>
              {todayVerse.question || todayVerse.actual_content || "Today's verse loaded!"}
            </p>
          ) : (
            <p className={styles["daily-question-text"]}>Loading today's question...</p>
          )}
        </div>

        {/* Stats Section */}
        <div className={styles["stats-section"]}>
          {/* Tab Streak */}
          <div className={styles["stat-card"]}>
            <h3>Tab Streak</h3>
            <div className={styles["streak-content"]}>
              <div className={styles["streak-item"]}>
                <div className={styles["streak-name"]}>
                  <NoSign style={{width : 16 , height: 16}}></NoSign>
                  <p className={styles["no-streak"]}>No Fap Streak</p>
                </div>
                <div className={styles["days"]}>
                  <div className={styles["day-name"]}>
                    <Flame style={{width : 18 , height: 18}}></Flame>
                    <span className={styles["day-count"]}>{userData.streakNF} Days</span>
                  </div>
                  <div className={styles["day-info"]}>
                    <span className={styles["small"]}>Best: {userData.streakNFB}</span>
                    <span className={styles["small"]}>This month: {userData.streakNFCM}</span>
                  </div>
                </div>
              </div>
              <div className={styles["streak-item"]}>
                <div className={styles["streak-name"]}>
                  <Sun style={{width : 16 , height: 16}}></Sun>
                  <p className={styles["no-streak"]}>Daily Streak</p>
                </div>
                <div className={styles["days"]}>
                  <div className={styles["day-name"]}>
                    <Flame style={{width : 18 , height: 18}}></Flame>
                    <span className={styles["day-count"]}>{userData.streakDT} Days</span>
                  </div>
                  <div className={styles["day-info"]}>
                    <span className={styles["small"]}>Best: {userData.streakDTB}</span>
                    <span className={styles["small"]}>This month: {userData.streakDTCM}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className={styles["stat-card"]}>
            <h3>Checklist</h3>
            <div className={styles["checklist-items"]}>
              {Object.entries(checklist).map(([key, value]) => {
              const isChecked = value[0];
              const labelText = value[1];

                return (
                  <label className={styles["checkbox-item"]} key={key}>
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => toggleChecklist(key)}
                    />
                    <span>{labelText}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className={styles["content-section"]}>
          <h2>Content</h2>
          <div className={styles["content-grid"]}>
            {/* General Content */}
            <div className={styles["content-card"]}>
              <CardImage src={ImgGeneralContent} alt="General content" />
              <h4>General Content</h4>
              <p>Articles, tips, lessons</p>
              <button className={styles["explore-btn"]} onClick={() => navigate('/more-content', { state: { variant: 'default' } })}>Browse</button>
            </div>

            {/* Pro Content */}
            <div className={styles["content-card"]}>
              <CardImage src={ImgProContent} alt="Pro content" />
              <h4>Pro Content</h4>
              <p>Personalized routines, live videos</p>
              <button className={styles["explore-btn"]} onClick={() => navigate('/routine')}>Explore</button>
            </div>

            {/* Elite Content */}
            <div className={styles["content-card"]}>
              <CardImage src={ImgEliteContent} alt="Elite content" />
              <h4>Elite Content</h4>
              <p>Personal calls, Creator videos</p>
              <button className={styles["explore-btn"]} onClick={() => navigate('/more-content', { state: { variant: 'elite' } })}>Explore</button>
            </div>

            {/* Daily Quote */}
            <div className={styles["content-card"]}>
              <CardImage src={ImgDailyQuotes} alt="Daily quotes" />
              <h4>Daily Quote</h4>
              <p>
                oh ! have a look : {" "}
              </p>
              <p>
                {persistedDailyQuote ? (
                  <span className={styles["activity-quote"]}>"{persistedDailyQuote}"</span>
                ) : (
                  <span className={styles["activity-quote-fallback"]}>"No quote for today"</span>
                )}
              </p>
              <button className={styles["explore-btn"]} onClick={() => navigate('/more-content', { state: { variant: 'pro' } })}>More Quotes</button>
            </div>
          </div>
        </div>
      </div>

      {/* Fap Popup */}
      {showFapPopup && (
        <div className={styles["popup-overlay"]}>
          <div className={styles["popup-box"]}>
            <h3>Have you fapped today?</h3>
            <div className={styles["popup-buttons"]}>
              <button className={styles["yes-btn"]} onClick={() => handleFapResponse(true)}>Yes</button>
              <button className={styles["no-btn"]} onClick={() => handleFapResponse(false)}>No</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Popup triggered from Navbar */}
      {showCustomPopup && (
        <div className={styles["emergency-overlay"]}>
          <div className={styles["emergency-popup"]}>
            {loadingEmergency ? (
              <div className={styles["emergency-loading"]}>
                <div className={styles["emergency-loading-spinner"]}></div>
                <p className={styles["emergency-loading-text"]}>Preparing your support...</p>
              </div>
            ) : (
              <>
                {/* Warning Banner */}
                <div className={styles["emergency-banner"]}>
                  <span className={styles["emergency-banner-icon"]}>⚠️</span>
                  <h2 className={styles["emergency-banner-text"]}>Stop Right Now</h2>
                </div>

                {/* Content */}
                <div className={styles["emergency-content"]}>
                  {/* Do not see, touch.. */}
                  {userData.streakNF>=0 && (
                    <div className={styles["emergency-streak"]}>
                      <p className={styles["emergency-streak-text"]}>Avoid anything that triggers the urge :</p>
                      <p className={styles["emergency-streak-text"]}>Don't Watch, Don't Listen, Don't Imagine and Don't Touch</p>
                      {/* Streak Display */}
                      {userData.streakNF > 0 && (
                        <div className={styles["emergency-streak-warning"]}>
                          <span className={styles["emergency-streak-icon"]}>🔥</span>
                          <p className={styles["emergency-streak-text"]}>
                            {userData.streakNF} Day Streak at Risk!
                          </p>
                        </div>
                      )}
                    </div>

                  )}

                  {/* Goal Section */}
                  <div className={styles["emergency-goal"]}>
                    <div className={styles["emergency-goal-content"]}>
                      <span className={styles["emergency-goal-label"]}>Your Goal</span>
                      <h3 className={styles["emergency-goal-text"]}>
                        {userData.Goal || "Become the best version of yourself"}
                      </h3>
                    </div>
                  </div>

                  {/* Motivation */}
                  {emergencyMotivation && (
                    <div className={styles["emergency-motivation"]}>
                      <p className={styles["emergency-motivation-line"]}>
                        <span className={styles["emergency-motivation-highlight"]}>
                          {emergencyMotivation.line1}
                        </span>
                      </p>
                      <p className={styles["emergency-motivation-line"]}>
                        {emergencyMotivation.line2}
                      </p>
                    </div>
                  )}

                  {/* Action Task */}
                  {emergencyMotivation && (
                    <div className={styles["emergency-action-card"]}>
                      <span className={styles["emergency-action-label"]}>
                        Do These Right Now
                      </span>

                      {/* Show the three tasks */}
                      <div className={styles["emergency-tasks-list"]}>
                        {emergencyMotivation.tasks && emergencyMotivation.tasks.map((t, idx) => (
                          <div key={idx} className={styles["emergency-task-item"]}>
                            <strong>{idx + 1}.</strong> <span>{t.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className={styles["emergency-buttons"]}>
                    <button 
                      className={styles["emergency-btn-primary"]} 
                      onClick={() => setShowCongratsPopup(true)}
                    >
                      <span>💪</span>
                      Become 1% of Men
                    </button>
                    <button 
                      className={styles["emergency-btn-secondary"]} 
                      onClick={() => handleCloseCustomPopup(true)}
                    >
                      <span>😞</span>
                      I have Fapped!
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Congratulatory popup shown after clicking Become 1% of Men */}
          {showCongratsPopup && (
            <div className={styles["popup-overlay"]}>
              <div className={styles["popup-box"]}>
                <h3>🎉 Congratulations!</h3>
                <p>You're sticking to your goal — well done.</p>
                <div className={styles["popup-buttons"]}>
                  <button
                    className={styles["yes-btn"]}
                    onClick={() => {
                      setShowCongratsPopup(false);
                      setShowCustomPopup(false);
                    }}
                  >
                    Okay!
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Refer & Earn Popup */}
      <ReferralPopup
        show={showReferPopup}
        onClose={() => setShowReferPopup(false)}
        referralData={referralData}
        loading={loadingRefer}
        createCode={async () => {
          try {
            await createReferralCode(userId);
            const data = await fetchReferralInfo(userId);
            setReferralData(data);
          } catch (e) {
            console.error(e);
            throw e;
          }
        }}
        saveBankAndCreate={handleSaveBankAndCreateCode}
        revokeCode={handleRevokeCode}
        fetchFresh={async () => {
          const d = await fetchReferralInfo(userId);
          setReferralData(d);
        }}
      />
    </div>
  );
}