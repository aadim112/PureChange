const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Health check endpoint
app.get("/api/health", (req, res) => {
  console.log('Health check called');
  res.status(200).json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      hasRazorpayKey: !!process.env.RAZORPAY_KEY_ID,
      hasRazorpaySecret: !!process.env.RAZORPAY_SECRET,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

// Create order endpoint
app.post("/api/create-order", async (req, res) => {
  try {
    console.log('Create order called');
    console.log('Amount:', req.body.amount);

    // Check environment variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
      console.error('Missing Razorpay credentials');
      return res.status(500).json({ 
        error: 'Razorpay credentials not configured',
        hasKey: !!process.env.RAZORPAY_KEY_ID,
        hasSecret: !!process.env.RAZORPAY_SECRET
      });
    }

    // Import Razorpay
    const Razorpay = require('razorpay');
    
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID, 
      key_secret: process.env.RAZORPAY_SECRET
    });

    // Validate amount
    if (!req.body.amount || req.body.amount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount',
        received: req.body.amount
      });
    }

    // Create order options
    const options = {
      amount: Math.round(req.body.amount * 100), // Convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    console.log('Creating Razorpay order:', options);
    const order = await razorpay.orders.create(options);
    console.log('Order created successfully:', order.id);
    
    return res.status(200).json(order);
  } catch (err) {
    console.error('Error in create-order:', err);
    return res.status(500).json({ 
      error: err.message,
      details: err.error?.description || 'Unknown error'
    });
  }
});

// For local development only
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

// Export for Vercel (no catch-all routes needed)
module.exports = app;