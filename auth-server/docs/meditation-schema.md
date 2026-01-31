# Firestore Collections Schema for RRAASI Meditation

## meditation_sessions

Tracks individual meditation sessions completed by users.

```typescript
{
  id: string (auto-generated)
  userId: string
  intention: string // User's stated intention
  mood_before: string // peaceful | stressed | joyful | tired
  mood_after?: string // Same options, filled post-session
  musicUsed: string[] // Array of track IDs from music_tracks
  generatedMusic: boolean // True if music was created for this session
  duration: number // Seconds
  completedAt: timestamp
  agentGuided: boolean // True if AI agent guided
  notes?: string // Optional user reflection
}
```

**Indexes:**
- `userId` (for user history queries)
- `completedAt` (descending, for recent sessions)

**Security Rules:**
```javascript
match /meditation_sessions/{sessionId} {
  allow read: if request.auth != null && 
              resource.data.userId == request.auth.uid;
  allow create: if request.auth != null &&
               request.resource.data.userId == request.auth.uid;
}
```

## meditation_playlists

Curated playlists for different meditation types.

```typescript
{
  id: string (auto-generated)
  name: string
  description: string
  sessionType: 'morning' | 'evening' | 'celebration' | 'deep'
  trackIds: string[] // References to music_tracks
  duration: number // Total minutes
  bpmRange: {
    min: number
    max: number
  }
  createdBy: string // 'official' or userId
  isOfficial: boolean
  isPublic: boolean
  createdAt: timestamp
}
```

**Indexes:**
- `sessionType`
- `isOfficial`
- `isPublic, createdAt` (composite)

**Security Rules:**
```javascript
match /meditation_playlists/{playlistId} {
  allow read: if request.auth != null &&
              (resource.data.isPublic == true ||
               resource.data.createdBy == request.auth.uid);
  allow create: if request.auth != null &&
                request.resource.data.createdBy == request.auth.uid;
}
```

## meditation_tutorials

Educational content for learning dance meditation.

```typescript
{
  id: string (auto-generated)
  title: string
  description: string
  level: 'beginner' | 'intermediate' | 'advanced'
  videoUrl?: string // Optional video
  thumbnailUrl: string
  duration: number // Minutes
  relatedPlaylistId?: string
  tags: string[]
  content: string // Markdown content
  order: number // For progression
  createdAt: timestamp
  publishedAt?: timestamp
  isPublished: boolean
}
```

**Indexes:**
- `level, order` (composite, for progressive learning)
- `isPublished`

**Security Rules:**
```javascript
match /meditation_tutorials/{tutorialId} {
  allow read: if request.auth != null &&
              resource.data.isPublished == true;
}
```

## meditation_challenges

Community meditation challenges.

```typescript
{
  id: string (auto-generated)
  name: string
  description: string
  durationType: '7-day' | '21-day' | '30-day'
  startDate: timestamp
  endDate: timestamp
  requiredSessions: number
  participantCount: number
  createdBy: string
  isActive: boolean
}
```

## meditation_challenge_progress

User progress in challenges.

```typescript
{
  id: string (auto-generated)
  userId: string
  challengeId: string
  sessionsCompleted: number
  currentStreak: number
  joinedAt: timestamp
  completedAt?: timestamp
  isCompleted: boolean
}
```

---

## Migration Script

To create these collections with initial data:

```python
from google.cloud import firestore

db = firestore.Client(project='rraasi-8a619')

# Create official meditation playlists
official_playlists = [
    {
        'name': 'Morning Energy',
        'description': 'Uplifting dance meditation to start your day',
        'sessionType': 'morning',
        'trackIds': [],  # To be populated
        'duration': 25,
        'bpmRange': {'min': 100, 'max': 120},
        'createdBy': 'official',
        'isOfficial': True,
        'isPublic': True,
        'createdAt': firestore.SERVER_TIMESTAMP
    },
    {
        'name': 'Evening Release',
        'description': 'Gentle flow to release the day',
        'sessionType': 'evening',
        'trackIds': [],
        'duration': 20,
        'bpmRange': {'min': 80, 'max': 100},
        'createdBy': 'official',
        'isOfficial': True,
        'isPublic': True,
        'createdAt': firestore.SERVER_TIMESTAMP
    }
]

for playlist in official_playlists:
    db.collection('meditation_playlists').add(playlist)
```
