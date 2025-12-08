import express from 'express';
import Joi from 'joi';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { firestoreRAGService } from '../services/firestoreRAGService.js';

const router = express.Router();

const createOrderSchema = Joi.object({
  planId: Joi.string().required(),
  amount: Joi.number().integer().min(1).required(), // rupees, frontend sends rupees
  currency: Joi.string().valid('INR').required(),
  userEmail: Joi.string().email().required(),
  userName: Joi.string().min(1).required()
});

const verifySchema = Joi.object({
  paymentId: Joi.string().required(),
  orderId: Joi.string().required(),
  signature: Joi.string().required(),
  planId: Joi.string().required(),
  userEmail: Joi.string().email().required(),
  userName: Joi.string().min(1).required(),
  amount: Joi.number().integer().min(1).required()
});

const PLAN_DURATIONS = {
  starter_7: 7,
  starter_11: 11,
  premium_30: 30,
  cosmic_90: 90
};

// RRAASI Coins allocation for each plan
const PLAN_RRAASI_COINS = {
  starter_7: 200,
  starter_11: 300,
  premium_30: 800,
  cosmic_90: 2500
};

function getPlanRraasiCoins(planId) {
  return PLAN_RRAASI_COINS[planId] || 0;
}

function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET in .env');
  }
  // Log key presence (but not the actual secret for security)
  console.log('Razorpay keys loaded:', { 
    keyId: keyId ? `${keyId.substring(0, 10)}...` : 'MISSING',
    keySecretLength: keySecret ? keySecret.length : 0 
  });
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

router.post('/create-order', async (req, res) => {
  try {
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    const instance = getRazorpayInstance();
    const options = {
      amount: value.amount * 100, // to paise
      currency: value.currency,
      receipt: `rcpt_${Date.now()}`,
      notes: { planId: value.planId, userEmail: value.userEmail, userName: value.userName }
    };
    
    const order = await instance.orders.create(options);
    return res.json({ success: true, orderId: order.id });
  } catch (err) {
    console.error('Payment order creation error:', err);
    // Return more detailed error information
    const errorMessage = err.error?.description || err.message || 'Unknown error occurred';
    const errorCode = err.statusCode || err.error?.code || 500;
    return res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        statusCode: errorCode,
        razorpayError: err.error,
        message: err.message
      } : undefined
    });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { error, value } = verifySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ success: false, error: 'Missing Razorpay secret' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${value.orderId}|${value.paymentId}`)
      .digest('hex');

    if (generatedSignature !== value.signature) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    // Compute subscription dates based on plan
    const days = PLAN_DURATIONS[value.planId] || 30;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    // Get RRAASI coins for the plan
    const planCoins = getPlanRraasiCoins(value.planId);

    const subscription = {
      id: `sub_${Date.now()}`,
      planId: value.planId,
      status: 'active',
      startDate,
      endDate,
      paymentId: value.paymentId,
      amount: value.amount * 100, // store in paise for consistency with UI display
      currency: 'INR',
      userEmail: value.userEmail,
      userName: value.userName,
      rraasiCoins: planCoins,
      planDuration: days,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Persist by email (no auth layer here)
    await firestoreRAGService.upsertSubscriptionByEmail(value.userEmail, subscription);

    return res.json({ success: true, subscription });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/subscription-status', async (req, res) => {
  try {
    const userEmail = req.header('x-user-email') || req.query.userEmail;
    if (!userEmail) {
      return res.json({ success: true, subscription: null });
    }
    const subscription = await firestoreRAGService.getSubscriptionByEmail(userEmail);
    return res.json({ success: true, subscription });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/cancel-subscription', async (req, res) => {
  try {
    const userEmail = req.header('x-user-email') || req.body?.userEmail;
    if (!userEmail) {
      return res.status(400).json({ success: false, error: 'Missing userEmail' });
    }
    const result = await firestoreRAGService.cancelSubscriptionByEmail(userEmail);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

