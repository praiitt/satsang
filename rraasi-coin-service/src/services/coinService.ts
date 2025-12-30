import { firestoreService } from './firestoreService';

interface FeatureCost {
    cost: number;
    name: string;
    category: string;
    freeTierAvailable: boolean;
    subscriptionUnlimited: boolean;
}

interface CoinBalance {
    userId: string;
    totalCoins: number;
    earnedCoins: number;
    spentCoins: number;
    bonusCoins: number;
    lastUpdated: Date;
    createdAt: Date;
}

/**
 * RRAASI Coin Service
 * Handles all coin-related operations for spiritual services
 */
export class CoinService {
    private FEATURE_COSTS: Record<string, FeatureCost> = {
        // Free Tier Features
        guru_chat_basic: {
            cost: 0,
            name: 'Basic Guru Chat (10min/day)',
            category: 'conversations',
            freeTierAvailable: true,
            subscriptionUnlimited: true
        },
        daily_tarot: {
            cost: 5,
            name: 'Daily Tarot Reading',
            category: 'divination',
            freeTierAvailable: true, // 1 per day free
            subscriptionUnlimited: true
        },

        // Premium Conversations
        guru_chat_extended: {
            cost: 15,
            name: 'Extended Guru Chat (30min)',
            category: 'conversations',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },
        guru_voice_chat: {
            cost: 20,
            name: 'Voice Conversation with Guru',
            category: 'conversations',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },
        multi_guru_chat: {
            cost: 10,
            name: 'Chat with Multiple Gurus',
            category: 'conversations',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },
        osho_discourse: {
            cost: 15,
            name: 'Osho Discourse Chat',
            category: 'conversations',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },
        hindu_guru_chat: {
            cost: 12,
            name: 'Hindu Guru Chat',
            category: 'conversations',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },

        // Music & Creative
        music_generation: {
            cost: 50,
            name: 'Generate Spiritual Music',
            category: 'music',
            freeTierAvailable: false,
            subscriptionUnlimited: true // Limited to 10/month
        },
        music_download_hd: {
            cost: 10,
            name: 'Download Music (HD)',
            category: 'music',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },
        personalized_chant: {
            cost: 30,
            name: 'Personalized Chant Creation',
            category: 'music',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },
        music_remix: {
            cost: 20,
            name: 'Music Remix/Variations',
            category: 'music',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },

        // Divination & Insights
        tarot_detailed: {
            cost: 15,
            name: 'Detailed Tarot Reading',
            category: 'divination',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },
        tarot_career: {
            cost: 20,
            name: 'Career Tarot Reading',
            category: 'divination',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },
        tarot_love: {
            cost: 20,
            name: 'Love Tarot Reading',
            category: 'divination',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },
        tarot_finance: {
            cost: 20,
            name: 'Finance Tarot Reading',
            category: 'divination',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },
        group_tarot: {
            cost: 35,
            name: 'Group Tarot Session',
            category: 'divination',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },
        psychedelic_journey: {
            cost: 25,
            name: 'Psychedelic Journey Guide',
            category: 'consciousness',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },
        et_consciousness: {
            cost: 18,
            name: 'ET Consciousness Chat',
            category: 'consciousness',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },

        // Premium Features
        custom_guru_creation: {
            cost: 100,
            name: 'Custom Guru Creation',
            category: 'premium',
            freeTierAvailable: false,
            subscriptionUnlimited: true // 1 per month
        },
        private_satsang_room: {
            cost: 50,
            name: 'Private Satsang Room (per hour)',
            category: 'premium',
            freeTierAvailable: false,
            subscriptionUnlimited: true // 2 per month
        },
        spiritual_report: {
            cost: 75,
            name: 'Personalized Spiritual Report',
            category: 'reports',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        },
        conversation_archive: {
            cost: 40,
            name: 'Saved Conversation Archive',
            category: 'storage',
            freeTierAvailable: false,
            subscriptionUnlimited: true
        }
    };

    constructor() {
        console.log(`Coin Service initialized with ${Object.keys(this.FEATURE_COSTS).length} features`);
    }

    /**
     * Get user's coin balance
     */
    async getCoinBalance(userId: string) {
        try {
            console.log(`Getting coin balance for user: ${userId}`);

            const balanceDoc = await this.getCoinBalanceDocument(userId);

            if (!balanceDoc) {
                return await this.initializeCoinBalance(userId);
            }

            // Calculate total from subscriptions
            const subscriptionCoins = await this.calculateSubscriptionCoins(userId);

            // Update balance if subscription coins changed
            if (balanceDoc.earnedCoins !== subscriptionCoins) {
                await this.updateEarnedCoins(userId, subscriptionCoins);
                balanceDoc.earnedCoins = subscriptionCoins;
                balanceDoc.totalCoins = balanceDoc.earnedCoins + balanceDoc.bonusCoins - balanceDoc.spentCoins;
            }

            console.log(`Balance retrieved: ${balanceDoc.totalCoins} coins`);

            return {
                success: true,
                balance: balanceDoc
            };

        } catch (error: any) {
            console.error('Error getting coin balance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get coin balance document from Firestore
     */
    private async getCoinBalanceDocument(userId: string): Promise<CoinBalance | null> {
        try {
            const db = firestoreService.getDb();
            const balanceRef = db.collection('coinBalances').doc(userId);
            const balanceDoc = await balanceRef.get();

            if (balanceDoc.exists) {
                return {
                    userId,
                    ...(balanceDoc.data() as any)
                };
            }

            return null;
        } catch (error) {
            console.error('Error getting balance document:', error);
            throw error;
        }
    }

    /**
     * Initialize coin balance for new user
     */
    private async initializeCoinBalance(userId: string) {
        try {
            const db = firestoreService.getDb();
            const initialBalance: CoinBalance = {
                userId,
                totalCoins: 0,
                earnedCoins: 0,
                spentCoins: 0,
                bonusCoins: 0,
                lastUpdated: new Date(),
                createdAt: new Date()
            };

            await db.collection('coinBalances').doc(userId).set(initialBalance);

            console.log(`Initialized balance for user: ${userId}`);

            return {
                success: true,
                balance: initialBalance
            };

        } catch (error: any) {
            console.error('Error initializing balance:', error);
            throw error;
        }
    }

    /**
     * Calculate coins from active subscription
     */
    private async calculateSubscriptionCoins(userId: string): Promise<number> {
        try {
            const userProfile = await firestoreService.getUserProfile(userId);
            if (!userProfile?.profile?.email) {
                return 0;
            }

            const subscription = await firestoreService.getSubscriptionByEmail(userProfile.profile.email) as any;

            if (!subscription || subscription.status !== 'active') {
                return 0;
            }

            // Check if subscription is still valid
            const now = new Date();
            const endDate = new Date(subscription.endDate);

            if (now > endDate) {
                return 0;
            }

            return subscription.rraasiCoins || 0;

        } catch (error) {
            console.error('Error calculating subscription coins:', error);
            return 0;
        }
    }

    /**
     * Update earned coins from subscriptions
     */
    private async updateEarnedCoins(userId: string, earnedCoins: number) {
        try {
            const db = firestoreService.getDb();
            const balanceRef = db.collection('coinBalances').doc(userId);
            const balanceDoc = await balanceRef.get();

            if (balanceDoc.exists) {
                const currentBalance = balanceDoc.data() as CoinBalance;
                const newTotalCoins = earnedCoins + currentBalance.bonusCoins - currentBalance.spentCoins;

                await balanceRef.update({
                    earnedCoins,
                    totalCoins: newTotalCoins,
                    lastUpdated: new Date()
                });

                console.log(`Updated earned coins: ${earnedCoins} (total: ${newTotalCoins})`);
            }

        } catch (error) {
            console.error('Error updating earned coins:', error);
            throw error;
        }
    }

    /**
     * Check if user can access a feature
     */
    async checkFeatureAccess(userId: string, featureId: string) {
        try {
            console.log(`Checking feature access: ${featureId} for user: ${userId}`);

            const featureCost = this.FEATURE_COSTS[featureId];
            if (!featureCost) {
                return {
                    success: false,
                    error: 'Unknown feature',
                    hasAccess: false
                };
            }

            // Check if feature is free tier
            if (featureCost.freeTierAvailable && featureCost.cost === 0) {
                return {
                    success: true,
                    hasAccess: true,
                    reason: 'free_tier',
                    cost: 0
                };
            }

            // Check subscription status
            if (featureCost.subscriptionUnlimited) {
                const userProfile = await firestoreService.getUserProfile(userId);
                if (userProfile?.profile?.email) {
                    const subscription = await firestoreService.getSubscriptionByEmail(userProfile.profile.email) as any;

                    if (subscription && subscription.status === 'active') {
                        const now = new Date();
                        const endDate = new Date(subscription.endDate);

                        if (now <= endDate) {
                            return {
                                success: true,
                                hasAccess: true,
                                reason: 'subscription_unlimited',
                                cost: 0
                            };
                        }
                    }
                }
            }

            // Check coin balance
            const balanceResult = await this.getCoinBalance(userId);
            if (!balanceResult.success || !(balanceResult as any).balance) {
                return {
                    success: false,
                    error: 'Failed to get balance',
                    hasAccess: false
                };
            }

            const balance = (balanceResult as any).balance;
            const hasAccess = balance.totalCoins >= featureCost.cost;

            return {
                success: true,
                hasAccess,
                reason: hasAccess ? 'sufficient_coins' : 'insufficient_coins',
                cost: featureCost.cost,
                availableCoins: balance.totalCoins,
                requiredCoins: featureCost.cost
            };
        } catch (error: any) {
            console.error('Error checking feature access:', error);
            return {
                success: false,
                error: error.message,
                hasAccess: false
            };
        }
    }

    /**
     * Deduct coins for feature usage
     */
    async deductCoins(userId: string, featureId: string, metadata: any = {}) {
        try {
            console.log(`Deducting coins: ${featureId} for user: ${userId}`);

            const featureCost = this.FEATURE_COSTS[featureId];
            if (!featureCost) {
                return {
                    success: false,
                    error: 'Unknown feature'
                };
            }

            // Check access first
            const accessCheck = await this.checkFeatureAccess(userId, featureId);
            if (!accessCheck.hasAccess) {
                return {
                    success: false,
                    error: 'Insufficient coins or access denied',
                    hasAccess: false,
                    requiredCoins: featureCost.cost,
                    availableCoins: accessCheck.availableCoins || 0
                };
            }

            // If free access, just log transaction
            if (accessCheck.cost === 0) {
                await this.createTransaction(userId, 'free_usage', 0, featureId, {
                    ...metadata,
                    reason: accessCheck.reason
                });

                return {
                    success: true,
                    coinsDeducted: 0,
                    reason: accessCheck.reason,
                    newBalance: accessCheck.availableCoins
                };
            }

            // Deduct coins
            const db = firestoreService.getDb();
            const balanceRef = db.collection('coinBalances').doc(userId);
            const balanceDoc = await balanceRef.get();
            const currentBalance = balanceDoc.data() as CoinBalance;

            const newSpentCoins = currentBalance.spentCoins + featureCost.cost;
            const newTotalCoins = currentBalance.earnedCoins + currentBalance.bonusCoins - newSpentCoins;

            await balanceRef.update({
                spentCoins: newSpentCoins,
                totalCoins: newTotalCoins,
                lastUpdated: new Date()
            });

            // Create transaction
            await this.createTransaction(userId, 'spend', featureCost.cost, featureId, {
                ...metadata,
                balanceBefore: currentBalance.totalCoins,
                balanceAfter: newTotalCoins
            });

            console.log(`Deducted ${featureCost.cost} coins, new balance: ${newTotalCoins}`);

            return {
                success: true,
                coinsDeducted: featureCost.cost,
                newBalance: newTotalCoins
            };

        } catch (error: any) {
            console.error('Error deducting coins:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create transaction record
     */
    private async createTransaction(
        userId: string,
        type: string,
        amount: number,
        featureId: string | null = null,
        metadata: any = {}
    ) {
        try {
            const db = firestoreService.getDb();
            const transaction = {
                transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId,
                type,
                amount,
                featureId,
                featureName: featureId ? this.FEATURE_COSTS[featureId]?.name : null,
                description: this.getTransactionDescription(type, featureId, amount),
                timestamp: new Date(),
                metadata
            };

            await db.collection('coinTransactions').add(transaction);

            console.log(`Transaction created: ${transaction.transactionId}`);

            return transaction;

        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    }

    /**
     * Get transaction description
     */
    private getTransactionDescription(type: string, featureId: string | null, amount: number): string {
        const featureName = featureId ? this.FEATURE_COSTS[featureId]?.name : 'Unknown Feature';

        switch (type) {
            case 'spend':
                return `Spent ${amount} coins on ${featureName}`;
            case 'earn':
                return `Earned ${amount} coins from subscription`;
            case 'bonus':
                return `Received ${amount} bonus coins`;
            case 'free_usage':
                return `Used ${featureName} (free access)`;
            default:
                return `Transaction: ${amount} coins`;
        }
    }

    /**
     * Get transaction history
     */
    async getTransactionHistory(userId: string, limit: number = 50) {
        try {
            const db = firestoreService.getDb();
            const snapshot = await db.collection('coinTransactions')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            const transactions: any[] = [];
            snapshot.forEach(doc => {
                transactions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return {
                success: true,
                transactions
            };

        } catch (error: any) {
            console.error('Error getting transactions:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Add bonus coins
     */
    async addBonusCoins(userId: string, amount: number, reason: string = 'Bonus'): Promise<any> {
        try {
            const db = firestoreService.getDb();
            const balanceRef = db.collection('coinBalances').doc(userId);
            const balanceDoc = await balanceRef.get();

            if (balanceDoc.exists) {
                const currentBalance = balanceDoc.data() as CoinBalance;
                const newBonusCoins = currentBalance.bonusCoins + amount;
                const newTotalCoins = currentBalance.earnedCoins + newBonusCoins - currentBalance.spentCoins;

                await balanceRef.update({
                    bonusCoins: newBonusCoins,
                    totalCoins: newTotalCoins,
                    lastUpdated: new Date()
                });

                await this.createTransaction(userId, 'bonus', amount, null, {
                    reason,
                    balanceBefore: currentBalance.totalCoins,
                    balanceAfter: newTotalCoins
                });

                return {
                    success: true,
                    bonusAdded: amount,
                    newBalance: newTotalCoins
                };
            } else {
                await this.initializeCoinBalance(userId);
                return await this.addBonusCoins(userId, amount, reason);
            }

        } catch (error: any) {
            console.error('Error adding bonus coins:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Deduct coins for Satsang session based on duration
     */
    async deductSatsangCoins(userId: string, durationMinutes: number, metadata: any = {}) {
        try {
            console.log(`Deducting Satsang coins: ${durationMinutes} min for user: ${userId}`);

            // Round up to nearest minute
            const minutes = Math.ceil(durationMinutes);
            const coinsPerMinute = 2;
            const totalCost = Math.max(minutes * coinsPerMinute, 2); // Minimum 2 coins

            // Get current balance
            const balanceResult = await this.getCoinBalance(userId);
            if (!balanceResult.success || !(balanceResult as any).balance) {
                return {
                    success: false,
                    error: 'Failed to get balance'
                };
            }

            const currentBalance = (balanceResult as any).balance;

            // Check if  user has enough coins
            if (currentBalance.totalCoins < totalCost) {
                return {
                    success: false,
                    error: 'Insufficient coins',
                    hasAccess: false,
                    requiredCoins: totalCost,
                    availableCoins: currentBalance.totalCoins
                };
            }

            // Deduct coins
            const db = firestoreService.getDb();
            const balanceRef = db.collection('coinBalances').doc(userId);

            const newSpentCoins = currentBalance.spentCoins + totalCost;
            const newTotalCoins = currentBalance.earnedCoins + currentBalance.bonusCoins - newSpentCoins;

            await balanceRef.update({
                spentCoins: newSpentCoins,
                totalCoins: newTotalCoins,
                lastUpdated: new Date()
            });

            // Create transaction
            await this.createTransaction(userId, 'spend', totalCost, 'satsang_session', {
                ...metadata,
                durationMinutes: minutes,
                coinsPerMinute,
                balanceBefore: currentBalance.totalCoins,
                balanceAfter: newTotalCoins
            });

            console.log(`Deducted ${totalCost} coins for ${minutes} min session, new balance: ${newTotalCoins}`);

            return {
                success: true,
                coinsDeducted: totalCost,
                durationMinutes: minutes,
                perMinuteRate: coinsPerMinute,
                newBalance: newTotalCoins
            };

        } catch (error: any) {
            console.error('Error deducting Satsang coins:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get all feature costs
     */
    getAllFeatureCosts() {
        return this.FEATURE_COSTS;
    }

    /**
     * Get feature cost by ID
     */
    getFeatureCost(featureId: string) {
        return this.FEATURE_COSTS[featureId] || null;
    }
}

export const coinService = new CoinService();
