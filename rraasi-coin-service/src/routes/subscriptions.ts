import { Router, Request, Response } from 'express';
import { razorpayService } from '../services/razorpayService';
import { coinService } from '../services/coinService';
import { firestoreService } from '../services/firestoreService';

const router = Router();

/**
 * GET /subscriptions/plans
 * Get all available subscription plans
 */
router.get('/plans', async (req: Request, res: Response) => {
    try {
        const plans = razorpayService.getAllPlans();
        res.json({ success: true, plans });
    } catch (error: any) {
        console.error('[Subscriptions API] Get plans error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /subscriptions/create-order
 * Create Razorpay order for subscription purchase
 */
router.post('/create-order', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.uid;
        const userEmail = (req as any).user.email;
        const { planId } = req.body;

        if (!planId) {
            res.status(400).json({
                success: false,
                error: 'planId is required'
            });
            return;
        }

        console.log(`Creating order for user ${userId}, plan ${planId}`);

        const result = await razorpayService.createOrder(planId, userId, userEmail);

        if (!result.success) {
            res.status(400).json(result);
            return;
        }

        res.json(result);
    } catch (error: any) {
        console.error('[Subscriptions API] Create order error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /subscriptions/verify
 * Verify Razorpay payment and allocate coins
 */
router.post('/verify', async (req: Request, res: Response) => {
    try {
        console.log('[Verify] Request received:', {
            hasUser: !!(req as any).user,
            userId: (req as any).user?.uid,
            body: Object.keys(req.body)
        });

        const userId = (req as any).user?.uid;
        const userEmail = (req as any).user?.email;

        if (!userId) {
            console.error('[Verify] No user found in request');
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }

        const { orderId, paymentId, signature, planId } = req.body;

        if (!orderId || !paymentId || !signature || !planId) {
            console.error('[Verify] Missing required fields');
            res.status(400).json({
                success: false,
                error: 'orderId, paymentId, signature, and planId are required'
            });
            return;
        }

        console.log(`Verifying payment for order ${orderId}`);

        // Verify signature
        const isValid = razorpayService.verifyPaymentSignature(
            orderId,
            paymentId,
            signature
        );

        if (!isValid) {
            console.error('Invalid payment signature');
            res.status(400).json({
                success: false,
                error: 'Invalid payment signature'
            });
            return;
        }

        // Get plan details
        const plan = razorpayService.getSubscriptionPlan(planId);
        if (!plan) {
            res.status(400).json({
                success: false,
                error: 'Invalid plan'
            });
            return;
        }

        console.log(`Payment verified! Allocating ${plan.coins} coins to user ${userId}`);

        // Calculate subscription end date
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.duration);

        // Create subscription record in Firestore
        const db = firestoreService.getDb();
        const subscriptionData = {
            userId,
            userEmail: userEmail || '',
            planId: plan.id,
            planName: plan.name,
            status: 'active',
            rraasiCoins: plan.coins,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            amountPaid: plan.price,
            currency: plan.currency,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await db.collection('subscriptions').add(subscriptionData);

        // Add coins to user's balance
        await coinService.addBonusCoins(
            userId,
            plan.coins,
            `Subscription: ${plan.name}`
        );

        // Update user profile with subscription info  
        try {
            const userRef = db.collection('users').doc(userId);
            const userSnap = await userRef.get();

            if (userSnap.exists) {
                await userRef.update({
                    hasActiveSubscription: true,
                    currentPlan: plan.id,
                    subscriptionEndDate: endDate,
                    totalSpent: (userSnap.data()?.totalSpent || 0) + (plan.price / 100),
                    lifetimeValue: (userSnap.data()?.lifetimeValue || 0) + (plan.price / 100),
                    totalCoins: (userSnap.data()?.totalCoins || 0) + plan.coins,
                    lastUpdated: new Date()
                });
                console.log(`Updated user profile for ${userId} with subscription`);
            }
        } catch (userError) {
            console.warn('Could not update user profile:', userError);
            // Don't fail the transaction if user profile update fails
        }

        console.log(`Subscription created successfully for user ${userId}`);

        res.json({
            success: true,
            subscription: {
                planId: plan.id,
                planName: plan.name,
                coins: plan.coins,
                startDate: subscriptionData.startDate,
                endDate: subscriptionData.endDate
            },
            coinsAdded: plan.coins
        });

    } catch (error: any) {
        console.error('[Subscriptions API] Verify payment error:', error);
        console.error('[Subscriptions API] Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to verify payment'
        });
    }
});

/**
 * GET /subscriptions/active
 * Get user's active subscription
 */
router.get('/active', async (req: Request, res: Response) => {
    try {
        const userEmail = (req as any).user.email;

        const subscription = await firestoreService.getSubscriptionByEmail(userEmail);

        if (!subscription) {
            res.json({
                success: true,
                subscription: null
            });
            return;
        }

        res.json({
            success: true,
            subscription
        });

    } catch (error: any) {
        console.error('[Subscriptions API] Get active subscription error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
