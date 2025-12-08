# Rraasi Backend

A scalable Node.js backend for the Rraasi astrology app with LangChain integration, OpenAI function calling, and comprehensive API support for all frontend features.

## Features

- **LangChain Integration**: Advanced AI-powered chat with context awareness
- **OpenAI Function Calling**: Intelligent function execution for external API integrations
- **Astrology Analysis**: Birth chart analysis, transits, and personalized readings
- **Wellness Guidance**: Yoga recommendations, dosha analysis, and spiritual practices
- **Compatibility Analysis**: Relationship compatibility and matchmaking
- **User Journey Tracking**: Progress tracking and personalized insights
- **Enhanced Chat**: Swiss Ephemeris integration for accurate astrological calculations
- **Real-time Communication**: Socket.IO for live chat features
- **Comprehensive Logging**: Winston-based structured logging
- **Rate Limiting**: API protection and request management
- **Input Validation**: Joi-based request validation
- **Error Handling**: Centralized error management

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **AI/ML**: LangChain, OpenAI GPT-4
- **Validation**: Joi
- **Logging**: Winston
- **Real-time**: Socket.IO
- **Security**: Helmet, CORS, Rate Limiting
- **Astrology**: Swiss Ephemeris (planned integration)

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- OpenAI API key

### Installation

1. **Clone and navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4-turbo-preview
   ```

4. **Start the server**:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `https://rraasibackend-491244969919.asia-east1.run.app`

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Chat & AI
- `POST /api/chat` - Main chat endpoint with LangChain
- `POST /api/chat/analyze-birth-chart` - Birth chart analysis
- `POST /api/chat/get-reading` - Personalized readings
- `POST /api/chat/current-transits` - Current transits

### Astrology
- `POST /api/astrology/comprehensive-analysis` - Comprehensive astrological analysis
- `POST /api/astrology/import-charts` - Import astrological charts
- `GET /api/astrology/user-charts/:userId` - Get user's charts
- `POST /api/astrology/planetary-positions` - Planetary positions analysis
- `POST /api/astrology/aspects-analysis` - Aspects analysis
- `POST /api/astrology/house-analysis` - House analysis

### Wellness
- `POST /api/wellness/dosha-analysis` - Dosha analysis
- `POST /api/wellness/yoga-recommendations` - Yoga recommendations
- `POST /api/wellness/mantra-suggestions` - Mantra suggestions
- `POST /api/wellness/ritual-recommendations` - Ritual recommendations
- `POST /api/wellness/wellness-advice` - Wellness advice
- `POST /api/wellness/cosmic-guidance` - Cosmic guidance
- `POST /api/wellness/meditation-guidance` - Meditation guidance
- `POST /api/wellness/ayurvedic-recommendations` - Ayurvedic recommendations

### Compatibility
- `POST /api/compatibility/analyze` - Compatibility analysis
- `POST /api/compatibility/relationship-insights` - Relationship insights
- `POST /api/compatibility/synastry` - Synastry chart calculation
- `POST /api/compatibility/compatibility-score` - Compatibility scoring
- `POST /api/compatibility/relationship-forecast` - Relationship forecasting
- `POST /api/compatibility/group-analysis` - Group compatibility analysis

### Matchmaking
- `POST /api/matchmaking` - Matchmaking report
- `POST /api/matchmaking/detailed-analysis` - Detailed compatibility analysis
- `POST /api/matchmaking/potential-score` - Relationship potential scoring
- `POST /api/matchmaking/marriage-compatibility` - Marriage compatibility
- `POST /api/matchmaking/relationship-timeline` - Relationship timeline

### User Journey
- `GET /api/user-journey/dashboard/:userId` - User journey dashboard
- `POST /api/user-journey/report` - Generate journey report
- `POST /api/user-journey/track-activity` - Track user activity
- `GET /api/user-journey/progress/:userId` - User progress
- `GET /api/user-journey/insights/:userId` - User insights
- `GET /api/user-journey/recommendations/:userId` - User recommendations

### Enhanced Chat
- `POST /api/enhanced-chat` - Enhanced chat with Swiss Ephemeris
- `GET /api/enhanced-chat/system-status` - System status check
- `POST /api/enhanced-chat/swiss-ephemeris` - Swiss Ephemeris data
- `POST /api/enhanced-chat/astrological-insights` - Astrological insights
- `GET /api/enhanced-chat/recommendations` - Chat recommendations

## OpenAI Function Calling

The backend supports comprehensive OpenAI function calling for:

### Astrology Functions
- `get_birth_chart` - Calculate and analyze birth charts
- `get_current_transits` - Get current planetary transits
- `get_personalized_reading` - Generate personalized readings
- `analyze_planetary_positions` - Analyze planetary positions
- `get_aspects_analysis` - Analyze planetary aspects
- `get_house_analysis` - Analyze the 12 houses

### Wellness Functions
- `get_yoga_recommendations` - Personalized yoga recommendations
- `get_dosha_analysis` - Dosha analysis and recommendations
- `get_mantra_suggestions` - Mantra suggestions
- `get_ritual_recommendations` - Spiritual ritual recommendations
- `get_wellness_advice` - Ayurvedic wellness advice
- `get_cosmic_guidance` - Spiritual and cosmic guidance

### Compatibility Functions
- `analyze_compatibility` - Compatibility analysis between two people
- `get_relationship_insights` - Detailed relationship insights
- `calculate_synastry` - Synastry chart calculation
- `get_compatibility_score` - Compatibility scoring
- `get_relationship_forecast` - Relationship forecasting
- `analyze_group_compatibility` - Group compatibility analysis

### External API Functions
- `get_weather_data` - Weather data for astrological readings
- `get_yoga_poses` - Yoga poses from external API
- `get_astrological_events` - Upcoming astrological events
- `get_crystal_recommendations` - Crystal recommendations
- `get_meditation_guidance` - Meditation guidance
- `get_ayurvedic_recommendations` - Ayurvedic recommendations
- `get_spiritual_guidance` - Spiritual guidance
- `get_energy_healing_techniques` - Energy healing techniques
- `get_moon_phase_guidance` - Moon phase guidance

## Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview

# Database Configuration (for future use)
MONGODB_URI=mongodb://localhost:27017/rraasi
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# External APIs (for function calling)
ASTROLOGY_API_KEY=NjQ0MTM1Ojc3ZGMyNjBkODk2YTkyYzQ1ZWU0MjM3ZTcwNWJiNDBjZGU5YzY3OTk=
WEATHER_API_KEY=your_weather_api_key
YOGAPOSE_API_KEY=your_yoga_api_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGIN=http://localhost:5173,https://rraasi-frontend.vercel.app

# Swiss Ephemeris
SWISS_EPHEMERIS_PATH=./ephemeris
```

## Development

### Scripts

```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint

# Build TypeScript (if using)
npm run build
```

### Project Structure

```
backend/
├── src/
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic and external services
│   │   └── functions/    # OpenAI function definitions
│   ├── middleware/       # Express middleware
│   ├── utils/           # Utility functions
│   └── server.js        # Main server file
├── logs/                # Log files
├── package.json
├── env.example
└── README.md
```

## API Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "confidence": 0.95,
  "sources": ["Astrological Analysis", "Swiss Ephemeris"],
  "astrologicalContext": {
    // Astrological context if applicable
  },
  "recommendations": [
    // Personalized recommendations
  ],
  "nextSteps": [
    // Suggested next steps
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling

The backend includes comprehensive error handling:

- **Validation Errors**: Invalid request data
- **Authentication Errors**: Unauthorized access
- **Rate Limiting**: Too many requests
- **Service Errors**: External service failures
- **System Errors**: Internal server errors

## Logging

Structured logging with Winston:

- **Error Logs**: `logs/error.log`
- **Combined Logs**: `logs/combined.log`
- **Console Output**: Development environment

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: API protection
- **Input Validation**: Request sanitization
- **Error Sanitization**: Safe error responses

## Future Enhancements

- [ ] Swiss Ephemeris integration for accurate calculations
- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] Redis caching for performance
- [ ] User authentication and authorization
- [ ] Real-time chat with Socket.IO
- [ ] File upload for chart images
- [ ] Payment integration
- [ ] Advanced analytics and reporting
- [ ] Multi-language support
- [ ] Webhook support for external integrations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. 