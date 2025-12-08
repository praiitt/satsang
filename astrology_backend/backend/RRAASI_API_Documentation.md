# RRAASI Backend API Documentation

## Overview
Complete API documentation for the RRAASI astrology platform backend. This document covers all available endpoints, request/response formats, and authentication requirements.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require Bearer token authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### 🔐 Authentication

#### Sign Up
```http
POST /auth/signup
```
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "birthData": {
    "birthDate": "1990-01-01",
    "birthTime": "12:00",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "placeOfBirth": "New Delhi"
  }
}
```

#### Sign In
```http
POST /auth/signin
```
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get User Profile
```http
GET /auth/me
```
**Headers:** `Authorization: Bearer <token>`

#### Update Profile
```http
PUT /auth/profile
```
**Headers:** `Authorization: Bearer <token>`
**Request Body:**
```json
{
  "name": "Updated Name",
  "birthData": {
    "birthDate": "1990-01-01",
    "birthTime": "12:00",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "placeOfBirth": "New Delhi"
  }
}
```

#### Sign Out
```http
POST /auth/signout
```
**Headers:** `Authorization: Bearer <token>`

### 💬 Chat

#### Basic Chat
```http
POST /chat
```
**Headers:** `Authorization: Bearer <token>`
**Request Body:**
```json
{
  "query": "Tell me about my personality based on my birth chart",
  "conversationId": "conv_12345"
}
```

**Response:**
```json
{
  "response": "Based on your birth chart...",
  "brief_answer": "You are a creative and intuitive person...",
  "detailed_description": "Your birth chart reveals...",
  "confidence": 0.85,
  "sources": ["Birth Chart", "Planetary Positions"],
  "coinUsage": {
    "coinsDeducted": 0,
    "newBalance": 100,
    "transactionId": "txn_12345"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 💕 Matchmaking

#### Partner Chat
```http
POST /matchmaking/partner-chat
```
**Headers:** `Authorization: Bearer <token>`
**Request Body:**
```json
{
  "userId": "user_id_here",
  "query": "What is our compatibility percentage?",
  "perspective": "male",
  "conversationId": "match_conv_12345"
}
```

**Response:**
```json
{
  "response": "Your compatibility analysis...",
  "briefAnswer": "You have 75% compatibility...",
  "detailedDescription": "Based on your birth charts...",
  "compatibilityScore": 75,
  "matchId": "match_12345",
  "coinUsage": {
    "coinsDeducted": 20,
    "newBalance": 80,
    "transactionId": "txn_12345"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 👥 Compatibility

#### Group Analysis
```http
POST /compatibility/group-analysis
```
**Headers:** `Authorization: Bearer <token>`
**Request Body:**
```json
{
  "groupMembers": [
    {
      "name": "Alice",
      "birthDate": "1990-05-15",
      "birthTime": "14:30",
      "latitude": 28.6139,
      "longitude": 77.2090,
      "role": "Leader"
    },
    {
      "name": "Bob",
      "birthDate": "1988-12-03",
      "birthTime": "09:15",
      "latitude": 19.0760,
      "longitude": 72.8777,
      "role": "Creative"
    }
  ],
  "groupType": "work",
  "analysisFocus": "dynamics",
  "userId": "user_id_here",
  "conversationId": "group_conv_12345"
}
```

**Response:**
```json
{
  "groupAnalysis": "This work group shows...",
  "briefAnswer": "The group has moderate compatibility...",
  "detailedDescription": "Based on the birth charts...",
  "groupMembers": 2,
  "groupType": "work",
  "coinUsage": {
    "coinsDeducted": 30,
    "newBalance": 70,
    "transactionId": "txn_12345"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 🪙 Coins

#### Get Coin Balance
```http
GET /coins/balance
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "balance": {
    "totalCoins": 100,
    "earnedCoins": 50,
    "spentCoins": 20,
    "bonusCoins": 70
  }
}
```

#### Get Transaction History
```http
GET /coins/transactions?limit=50
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "txn_12345",
      "type": "spend",
      "amount": 20,
      "description": "Spent 20 coins on Matchmaking Chat",
      "featureId": "matchmaking_chat",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ],
  "count": 1
}
```

#### Get Feature Costs
```http
GET /coins/features
```

**Response:**
```json
{
  "success": true,
  "features": [
    {
      "id": "basic_chat",
      "name": "Basic Chat",
      "cost": 5,
      "category": "chat",
      "freeTierAvailable": true,
      "subscriptionUnlimited": true
    }
  ],
  "count": 8
}
```

#### Check Feature Access
```http
POST /coins/check-access
```
**Headers:** `Authorization: Bearer <token>`
**Request Body:**
```json
{
  "featureId": "basic_chat"
}
```

#### Add Bonus Coins (Admin)
```http
POST /coins/bonus
```
**Headers:** `Authorization: Bearer <token>`
**Request Body:**
```json
{
  "userId": "user_id_here",
  "amount": 100,
  "reason": "Welcome bonus"
}
```

#### Get Coin System Stats (Admin)
```http
GET /coins/stats
```
**Headers:** `Authorization: Bearer <token>`

### 💳 Payments

#### Create Order
```http
POST /payments/create-order
```
**Request Body:**
```json
{
  "planId": "premium_monthly",
  "userEmail": "user@example.com"
}
```

#### Verify Payment
```http
POST /payments/verify
```
**Request Body:**
```json
{
  "razorpay_order_id": "order_12345",
  "razorpay_payment_id": "pay_12345",
  "razorpay_signature": "signature_12345"
}
```

### 🔮 Astrology

#### Get Birth Chart
```http
POST /astrology/birth-chart
```
**Request Body:**
```json
{
  "birthDate": "1990-01-01",
  "birthTime": "12:00",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "placeOfBirth": "New Delhi"
}
```

#### Get Comprehensive Charts
```http
POST /astrology/comprehensive
```
**Headers:** `Authorization: Bearer <token>`
**Request Body:**
```json
{
  "userId": "user_id_here",
  "birthData": {
    "birthDate": "1990-01-01",
    "birthTime": "12:00",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "placeOfBirth": "New Delhi"
  }
}
```

### 👤 User Profile

#### Get User Profile
```http
GET /user-profile/{userId}
```
**Headers:** `Authorization: Bearer <token>`

#### Update User Profile
```http
PUT /user-profile/{userId}
```
**Headers:** `Authorization: Bearer <token>`
**Request Body:**
```json
{
  "name": "Updated Name",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

### 🛤️ User Journey

#### Get User Journey
```http
GET /user-journey/{userId}
```
**Headers:** `Authorization: Bearer <token>`

#### Update User Journey
```http
POST /user-journey/{userId}
```
**Headers:** `Authorization: Bearer <token>`
**Request Body:**
```json
{
  "step": "chart_generated",
  "data": {
    "chartType": "birth_chart",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### 📊 Chart Management

#### Get User Charts
```http
GET /chart-management/{userId}
```
**Headers:** `Authorization: Bearer <token>`

#### Generate Charts
```http
POST /chart-management/generate
```
**Headers:** `Authorization: Bearer <token>`
**Request Body:**
```json
{
  "userId": "user_id_here",
  "birthData": {
    "birthDate": "1990-01-01",
    "birthTime": "12:00",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "placeOfBirth": "New Delhi"
  }
}
```

### 🔍 RAG

#### Search Charts by Query
```http
POST /rag/search
```
**Headers:** `Authorization: Bearer <token>`
**Request Body:**
```json
{
  "userId": "user_id_here",
  "query": "Tell me about my personality"
}
```

#### Get Chat History
```http
GET /rag/chat-history/{userId}?limit=50&conversationId=conv_12345
```
**Headers:** `Authorization: Bearer <token>`

### 🚀 Enhanced Chat

#### Enhanced Chat Query
```http
POST /enhanced-chat
```
**Headers:** `Authorization: Bearer <token>`
**Request Body:**
```json
{
  "query": "Tell me about my career prospects",
  "conversationId": "enhanced_conv_12345"
}
```

### 🔄 Hybrid RAG

#### Hybrid RAG Query
```http
POST /hybrid-rag
```
**Headers:** `Authorization: Bearer <token>`
**Request Body:**
```json
{
  "userId": "user_id_here",
  "query": "What are my lucky colors?"
}
```

### 📝 Waitlist

#### Join Waitlist
```http
POST /waitlist
```
**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "interest": "astrology"
}
```

#### Get Waitlist Status
```http
GET /waitlist/status?email=user@example.com
```

### 👨‍💼 Admin

#### Get All Users
```http
GET /admin/users
```
**Headers:** `Authorization: Bearer <admin_token>`

#### Get System Stats
```http
GET /admin/stats
```
**Headers:** `Authorization: Bearer <admin_token>`

#### Delete User
```http
DELETE /admin/users/{userId}
```
**Headers:** `Authorization: Bearer <admin_token>`

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `402` - Payment Required (Insufficient coins)
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

- **Chat endpoints**: 10 requests per minute per user
- **Other endpoints**: 100 requests per minute per user

## Coin System

### Feature Costs
- **Basic Chat**: 5 coins (Free tier available)
- **Matchmaking Chat**: 20 coins
- **Group Compatibility**: 30 coins
- **Birth Chart**: 25 coins
- **Compatibility Check**: 15 coins
- **Daily Horoscope**: 2 coins (Free tier available)
- **Advanced Analysis**: 50 coins
- **Personalized Report**: 100 coins

### Free Tier
- Basic Chat: Unlimited
- Daily Horoscope: Unlimited
- All other features require coins

## Testing

Use the provided Postman collection to test all endpoints:

1. Import `RRAASI_API_Collection.postman_collection.json`
2. Import `RRAASI_Environment.postman_environment.json`
3. Start with Sign Up or Sign In to get authentication token
4. The collection will automatically set the auth token and user ID variables

## Support

For API support or questions, please contact the development team.
