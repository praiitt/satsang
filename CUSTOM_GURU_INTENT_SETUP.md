# Custom Guru Intent Form - Setup & Security Rules

## Overview

The Custom Guru Interest Form allows users to describe their ideal spiritual guide. Responses are stored in Firestore for validation before building the full custom guru feature.

## Firestore Collection

- **Collection Name**: `customGuruIntents`
- **Document Structure**:
  ```typescript
  {
    idealGuruDescription: string;      // Required: User's description
    currentNeeds?: string;               // Optional: What they're seeking
    styleTags?: string[];                // Optional: Quick preferences
    contactEmail?: string;               // Optional: For follow-up
    canContact: boolean;                 // Consent to be contacted
    language: 'en' | 'hi';              // UI language at submission
    userId?: string | null;              // User ID if logged in
    createdAt: Timestamp;               // Server timestamp
  }
  ```

## Security Rules

The `firestore.rules` file contains security rules that:

- ✅ Allow **create** operations (anyone can submit, including anonymous users)
- ❌ Block **read** operations (no client-side reads for privacy)
- ❌ Block **update** operations (no modifications)
- ❌ Block **delete** operations (no deletions)

### Deploying Rules

```bash
firebase deploy --only firestore:rules
```

Or use the Firebase Console:

1. Go to Firebase Console → Firestore Database → Rules
2. Copy the contents of `firestore.rules`
3. Paste and publish

## Reviewing Submissions

Access submissions via:

1. **Firebase Console**: Firestore Database → `customGuruIntents` collection
2. **Firebase Admin SDK**: Use `lib/firebase-admin.ts` for programmatic access

## Next Steps

After collecting enough data:

1. Review common patterns in `idealGuruDescription` and `styleTags`
2. Cluster similar requests to identify new guru archetypes
3. Build custom guru generation feature based on insights
4. Contact users who provided emails when feature is ready
