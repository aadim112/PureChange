// Load environment variables from .env when present
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

// Initialize Firebase Admin SDK
let admin;
let db;
try {
  admin = require('firebase-admin');
  
  // Initialize Firebase Admin if not already initialized
  if (!admin.apps.length) {
    let credential;
    
    // Priority 1: Environment variable (for Vercel/production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
      console.log('✅ Using Firebase credentials from environment variable');
    }
    // Priority 2: Local file (for development)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
      credential = admin.credential.cert(serviceAccount);
      console.log('✅ Using Firebase credentials from file path');
    }
    // Priority 3: Default file location (for convenience)
    else {
      try {
        const serviceAccount = require(path.resolve(__dirname, '../firebase-service-account.json'));
        credential = admin.credential.cert(serviceAccount);
        console.log('✅ Using Firebase credentials from default location');
      } catch (e) {
        console.warn('⚠️  No Firebase credentials found. Trying default credentials...');
      }
    }
    
    if (credential) {
      admin.initializeApp({
        credential: credential,
        databaseURL: process.env.FIREBASE_DATABASE_URL || process.env.REACT_APP_FIREBASE_DATABASE_URL
      });
    } else {
      // Fallback for Application Default Credentials
      admin.initializeApp({
        databaseURL: process.env.FIREBASE_DATABASE_URL || process.env.REACT_APP_FIREBASE_DATABASE_URL
      });
    }
  }
  
  db = admin.database();
  console.log('✅ Firebase Admin initialized successfully');
} catch (e) {
  console.warn('⚠️  firebase-admin not installed or initialization failed');
  console.warn('   Install it with: npm install firebase-admin');
  console.warn('   Referral payout logging will be disabled.');
  console.warn('   Error:', e.message);
}

const app = express();

// Configure CORS
const allowedOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.FRONTEND_URL || '*')
  : 'http://localhost:3000';

app.use(cors({
  origin: allowedOrigin,
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
}));

app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  console.log('Health check called');
  res.status(200).json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      hasRazorpayKey: !!process.env.RAZORPAY_KEY_ID,
      hasRazorpaySecret: !!process.env.RAZORPAY_SECRET,
      hasFirebaseAdmin: !!db,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

// Create order endpoint
app.post("/api/create-order", async (req, res) => {
  try {
    console.log('Create order called');
    console.log('Request body:', req.body);

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
      console.error('Missing Razorpay credentials');
      return res.status(500).json({ 
        error: 'Razorpay credentials not configured',
        hasKey: !!process.env.RAZORPAY_KEY_ID,
        hasSecret: !!process.env.RAZORPAY_SECRET
      });
    }

    const Razorpay = require('razorpay');
    
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID, 
      key_secret: process.env.RAZORPAY_SECRET
    });

    const amount = req.body.amount;
    if (!amount || amount <= 0) {
      console.error('Invalid amount:', amount);
      return res.status(400).json({ 
        error: 'Invalid amount',
        received: amount
      });
    }

    const options = {
      amount: Math.round(amount * 100),
      currency: req.body.currency || "INR",
      receipt: `receipt_${Date.now()}`,
      notes: req.body.notes || {}
    };

    console.log('Creating Razorpay order:', options);
    const order = await razorpay.orders.create(options);
    console.log('Order created successfully:', order.id);
    
    return res.status(200).json(order);
  } catch (err) {
    console.error('Error in create-order:', err);
    return res.status(500).json({ 
      error: err.message,
      details: err.error?.description || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

app.post("/api/process-payment", async (req, res) => {
  try {
    const {
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      razorpay_signature: signature,
      amount,
      planName,
      userId,
      userName,
      refererCode,
      referalCut
    } = req.body || {};

    if (!paymentId || !orderId || !signature) {
      return res.status(400).json({ error: "Missing Razorpay payment details" });
    }

    if (!process.env.RAZORPAY_SECRET) {
      console.error("Missing Razorpay secret for signature validation");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (generatedSignature !== signature) {
      console.warn("Invalid Razorpay signature detected");
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Look up referrer data on backend if referer code exists
    let referrerData = null;
    if (refererCode && db) {
      try {
        const referralRef = db.ref(`content/referrals/${refererCode}`);
        const referralSnap = await referralRef.once('value');
        
        if (referralSnap.exists()) {
          const referralData = referralSnap.val();
          // The creator/refererId is stored in the 'creator' field
          const refererId = referralData.creator;
          
          if (!refererId) {
            console.warn("Referral code found but no creator ID:", refererCode);
          } else {
            const referrerProfileRef = db.ref(`users/${refererId}`);
            const profileSnap = await referrerProfileRef.once('value');
            
            if (profileSnap.exists()) {
              const profileData = profileSnap.val();
              referrerData = {
                refererId,
                code: refererCode,
                bankDetails: profileData.bank_details || profileData.bank_detail || null,
                refererName: profileData.Name || profileData.UserName || '',
                refererContact: profileData.PhoneNumber || '',
                referalCut: referalCut ?? profileData.referalCut ?? 0
              };
              console.log('✅ Referrer data fetched:', {
                refererId,
                refererName: referrerData.refererName,
                hasBankDetails: !!referrerData.bankDetails
              });
            } else {
              console.warn("Referrer profile not found for ID:", refererId);
            }
          }
        } else {
          console.warn("Referral code not found:", refererCode);
        }
      } catch (lookupError) {
        console.error("Failed to lookup referrer data:", lookupError);
      }
    }

    // Log referral payout if referrer data exists
    if (referrerData && db) {
      try {
        const referralPercentage = Number(referrerData.referalCut || 0);
        const totalAmount = Number(amount) || 0;
        // Calculate referral cut amount (percentage of total amount)
        const referralCutAmount = Math.round(totalAmount * (referralPercentage / 100) * 100) / 100;
        const now = Date.now();
        
        const payoutRef = db.ref('admin/referralPayouts').push();
        const payoutData = {
          createdAt: new Date(now).toISOString(),
          createdAtMs: now,
          refererId: referrerData.refererId,
          refererCode: referrerData.code,
          refererName: referrerData.refererName || '',
          refererContact: referrerData.refererContact || '',
          bankDetails: referrerData.bankDetails || null,
          referredUserId: userId || '',
          referredUserName: userName || '',
          planName: planName || '',
          totalAmount,
          referralCutPercent: referralPercentage,
          referralCutAmount,
          paymentId,
          orderId,
          status: "pending",
          paidAt: null
        };
        
        await payoutRef.set(payoutData);
        const payoutId = payoutRef.key;
        
        console.log('✅ Referral payout transaction saved:', {
          payoutId,
          refererId: referrerData.refererId,
          refererName: referrerData.refererName,
          totalAmount,
          referralCutPercent: referralPercentage,
          referralCutAmount,
          hasBankDetails: !!referrerData.bankDetails
        });

        // Also add transaction record to referrer's transactions list
        if (referrerData.refererId) {
          try {
            const referrerTxRef = db.ref(`users/${referrerData.refererId}/transactions`).push();
            await referrerTxRef.set({
              txid: payoutId,
              amount: referralCutAmount,
              reason: `Referral commission for ${planName} plan purchase by ${userName || 'user'}`,
              when: new Date(now).toISOString(),
              whenMs: now,
              status: "pending",
              planName,
              referredUserId: userId,
              referredUserName: userName,
              paymentId,
              orderId
            });
            console.log('✅ Transaction record added to referrer:', referrerData.refererId);
          } catch (txError) {
            console.error("❌ Failed to add transaction to referrer:", txError);
            // Don't fail the whole process if transaction log fails
          }
        }
      } catch (logError) {
        console.error("❌ Failed to log referral payout:", logError);
        // Log but don't fail payment processing
      }
    } else if (refererCode && !referrerData) {
      console.warn("⚠️ Referrer code provided but referrer data not found:", refererCode);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in process-payment:", error);
    return res.status(500).json({ error: "Failed to verify payment" });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// For local development only
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;