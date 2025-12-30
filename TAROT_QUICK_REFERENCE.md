# 🔮 Tarot Agent - Quick Reference

## 🚀 Quick Start

```bash
# Terminal 1: Start Backend
cd livekit_server/agent-starter-python
uv run python src/tarot_agent.py dev

# Terminal 2: Start Frontend
cd /Users/prakash/Documents/satsang/satsangapp
npm run dev

# Browser: Open
http://localhost:3001/tarot
```

---

## ✨ Features

### 1. General Readings (3-Card Spread)
**User says**: "I want a love reading"
**Result**: 3 cards (Past, Present, Future)
**Topics**: Love, Career, Finance

### 2. Yes/No Questions (NEW!)
**User says**: "Will I get the job?"
**Result**: Single card with YES/NO/UNCLEAR badge
**Badge Colors**:
- 🟢 YES ✓ (Green)
- 🔴 NO ✗ (Red)
- 🟣 UNCLEAR ? (Purple)

---

## 📝 What Changed

### Backend
1. **tarot_agent.py**: Added `get_yes_no_answer()` function
2. **astrology_api_client.py**: Added `get_yes_no_tarot()` method

### Frontend
3. **tarot-table.tsx**: Added yes/no event handler + badges

**Total**: ~134 lines added

---

## 🧪 Test Commands

```bash
# Test API
uv run python scripts/verify_tarot_api.py

# Start Agent
uv run python src/tarot_agent.py dev

# Start Frontend
npm run dev
```

---

## 🎯 Test Scenarios

### ✅ General Reading
1. Click "Begin Reading"
2. Say: "I want a career reading"
3. Expect: 3 cards appear
4. Verify: Past, Present, Future labels

### ✅ Yes/No Question
1. Click "Begin Reading"
2. Say: "Will I get promoted?"
3. Expect: 1 card with badge
4. Verify: YES/NO/UNCLEAR badge shows

### ✅ Language Switch
1. Switch to Hindi
2. Start session
3. Verify: Hindi greeting
4. Verify: Hindi UI

---

## 🔧 Environment Variables

```bash
# Required in .env.local
OPENAI_API_KEY=sk-...
CARTESIA_API_KEY=...
SARVAM_API_KEY=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://...
ASTROLOGY_API_USER_ID=...
ASTROLOGY_API_KEY=...
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Badge not showing | Check card.meaning includes "YES:", "NO:", or "UNCLEAR:" |
| API returns null | Verify ASTROLOGY_API credentials |
| Cards not appearing | Check LiveKit connection |
| Agent not responding | Check backend logs |

---

## 📊 Status

- ✅ Backend: Complete
- ✅ Frontend: Complete
- ⏳ Testing: In Progress
- ⏳ Deployment: Pending

---

## 🎉 Ready!

Your Tarot agent is ready for testing with both general readings and yes/no questions!

**Next**: Test locally, then deploy to production.
