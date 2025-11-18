import { ref, set, get, push, update, remove } from "firebase/database";
import { db } from "../firebase";

// Simple rulebook for the Refer & Earn popup.
// Edit this file to change rules shown in the UI.

const referralRules = [
  {
    id: "eligibility",
    title: "Eligibility",
    short: "Only eligible subscription users can earn",
    details:
      "Only Pro and Elite subscription users can earn money through Refer & Earn. " +
      "If your subscription expires later, you still receive rewards for referrals made during your active subscription period."
  },
  {
    id: "code",
    title: "Referral Code",
    short: "Code lasts 48 hours",
    details:
      "Generate a referral code from this popup. The code is valid for 48 hours. " +
      "After expiry you can generate a new code. You can also revoke a code anytime."
  },
  {
    id: "earnings",
    title: "What You Earn",
    short: "Rewards on successful purchases",
    details:
      "You earn ₹100 when a referred user purchases Pro, and ₹300 when they purchase Elite (only after they purchase)."
  },
  {
    id: "payment",
    title: "Payment",
    short: "Payout to your bank/UPI",
    details:
      "Earnings are paid directly to your bank account or UPI within 48 hours after the referred user's successful purchase."
  },
  {
    id: "payoutDetails",
    title: "Payout Details",
    short: "Enter UPI / Bank before generating",
    details:
      "You must add your UPI ID or bank account details before generating your first code. You can update them anytime using Change Account Details."
  },
  {
    id: "tracking",
    title: "Tracking",
    short: "See who joined and payouts",
    details:
      "This popup shows people who joined using your code and a transaction history of payouts (if any)."
  },
  {
    id: "important",
    title: "Important Notes",
    short: "Revoking deletes a code",
    details:
      "Revoking a code permanently deletes it. Referrals after a code's expiry or after revocation do not count. " +
      "Only purchases made after joining with your code qualify."
  }
];

export default referralRules;

/**
 * Helpers for Refer & Earn feature.
 * - createReferralCode: creates a code valid for 48 hours and registers it under content/referrals/{code} and users/{uid}/referral
 * - fetchReferralInfo: reads user's referral info (code, expiry) and lists of joined users & transactions
 * - saveBankDetails: stores bank_details object under users/{uid}/bank_details
 * - fetchTransactions: reads users/{uid}/transactions (returns array)
 */

function makeCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function createReferralCode(userId) {
  if (!userId) throw new Error("Missing userId");

  const now = Date.now();
  const expiresAt = now + 48 * 60 * 60 * 1000;
  const code = makeCode(6);

  const userReferralRef = ref(db, `users/${userId}/referral`);
  const globalRefRef = ref(db, `content/referrals/${code}`);
  const payloadUser = {
    code,
    createdAt: new Date(now).toString(),
    createdAtMs: now,
    expiresAt,
    expiresAtStr: new Date(expiresAt).toString(),
    active: true
  };

  const payloadGlobal = {
    code,
    creator: userId,
    createdAt: new Date(now).toString(),
    createdAtMs: now,
    expiresAt,
    expiresAtStr: new Date(expiresAt).toString(),
    joined: {}
  };

  await set(userReferralRef, payloadUser);
  await set(globalRefRef, payloadGlobal);

  return payloadUser;
}

export async function revokeReferralCode(userId) {
  if (!userId) throw new Error("Missing userId");

  const userReferralRef = ref(db, `users/${userId}/referral`);
  const userSnap = await get(userReferralRef);
  if (!userSnap.exists()) {
    return { removed: false, reason: "no_referral" };
  }

  const userReferral = userSnap.val();
  const code = userReferral.code;

  try {
    if (code) {
      await remove(ref(db, `content/referrals/${code}`));
    }

    await remove(userReferralRef);

    return { removed: true, codeRemoved: !!code };
  } catch (e) {
    console.error("revokeReferralCode failed:", e);
    throw e;
  }
}

/**
 * Fetch referral info for a given user:
 * - user's referral object (users/{uid}/referral)
 * - joined list for the code (content/referrals/{code}/joined)
 * - user's transaction list (users/{uid}/transactions)
 */
export async function fetchReferralInfo(userId) {
  if (!userId) throw new Error("Missing userId");
  const userRef = ref(db, `users/${userId}`);
  const userSnap = await get(userRef);
  const userVal = userSnap && userSnap.exists() ? userSnap.val() : {};

  const referral = userVal.referral || null;
  
  // Keep joined as an object (not array)
  let joined = {};
  
  // First try to get joined from the user's own node (your current structure)
  if (userVal.joined && typeof userVal.joined === 'object') {
    const j = userVal.joined;
    // Ensure joined is a clean object with only uid -> name mappings
    Object.entries(j).forEach(([uid, value]) => {
      if (typeof value === 'string') {
        joined[uid] = value;
      } else if (value && typeof value === 'object' && value.name) {
        // If stored as {name: "Name"}, extract just the name
        joined[uid] = value.name;
      }
    });
  }
  // Fallback: try to get from content/referrals if code exists
  else if (referral && referral.code) {
    const joinedSnap = await get(ref(db, `content/referrals/${referral.code}/joined`));
    if (joinedSnap && joinedSnap.exists()) {
      const j = joinedSnap.val();
      if (j && typeof j === 'object') {
        Object.entries(j).forEach(([uid, value]) => {
          if (typeof value === 'string') {
            joined[uid] = value;
          } else if (value && typeof value === 'object' && value.name) {
            joined[uid] = value.name;
          }
        });
      }
    }
  }

  const txSnap = await get(ref(db, `users/${userId}/transactions`));
  let transactions = [];
  if (txSnap && txSnap.exists()) {
    const t = txSnap.val();
    transactions = Object.entries(t).map(([txid, tx]) => ({ txid, ...tx }));
    transactions.sort((a, b) => (b.whenMs || 0) - (a.whenMs || 0));
  }

  const bank_details = (userVal.bank_details) ? userVal.bank_details : null;

  return { 
    referral, 
    joined, // Now returns object instead of array
    transactions, 
    bank_details, 
    basicUser: { Name: userVal.Name, UserName: userVal.UserName } 
  };
}

/**
 * Save bank details object under users/{uid}/bank_details
 * bankDetails could be { type: 'bank'|'upi', name, accountNumber, ifsc, upiId }
 */
export async function saveBankDetails(userId, bankDetails) {
  if (!userId) throw new Error("Missing userId");
  await set(ref(db, `users/${userId}/bank_details`), bankDetails);
  return true;
}

/**
 * A helper to append a transaction record for the user when they earn money.
 * This is a small demo helper and should be adapted when real payment flows are integrated.
 * tx = { amount: number, reason: string, whenMs: Date.now(), meta: {} }
 */
export async function appendTransaction(userId, tx) {
  if (!userId) throw new Error("Missing userId");
  const txRef = push(ref(db, `users/${userId}/transactions`));
  const txPayload = {
    ...tx,
    when: new Date(tx.whenMs || Date.now()).toString(),
    whenMs: tx.whenMs || Date.now()
  };
  await set(txRef, txPayload);
  return { txid: txRef.key, ...txPayload };
}

/**
 * Utility to check if a referral code is still valid (global).
 */
export async function isReferralCodeValid(code) {
  if (!code) return false;
  const snap = await get(ref(db, `content/referrals/${code}`));
  if (!snap.exists()) return false;
  const val = snap.val();
  if (val.active === false) return false;
  return (val.expiresAt && Date.now() < val.expiresAt);
}