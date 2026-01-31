# Suno Webhook for Dance Meditation Tracks

The meditation agent generates tracks with a special category flag that routes them to a separate collection.

## Category Flag: `dance_meditation`

When the meditation agent calls Suno API, it uses:
```
callback_url = .../suno/callback?userId={userId}&category=dance_meditation
```

## Webhook Behavior

The Suno webhook should detect the `category=dance_meditation` flag and:

1. **Save to `dance_trans` collection** instead of `music_tracks`
2. Include meditation-specific metadata:
   - `musicCategory`: "Meditation"
   - `healingBenefits`: Array of benefits
   - `tags`: Include "meditation", "dance", "healing"
   - `bpm`: Target BPM (60-120 range)

## Implementation Example

```typescript
// In suno webhook handler
const category = req.query.category || 'rraasi_music';

if (category === 'dance_meditation') {
  // Save to dance_trans collection
  await db.collection('dance_trans').doc(taskId).set({
    ...trackData,
    category: 'dance_meditation',
    createdAt: FieldValue.serverTimestamp()
  });
} else {
  // Regular music tracks go to music_tracks
  await db.collection('music_tracks').doc(taskId).set({
    ...trackData,
    category: 'rraasi_music',
    createdAt: FieldValue.serverTimestamp()
  });
}
```

## Collections

- **`music_tracks`**: Regular user-generated music (bhajans, healing frequencies, etc.)
- **`dance_trans`**: Dance meditation tracks specifically created during meditation sessions
  - Tagged with meditation intention
  - BPM optimized for meditation (60-120)
  - Instrumental-focused
  - Healing frequency emphasis

## Query Examples

```typescript
// Get all dance meditation tracks
const meditationTracks = await db
  .collection('dance_trans')
  .where('category', '==', 'dance_meditation')
  .where('status', '==', 'COMPLETED')
  .get();

// Get meditation tracks by mood
const peacefulTracks = await db
  .collection('dance_trans')
  .where('tags', 'array-contains', 'peaceful')
  .get();
```

## Migration Notes

If you need to migrate existing meditation tracks:
```typescript
// Move tracks from music_tracks to dance_trans
const meditationTracks = await db
  .collection('music_tracks')
  .where('category', '==', 'meditation_music')
  .get();

for (const doc of meditationTracks.docs) {
  const data = doc.data();
  await db.collection('dance_trans').doc(doc.id).set({
    ...data,
    category: 'dance_meditation'
  });
  await doc.ref.delete();
}
```
