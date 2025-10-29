import express from 'express';
import Razorpay from 'razorpay';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import {fileURLToPath} from 'url';

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const razorpay = new Razorpay({key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_SECRET});

app.post("/api/create-order",async(req,res)=>{
    try{
        const options = {
            amount : req.body.amount * 100,
            currency : "INR",
            receipt : `receipt_${Date.now()}`,
        };
        const order = await razorpay.orders.create(options);
        res.json(order);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
})

if(process.env.NODE_ENV === "production"){
    app.use(express.static(path.join(__dirname, "../build")));
    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../build", "index.html"));
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));