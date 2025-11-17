const express = require('express');
const cors = require('cors');

const app = express();

// More permissive CORS for production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || '*'] 
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
      nodeEnv: process.env.NODE_ENV
    }
  });
});

// Create order endpoint
app.post("/api/create-order", async (req, res) => {
  try {
    console.log('Create order called');
    console.log('Request body:', req.body);

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
    const amount = req.body.amount;
    if (!amount || amount <= 0) {
      console.error('Invalid amount:', amount);
      return res.status(400).json({ 
        error: 'Invalid amount',
        received: amount
      });
    }

    // Create order options
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
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

// Catch-all for API routes
app.all('/api/*', (req, res) => {
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

// Export for Vercel
module.exports = app;