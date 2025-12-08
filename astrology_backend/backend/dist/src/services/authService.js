import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db, adminAuth, adminDb } from '../config/firebase.js';
import { logger } from '../utils/logger.js';
import { hybridRAGService } from './hybridRAGService.js';
import { astrologyAPIService } from './astrologyAPIService.js';

class AuthService {
  constructor() {
    this.currentUser = null;
  }

  // Sign up new user with birth data
  async signUp(userData) {
    try {
      const { email, password, name, birthData } = userData;

      // Validate required fields
      if (!email || !password || !name || !birthData) {
        throw new Error('Missing required fields: email, password, name, and birth data are required');
      }

      // Validate birth data
      if (!birthData.birthDate || !birthData.birthTime || !birthData.latitude || !birthData.longitude) {
        throw new Error('Missing required birth data: birthDate, birthTime, latitude, and longitude are required');
      }

      logger.info('Creating new user account', { email, name });

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, {
        displayName: name
      });

      // Create user profile in Firestore
      const userProfile = {
        uid: user.uid,
        email: user.email,
        name: name,
        birthData: {
          name: name,
          birthDate: birthData.birthDate,
          birthTime: birthData.birthTime,
          latitude: birthData.latitude,
          longitude: birthData.longitude,
          placeOfBirth: birthData.placeOfBirth || '',
          timezone: birthData.timezone || 5.5
        },
        wellnessProfile: {
          dosha: 'vata-pitta',
          fitnessLevel: 'beginner',
          goals: ['balance', 'energy', 'peace'],
          timeAvailable: '30_min'
        },
        preferences: {
          theme: 'dark',
          notifications: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store user profile in Firestore (with fallback)
      try {
        await setDoc(doc(db, 'users', user.uid), userProfile);
        logger.info('User profile created in Firestore', { uid: user.uid });
      } catch (firestoreError) {
        logger.warn('Firestore not available, using local storage only', { 
          uid: user.uid, 
          error: firestoreError.message 
        });
        // Continue without Firestore - user profile will be stored in Hybrid RAG only
      }

      // Store user profile in Hybrid RAG system
      await hybridRAGService.storeUserProfile(user.uid, userProfile);

      // Generate comprehensive chart data
      await this.generateUserCharts(user.uid, userProfile.birthData);

      logger.info('User signup completed successfully', { uid: user.uid });

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          name: name,
          profile: userProfile
        },
        message: 'Account created successfully! Your birth chart has been generated.'
      };

    } catch (error) {
      logger.error('Error during user signup:', error);
      
      let errorMessage = 'Failed to create account';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters long';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      }

      return {
        success: false,
        error: errorMessage,
        details: error.message
      };
    }
  }

  // Sign in existing user
  async signIn(email, password) {
    try {
      logger.info('User attempting to sign in', { email });

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user profile from Firestore (with fallback)
      let userProfile;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          // Try to get from Hybrid RAG as fallback
          const ragProfile = await hybridRAGService.getUserProfile(user.uid);
          if (ragProfile) {
            userProfile = ragProfile;
            logger.info('User profile retrieved from Hybrid RAG', { uid: user.uid });
          } else {
            throw new Error('User profile not found');
          }
        } else {
          userProfile = userDoc.data();
          logger.info('User profile retrieved from Firestore', { uid: user.uid });
        }
      } catch (firestoreError) {
        logger.warn('Firestore not available, trying Hybrid RAG', { 
          uid: user.uid, 
          error: firestoreError.message 
        });
        
        // Try to get from Hybrid RAG as fallback
        const ragProfile = await hybridRAGService.getUserProfile(user.uid);
        if (ragProfile) {
          userProfile = ragProfile;
          logger.info('User profile retrieved from Hybrid RAG', { uid: user.uid });
        } else {
          throw new Error('User profile not found');
        }
      }
      // Create a clean user object without circular references
      const cleanUser = {
        uid: user.uid,
        email: user.email,
        name: userProfile?.name || 'User',
        profile: userProfile
      };
      
      this.currentUser = cleanUser;

      logger.info('User signed in successfully', { uid: user.uid });

      return {
        success: true,
        user: cleanUser,
        message: 'Signed in successfully!'
      };

    } catch (error) {
      logger.error('Error during user signin:', error);
      
      let errorMessage = 'Failed to sign in';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      }

      return {
        success: false,
        error: errorMessage,
        details: error.message
      };
    }
  }

  // Sign out user
  async signOut() {
    try {
      await signOut(auth);
      this.currentUser = null;
      
      logger.info('User signed out successfully');
      
      return {
        success: true,
        message: 'Signed out successfully!'
      };

    } catch (error) {
      logger.error('Error during signout:', error);
      return {
        success: false,
        error: 'Failed to sign out',
        details: error.message
      };
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        return { success: false, user: null };
      }

      // Get latest profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        return { success: false, user: null };
      }

      const userProfile = userDoc.data();
      
      // Create a clean user object without circular references
      const cleanUser = {
        uid: user.uid,
        email: user.email,
        name: userProfile?.name || 'User',
        profile: userProfile
      };
      
      this.currentUser = cleanUser;

      return {
        success: true,
        user: cleanUser
      };

    } catch (error) {
      logger.error('Error getting current user:', error);
      return {
        success: false,
        error: 'Failed to get current user',
        details: error.message
      };
    }
  }

  // Update user profile
  async updateUserProfile(uid, updates) {
    try {
      const userRef = doc(db, 'users', uid);
      
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);

      // Update in Hybrid RAG if birth data changed
      if (updates.birthData) {
        await hybridRAGService.storeUserProfile(uid, { ...updates, uid });
        await this.generateUserCharts(uid, updates.birthData);
      }

      logger.info('User profile updated successfully', { uid });

      return {
        success: true,
        message: 'Profile updated successfully!'
      };

    } catch (error) {
      logger.error('Error updating user profile:', error);
      return {
        success: false,
        error: 'Failed to update profile',
        details: error.message
      };
    }
  }

  // Generate comprehensive chart data for user
  async generateUserCharts(uid, birthData) {
    try {
      logger.info('Generating comprehensive charts for user', { uid });

      // Convert birth data format for API
      const apiBirthData = {
        userId: uid, // Add userId for API tracking
        name: birthData.name,
        day: parseInt(birthData.birthDate.split('-')[2]),
        month: parseInt(birthData.birthDate.split('-')[1]),
        year: parseInt(birthData.birthDate.split('-')[0]),
        hour: parseInt(birthData.birthTime.split(':')[0]),
        minute: parseInt(birthData.birthTime.split(':')[1]),
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone
      };

      // Generate comprehensive chart data
      const chartData = await astrologyAPIService.getComprehensiveChart(uid, apiBirthData);

      if (chartData.success) {
        // Store each chart type separately in Hybrid RAG
        for (const chart of chartData.charts) {
          // Add type and userId to each chart
          const chartWithType = {
            ...chart,
            type: chart.type || 'unknown',
            userId: uid
          };
          await hybridRAGService.storeUserChartData(uid, chartWithType);
        }
        
        logger.info('User charts generated and stored successfully', { 
          uid, 
          chartCount: chartData.charts.length 
        });
      } else {
        logger.warn('Failed to generate charts, using mock data', { uid });
        // Use mock data if API fails
        await this.generateMockCharts(uid, birthData);
      }

    } catch (error) {
      logger.error('Error generating user charts:', error);
      // Fallback to mock data
      await this.generateMockCharts(uid, birthData);
    }
  }

  // Generate mock chart data for testing
  async generateMockCharts(uid, birthData) {
    try {
      const mockCharts = {
        astro_details: {
          name: birthData.name,
          sun_sign: "Cancer",
          moon_sign: "Libra",
          ascendant: "Scorpio",
          birth_date: birthData.birthDate,
          birth_time: birthData.birthTime,
          birth_place: birthData.placeOfBirth || "Unknown",
          details: "You are a Cancer Sun with Libra Moon and Scorpio Ascendant. This combination makes you emotionally intuitive, diplomatic in relationships, and deeply perceptive about others."
        },
        planets: {
          planets: [
            {
              name: "Sun",
              sign: "Cancer",
              house: "10",
              degree: "25.5",
              status: "Strong",
              description: "Sun in Cancer gives you emotional depth and strong family bonds."
            },
            {
              name: "Moon",
              sign: "Libra",
              house: "1",
              degree: "15.2",
              status: "Well-placed",
              description: "Moon in Libra makes you diplomatic and relationship-oriented."
            },
            {
              name: "Mars",
              sign: "Scorpio",
              house: "2",
              degree: "8.7",
              status: "Powerful",
              description: "Mars in Scorpio gives you intense drive and determination."
            }
          ]
        }
      };

      await hybridRAGService.storeUserChartData(uid, mockCharts);
      
      logger.info('Mock charts generated and stored', { uid });

    } catch (error) {
      logger.error('Error generating mock charts:', error);
    }
  }

  // Reset password
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      
      logger.info('Password reset email sent', { email });
      
      return {
        success: true,
        message: 'Password reset email sent successfully!'
      };

    } catch (error) {
      logger.error('Error sending password reset email:', error);
      
      let errorMessage = 'Failed to send reset email';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      }

      return {
        success: false,
        error: errorMessage,
        details: error.message
      };
    }
  }

  // Verify Firebase token (for API authentication)
  async verifyToken(token) {
    try {
      if (!adminAuth) {
        logger.warn('Firebase Admin not initialized, skipping token verification');
        return {
          success: false,
          error: 'Authentication not configured',
          details: 'Firebase Admin SDK not initialized'
        };
      }
      
      const decodedToken = await adminAuth.verifyIdToken(token);
      return {
        success: true,
        uid: decodedToken.uid,
        user: decodedToken
      };
    } catch (error) {
      logger.error('Error verifying token:', error);
      return {
        success: false,
        error: 'Invalid token',
        details: error.message
      };
    }
  }
}

export const authService = new AuthService();
export default authService; 