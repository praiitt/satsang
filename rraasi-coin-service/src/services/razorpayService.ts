import Razorpay from 'razorpay';
import crypto from 'crypto';

/**
 * Razorpay Service for payment processing
 */
export class RazorpayService {
    private razorpay: Razorpay;
    private keyId: string;
    private keySecret: string;

    constructor() {
        this.keyId = process.env.RAZORPAY_KEY_ID || '';
        this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';

        if (!this.keyId || !this.keySecret) {
            console.warn('Razorpay credentials not configured');
        }

        this.razorpay = new Razorpay({
            key_id: this.keyId,
            key_secret: this.keySecret
        });
    }

    /**
     * Subscription plans configuration
     */
    private SUBSCRIPTION_PLANS = {
        seeker_7: {
            id: 'seeker_7',
            name: 'Seeker - 7 Days',
            duration: 7,
            price: 9900, // in paise (₹99)
            coins: 300,
            currency: 'INR'
        },
        devotee_30: {
            id: 'devotee_30',
            name: 'Devotee - 30 Days',
            duration: 30,
            price: 29900, // in paise (₹299)
            coins: 1200,
            currency: 'INR'
        },
        sadhak_90: {
            id: 'sadhak_90',
            name: 'Sadhak - 90 Days',
            duration: 90,
            price: 79900, // in paise (₹799)
            coins: 4000,
            currency: 'INR'
        }
    };

    /**
     * Get subscription plan details
     */
    getSubscriptionPlan(planId: string) {
        return this.SUBSCRIPTION_PLANS[planId as keyof typeof this.SUBSCRIPTION_PLANS] || null;
    }

    /**
     * Create Razorpay order for subscription
     */
    async createOrder(planId: string, userId: string, userEmail: string) {
        try {
            const plan = this.getSubscriptionPlan(planId);

            if (!plan) {
                return {
                    success: false,
                    error: 'Invalid subscription plan'
                };
            }

            const orderOptions = {
                amount: plan.price,
                currency: plan.currency,
                receipt: `${planId}_${Date.now()}`.substring(0, 40),
                notes: {
                    planId: plan.id,
                    userId,
                    userEmail,
                    coins: plan.coins.toString(),
                    duration: plan.duration.toString()
                }
            };

            const order = await this.razorpay.orders.create(orderOptions);

            console.log('Razorpay order created:', order.id);

            return {
                success: true,
                order: {
                    id: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    planId: plan.id,
                    planName: plan.name,
                    coins: plan.coins
                }
            };

        } catch (error: any) {
            console.error('Error creating Razorpay order:', error);
            return {
                success: false,
                error: error.message || 'Failed to create order'
            };
        }
    }

    /**
     * Verify Razorpay payment signature
     */
    verifyPaymentSignature(
        orderId: string,
        paymentId: string,
        signature: string
    ): boolean {
        try {
            const text = `${orderId}|${paymentId}`;
            const expectedSignature = crypto
                .createHmac('sha256', this.keySecret)
                .update(text)
                .digest('hex');

            return expectedSignature === signature;
        } catch (error) {
            console.error('Error verifying signature:', error);
            return false;
        }
    }

    /**
     * Get all subscription plans
     */
    getAllPlans() {
        return Object.values(this.SUBSCRIPTION_PLANS);
    }
}

export const razorpayService = new RazorpayService();
