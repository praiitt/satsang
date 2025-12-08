# 🔗 Subscription Plan & RRAASI Coin System Integration

## 📋 Overview

The RRAASI platform seamlessly integrates subscription plans with a spiritual coin system called "RRAASI Coins". This integration ensures that users receive coins based on their subscription tier, which can then be used to access various features and services.

## 🏗️ Architecture

### 1. **Subscription Plans Structure**
```typescript
interface SubscriptionPlan {
  id: string           // e.g., 'starter_7', 'premium_30', 'cosmic_90'
  name: string         // e.g., 'Starter Pack', 'Premium Pack'
  price: number        // Base price in INR
  duration: number     // Duration in days
  rraasiCoins: number  // RRAASI coins included with this plan
  features: string[]   // List of features included
}
```

### 2. **RRAASI Coin Allocation**
| Plan ID | Duration | Price (₹) | RRAASI Coins | Coins/₹100 |
|---------|----------|-----------|--------------|------------|
| `starter_7` | 7 days | 49 | 200 | 408 |
| `starter_11` | 11 days | 99 | 300 | 303 |
| `premium_30` | 30 days | 199 | 800 | 402 |
| `cosmic_90` | 90 days | 499 | 2500 | 501 |

### 3. **Subscription Data Structure**
```typescript
interface Subscription {
  id: string                    // Unique subscription ID
  planId: string               // Reference to plan
  status: 'active' | 'expired' | 'cancelled'
  startDate: Date              // Subscription start date
  endDate: Date                // Subscription end date
  paymentId: string            // Razorpay payment ID
  amount: number               // Amount in paise
  currency: string             // Currency (INR)
  userEmail: string            // User's email
  userName: string             // User's name
  rraasiCoins: number          // Coins allocated with this subscription
  planDuration: number         // Duration in days
  createdAt: Date              // Creation timestamp
  updatedAt: Date              // Last update timestamp
}
```

## 🔄 Payment Flow & Coin Allocation

### 1. **Order Creation**
```javascript
// User selects a plan and clicks "Subscribe"
POST /api/payments/create-order
{
  "planId": "starter_7",
  "amount": 49,
  "currency": "INR",
  "userEmail": "user@example.com",
  "userName": "User Name"
}

// Response: Razorpay order ID
{
  "success": true,
  "orderId": "order_ABC123"
}
```

### 2. **Payment Verification & Coin Allocation**
```javascript
// After successful payment, Razorpay calls webhook
POST /api/payments/verify
{
  "paymentId": "pay_XYZ789",
  "orderId": "order_ABC123",
  "signature": "verified_signature",
  "planId": "starter_7",
  "userEmail": "user@example.com",
  "userName": "User Name",
  "amount": 49
}

// System automatically:
// 1. Verifies payment signature
// 2. Creates subscription record
// 3. Allocates 200 RRAASI coins
// 4. Stores in Firestore
```

### 3. **Firestore Storage**
```javascript
// Collection: subscriptions
{
  "id": "sub_1234567890",
  "planId": "starter_7",
  "status": "active",
  "startDate": "2025-08-31T18:46:18.000Z",
  "endDate": "2025-09-07T18:46:18.000Z",
  "paymentId": "pay_XYZ789",
  "amount": 4900,
  "currency": "INR",
  "userEmail": "user@example.com",
  "userName": "User Name",
  "rraasiCoins": 200,
  "planDuration": 7,
  "createdAt": "2025-08-31T18:46:18.000Z",
  "updatedAt": "2025-08-31T18:46:18.000Z"
}
```

## 🪙 RRAASI Coin System

### 1. **Coin Balance Management**
```typescript
interface CoinBalance {
  total: number      // Total coins available
  earned: number     // Coins earned from subscriptions
  spent: number      // Coins spent on features
  bonus: number      // Bonus coins from promotions
  subscription: number // Coins from active subscription
}
```

### 2. **Feature Costs**
```typescript
interface FeatureCost {
  id: string           // Feature identifier
  name: string         // Feature name
  cost: number         // Coin cost
  category: string     // Feature category
  freeTierAvailable: boolean    // Available in free tier
  subscriptionUnlimited: boolean // Unlimited with subscription
}
```

### 3. **Feature Access Control**
```typescript
// Example feature costs
const FEATURE_COSTS = [
  { id: 'basic_chat', name: 'Basic Chat', cost: 5, category: 'chat', freeTierAvailable: true, subscriptionUnlimited: true },
  { id: 'compatibility_check', name: 'Compatibility Check', cost: 15, category: 'compatibility', freeTierAvailable: false, subscriptionUnlimited: true },
  { id: 'birth_chart', name: 'Birth Chart', cost: 25, category: 'charts', freeTierAvailable: false, subscriptionUnlimited: true },
  { id: 'daily_horoscope', name: 'Daily Horoscope', cost: 2, category: 'horoscope', freeTierAvailable: true, subscriptionUnlimited: true }
];
```

## 🔐 Security & Validation

### 1. **Payment Verification**
- Razorpay signature verification using HMAC SHA256
- Payment amount validation
- Order ID validation
- User email validation

### 2. **Coin Allocation Security**
- Coins only allocated after verified payment
- One-time allocation per subscription
- No duplicate coin allocation
- Audit trail in Firestore

### 3. **Feature Access Control**
- Real-time coin balance validation
- Subscription status checking
- Feature cost enforcement
- Transaction logging

## 📊 Data Flow Diagram

```
User Selection → Plan Display → Payment Initiation → Razorpay → Payment Verification → Subscription Creation → Coin Allocation → Firestore Storage → Feature Access
     ↓              ↓              ↓              ↓           ↓              ↓              ↓              ↓              ↓
  Show Plans    Display Coins   Create Order   Process    Verify Sig    Create Sub    Allocate 200   Store Data    Enable Features
                & Features      & Amount       Payment    & Amount      Record        RRAASI Coins   in Firestore  Based on Coins
```

## 🧪 Testing & Validation

### 1. **Backend API Testing**
```bash
# Test order creation
curl -X POST http://localhost:3000/api/payments/create-order \
  -H "Content-Type: application/json" \
  -d '{"planId":"starter_7","amount":49,"currency":"INR","userEmail":"test@test.com","userName":"Test User"}'

# Test subscription status
curl http://localhost:3000/api/payments/subscription-status?userEmail=test@test.com
```

### 2. **Frontend Integration Testing**
- Navigate to `/subscription` page
- Verify plan display with RRAASI coin amounts
- Test payment flow with Razorpay test keys
- Verify coin allocation after successful payment
- Test feature access based on coin balance

## 🚀 Deployment & Configuration

### 1. **Environment Variables**
```bash
# Backend (.env)
RAZORPAY_KEY_ID=rzp_test_XXXXX
RAZORPAY_KEY_SECRET=your_secret_key

# Frontend (.env)
VITE_RAZORPAY_KEY_ID=rzp_test_XXXXX
```

### 2. **Firestore Collections**
- `subscriptions`: Subscription records with coin allocation
- `users`: User profiles and coin balances
- `transactions`: Coin transaction history
- `waitlist`: User waitlist entries

### 3. **Monitoring & Logging**
- Payment success/failure logging
- Coin allocation tracking
- Feature usage monitoring
- Subscription lifecycle tracking

## 🔮 Future Enhancements

### 1. **Advanced Coin Features**
- Coin expiration system
- Referral bonus coins
- Achievement-based coin rewards
- Seasonal coin multipliers

### 2. **Subscription Management**
- Auto-renewal options
- Upgrade/downgrade plans
- Pause subscription feature
- Family plan sharing

### 3. **Analytics & Insights**
- Coin usage patterns
- Popular feature analysis
- Subscription conversion rates
- User engagement metrics

## ✅ Integration Status

- ✅ **Subscription Plans**: Configured with RRAASI coin amounts
- ✅ **Payment Flow**: Razorpay integration working
- ✅ **Coin Allocation**: Automatic allocation after payment
- ✅ **Firestore Storage**: Subscription data properly stored
- ✅ **Frontend Display**: Plans show coin amounts and features
- ✅ **Feature Access**: Coin-based access control implemented
- ✅ **Security**: Payment verification and validation working

## 🎯 Key Benefits

1. **Flexible Access**: Users can access features based on coin balance
2. **Value Proposition**: Higher-tier plans offer better coin-to-price ratios
3. **Engagement**: Coin system encourages continued usage
4. **Monetization**: Multiple revenue streams (subscriptions + feature usage)
5. **User Experience**: Clear understanding of what's included in each plan

---

**Last Updated**: August 31, 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅
