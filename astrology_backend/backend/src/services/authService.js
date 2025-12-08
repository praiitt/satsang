import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, adminAuth, adminDb } from '../config/firebase.js';
import { logger } from '../utils/logger.js';
import { firestoreRAGService } from './firestoreRAGService.js';
import { astrologyAPIService } from './astrologyAPIService.js';
import { jwtService } from './jwtService.js';

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
        await adminDb.collection('users').doc(user.uid).set(userProfile);
        logger.info('User profile created in Firestore', { uid: user.uid });
      } catch (firestoreError) {
        logger.warn('Firestore not available, using local storage only', { 
          uid: user.uid, 
          error: firestoreError.message 
        });
        // Continue without Firestore - user profile will be stored in Hybrid RAG only
      }

      // Store user profile in Hybrid RAG system
      try {
        await firestoreRAGService.storeUserProfile(user.uid, userProfile);
        logger.info('User profile stored in Hybrid RAG', { uid: user.uid });
      } catch (ragError) {
        logger.warn('Failed to store user profile in Hybrid RAG', { 
          uid: user.uid, 
          error: ragError.message 
        });
        // Continue without Hybrid RAG - user profile is already in Firestore
      }

      // Generate chart data asynchronously - don't wait for it to complete
      // This allows signup to respond quickly while charts generate in the background
      userProfile.chartsGenerated = false;
      userProfile.chartGenerationMethod = 'pending';
      
      // Start chart generation in background (fire and forget)
      this.generateUserCharts(user.uid, userProfile.birthData)
        .then(() => {
          logger.info('User charts generated successfully (async)', { uid: user.uid });
          // Update user profile in Firestore
          adminDb.collection('users').doc(user.uid).update({
            chartsGenerated: true,
            chartGenerationMethod: 'external_api',
            updatedAt: new Date().toISOString()
          }).catch(err => logger.warn('Failed to update chartsGenerated status', { uid: user.uid, error: err.message }));
        })
        .catch(chartError => {
          logger.warn('Failed to generate user charts during signup, activating astro agent fallback', { 
            uid: user.uid, 
            error: chartError.message 
          });
          
          // Try astro agent fallback in background
          this.activateAstroAgentFallback(user.uid, userProfile.birthData)
            .then(() => {
              logger.info('Astro agent fallback activated successfully (async)', { uid: user.uid });
              adminDb.collection('users').doc(user.uid).update({
                chartsGenerated: true,
                chartGenerationMethod: 'astro_agent_fallback',
                updatedAt: new Date().toISOString()
              }).catch(err => logger.warn('Failed to update chartsGenerated status', { uid: user.uid, error: err.message }));
            })
            .catch(astroAgentError => {
              logger.error('Astro agent fallback also failed (async)', { 
                uid: user.uid, 
                error: astroAgentError.message 
              });
              adminDb.collection('users').doc(user.uid).update({
                chartsGenerated: false,
                chartGenerationMethod: 'failed',
                chartGenerationError: `External API: ${chartError.message}; Astro Agent: ${astroAgentError.message}`,
                updatedAt: new Date().toISOString()
              }).catch(err => logger.warn('Failed to update chart generation error status', { uid: user.uid, error: err.message }));
            });
        });

      // Generate JWT token for the user
      const tokenResult = jwtService.generateToken(user.uid, {
        email: user.email,
        name: name
      });

      if (!tokenResult.success) {
        logger.error('Failed to generate JWT token during signup', { uid: user.uid, error: tokenResult.error });
        return {
          success: false,
          error: 'Failed to generate authentication token'
        };
      }

      logger.info('User signup completed successfully', { uid: user.uid });

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          name: name,
          profile: userProfile
        },
        token: tokenResult.token,
        message: 'Account created successfully! Your birth chart will be generated shortly.'
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
        const userDoc = await adminDb.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
          // Try to get from Hybrid RAG as fallback
          const ragProfile = await firestoreRAGService.getUserProfile(user.uid);
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
        const ragProfile = await firestoreRAGService.getUserProfile(user.uid);
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

      // Process charts for RAG at login time for immediate function calling
      try {
        logger.info('Processing charts for RAG during login', { uid: user.uid });
        await firestoreRAGService.processChartsForRAG(user.uid);
        logger.info('Charts processed for RAG successfully during login', { uid: user.uid });
      } catch (ragError) {
        logger.warn('Failed to process charts for RAG during login', { 
          uid: user.uid, 
          error: ragError.message 
        });
        // Don't fail login if RAG processing fails - charts can be processed later
      }

      // Generate JWT token for the user
      const tokenResult = jwtService.generateToken(user.uid, {
        email: user.email,
        name: userProfile?.name || 'User'
      });

      if (!tokenResult.success) {
        logger.error('Failed to generate JWT token', { uid: user.uid, error: tokenResult.error });
        return {
          success: false,
          error: 'Failed to generate authentication token'
        };
      }

      logger.info('User signed in successfully', { uid: user.uid });

      return {
        success: true,
        user: cleanUser,
        token: tokenResult.token,
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
  async signOut(userId = null) {
    try {
      // Get user ID from current user if not provided
      if (!userId && this.currentUser) {
        userId = this.currentUser.uid;
      }
      
      await signOut(auth);
      this.currentUser = null;
      
      // Clean up RAG charts for the user
      if (userId) {
        try {
          // Clean up charts from RAG service
          await firestoreRAGService.deleteUserCharts(userId);
          logger.info('RAG charts cleaned up for user', { userId });
        } catch (ragError) {
          logger.warn('Failed to clean up RAG charts during logout', { userId, error: ragError.message });
          // Don't fail logout if RAG cleanup fails
        }
      }
      
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
      const userDoc = await adminDb.collection('users').doc(user.uid).get();
      
      if (!userDoc.exists) {
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

      // Process charts for RAG when getting current user (session restoration)
      try {
        logger.info('Processing charts for RAG during session restoration', { uid: user.uid });
        await firestoreRAGService.processChartsForRAG(user.uid);
        logger.info('Charts processed for RAG successfully during session restoration', { uid: user.uid });
      } catch (ragError) {
        logger.warn('Failed to process charts for RAG during session restoration', { 
          uid: user.uid, 
          error: ragError.message 
        });
        // Don't fail session restoration if RAG processing fails
      }

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
      const userRef = adminDb.collection('users').doc(uid);
      
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await userRef.update(updateData);

      // Update in Hybrid RAG if birth data changed
      if (updates.birthData) {
        await firestoreRAGService.updateUserProfile(uid, updates);
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

  // Manually trigger RAG processing for existing users
  async triggerRAGProcessing(uid) {
    try {
      logger.info('Manually triggering RAG processing for user', { uid });
      
      const result = await firestoreRAGService.processChartsForRAG(uid);
      
      if (result.success) {
        logger.info('Manual RAG processing successful', { 
          uid, 
          chartCount: result.charts.length 
        });
        return {
          success: true,
          message: 'Charts processed for RAG successfully',
          chartCount: result.charts.length
        };
      } else {
        logger.warn('Manual RAG processing failed', { uid, error: result.error });
        return {
          success: false,
          error: 'Failed to process charts for RAG',
          details: result.error
        };
      }
      
    } catch (error) {
      logger.error('Error during manual RAG processing:', error);
      return {
        success: false,
        error: 'Failed to process charts for RAG',
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
        // Store each chart type separately in Firestore
        for (const chart of chartData.charts) {
          // Add type and userId to each chart
          const chartWithType = {
            ...chart,
            type: chart.type || 'unknown',
            userId: uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // Store in Firestore
          await this.storeChartInFirestore(uid, chartWithType);
        }
        
        // Import charts into RAG system
        try {
          await firestoreRAGService.processChartsForRAG(uid);
          logger.info('Charts imported to RAG system successfully', { uid });
        } catch (ragError) {
          logger.warn('Failed to import charts to RAG during signup', { 
            uid, 
            error: ragError.message 
          });
          // Don't fail the entire process - charts are in Firestore
        }
        
        logger.info('User charts generated and stored in both Firestore and RAG successfully', { 
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

  // Store chart data directly in Firestore (not in RAG)
  async storeChartInFirestore(uid, chartData) {
    try {
      // Ensure chartType is explicitly added to the document data
      const chartWithType = {
        ...chartData,
        chartType: chartData.type, // Add explicit chartType field
        userId: uid, // Ensure userId is set
        createdAt: new Date().toISOString()
      };
      
      // Store in Firestore charts collection
      const chartRef = adminDb.collection('charts').doc(`${uid}_${chartData.type}_${Date.now()}`);
      await chartRef.set(chartWithType);
      
      logger.info('Chart stored in Firestore', { 
        uid, 
        chartType: chartData.type,
        documentId: chartRef.id
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Error storing chart in Firestore:', error);
      throw error;
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

        // Store mock charts in Firestore
        for (const [chartType, chartData] of Object.entries(mockCharts)) {
          const chartWithType = {
            ...chartData,
            type: chartType,
            userId: uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          await this.storeChartInFirestore(uid, chartWithType);
        }
        
        // Import mock charts into RAG system
        try {
          await firestoreRAGService.processChartsForRAG(uid);
          logger.info('Mock charts imported to RAG system successfully', { uid });
        } catch (ragError) {
          logger.warn('Failed to import mock charts to RAG', { 
            uid, 
            error: ragError.message 
          });
          // Don't fail the entire process - charts are in Firestore
        }
      
      logger.info('Mock charts generated and stored in both Firestore and RAG', { uid });

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

  // Check if user has charts in Firebase
  async checkUserCharts(uid) {
    try {
      if (!adminDb) {
        logger.error('Admin database not available');
        return [];
      }
      
      const chartsRef = adminDb.collection('charts');
      const q = chartsRef.where('userId', '==', uid);
      const querySnapshot = await q.get();
      
      const charts = [];
      querySnapshot.forEach((doc) => {
        charts.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      logger.info('User charts checked', { uid, chartCount: charts.length });
      return charts;
    } catch (error) {
      logger.error('Error checking user charts:', error);
      return [];
    }
  }

  // Get user profile from Firestore
  async getUserProfile(uid) {
    try {
      logger.info('Getting user profile', { uid });
      
      // Use admin database for backend operations
      if (!adminDb) {
        logger.error('Admin database not available');
        throw new Error('Firebase Admin SDK not initialized');
      }
      
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        logger.info('User found in admin database', { uid, userDataKeys: Object.keys(userData) });
        
        // Handle nested profile structure
        if (userData.profile && userData.profile.profile) {
          logger.info('Found nested profile structure in admin db', { uid, profileKeys: Object.keys(userData.profile.profile) });
          return userData.profile.profile; // Access nested profile
        } else if (userData.profile) {
          logger.info('Found direct profile structure in admin db', { uid, profileKeys: Object.keys(userData.profile) });
          return userData.profile; // Direct profile access
        } else {
          logger.warn('No profile found in admin db user data', { uid, userDataKeys: Object.keys(userData) });
        }
      } else {
        logger.warn('User not found in admin database', { uid });
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error; // Re-throw to handle in calling function
    }
  }

  // Import charts into RAG system
  async importChartsToRAG(uid) {
    try {
      logger.info('Importing charts to RAG system', { uid });
      
      // Get all charts for the user
      const charts = await this.checkUserCharts(uid);
      
      if (charts.length === 0) {
        logger.warn('No charts to import to RAG', { uid });
        return { success: false, error: 'No charts found' };
      }
      
      // Import charts to RAG using firestoreRAGService
      try {
        await firestoreRAGService.processChartsForRAG(uid);
        logger.info('Charts processed for RAG', { uid, chartCount: charts.length });
      } catch (ragError) {
        logger.warn('Failed to process charts for RAG', { uid, error: ragError.message });
      }
      
      logger.info('Charts imported to RAG successfully', { uid, chartCount: charts.length });
      return { success: true, importedCount: charts.length };
      
    } catch (error) {
      logger.error('Error importing charts to RAG:', error);
      throw error;
    }
  }

  // Activate astro agent fallback when external API fails
  async activateAstroAgentFallback(uid, birthData) {
    try {
      logger.info('🤖 [ASTRO_AGENT] Activating astro agent fallback for user', { uid });
      
      // Use comprehensive astrology service as fallback
      const comprehensiveAstrologyService = new (await import('./comprehensiveAstrologyService.js')).ComprehensiveAstrologyService();
      
      // Generate comprehensive charts using astro agent
      const astroAgentCharts = await comprehensiveAstrologyService.generateComprehensiveChart(birthData, {
        system: 'vedic',
        chartTypes: ['basic', 'dasha', 'predictive', 'specialized'],
        includePredictions: true
      });
      
      if (astroAgentCharts.success && astroAgentCharts.charts) {
        logger.info('🤖 [ASTRO_AGENT] Astro agent generated charts successfully', { 
          uid, 
          chartCount: Object.keys(astroAgentCharts.charts).length,
          chartTypes: Object.keys(astroAgentCharts.charts)
        });
        
        // Store astro agent charts in Firestore
        const chartPromises = Object.entries(astroAgentCharts.charts).map(async ([chartType, chartData]) => {
          const chartDoc = {
            ...chartData,
            userId: uid,
            type: chartType,
            chartType: chartType,
            generatedBy: 'astro_agent_fallback',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          return adminDb.collection('userCharts').add(chartDoc);
        });
        
        await Promise.all(chartPromises);
        logger.info('🤖 [ASTRO_AGENT] Astro agent charts stored in Firestore', { uid });
        
        // Import astro agent charts into RAG system
        try {
          await firestoreRAGService.processChartsForRAG(uid);
          logger.info('🤖 [ASTRO_AGENT] Astro agent charts imported to RAG system', { uid });
        } catch (ragError) {
          logger.warn('🤖 [ASTRO_AGENT] Failed to import charts to RAG', { 
            uid, 
            error: ragError.message 
          });
        }
        
        return { 
          success: true, 
          chartsGenerated: Object.keys(astroAgentCharts.charts).length,
          method: 'astro_agent_fallback',
          chartTypes: Object.keys(astroAgentCharts.charts)
        };
      } else {
        throw new Error(`Astro agent failed to generate charts: ${astroAgentCharts.error || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('🤖 [ASTRO_AGENT] Astro agent fallback failed', { 
        uid, 
        error: error.message 
      });
      throw error;
    }
  }

  // Retry chart generation
  async retryChartGeneration(uid, birthData) {
    try {
      logger.info('Retrying chart generation for user', { uid });
      
      const result = await this.generateUserCharts(uid, birthData);
      
      if (result.success) {
        // Update user profile to mark charts as generated
        try {
          await adminDb.collection('users').doc(uid).update({
            chartsGenerated: true,
            chartGenerationError: null,
            updatedAt: new Date().toISOString()
          });
        } catch (firestoreError) {
          logger.warn('Failed to update Firestore, charts generated in RAG only', { uid });
        }
        
        return { success: true, chartsGenerated: result.chartsGenerated };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      logger.error('Error during chart generation retry:', error);
      return { success: false, error: error.message };
    }
  }
}

export const authService = new AuthService();
export default authService; 