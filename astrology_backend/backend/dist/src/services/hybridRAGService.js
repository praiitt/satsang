import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';
import { logger } from '../utils/logger.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

class HybridRAGService {
  constructor() {
    this.vectorStores = new Map(); // userId -> vectorStore
    this.embeddings = null; // Lazy initialization
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    this.dbPath = path.join(process.cwd(), 'data', 'astrology.db');
    this.initDatabase();
  }

  // Lazy initialization of embeddings
  async getEmbeddings() {
    if (!this.embeddings) {
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.embeddings;
  }

  // Initialize SQLite database
  async initDatabase() {
    try {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Create tables
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE NOT NULL,
          name TEXT,
          email TEXT,
          birth_data TEXT,
          preferences TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS chart_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          chart_type TEXT NOT NULL,
          chart_data TEXT NOT NULL,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES user_profiles (user_id)
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS chart_documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          chart_type TEXT NOT NULL,
          document_content TEXT NOT NULL,
          document_metadata TEXT,
          embedding_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES user_profiles (user_id)
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          contact_name TEXT NOT NULL,
          contact_user_id TEXT,
          birth_data TEXT,
          chart_data TEXT,
          relationship_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES user_profiles (user_id)
        )
      `);

      // Create indexes for better performance
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_chart_data_user_type 
        ON chart_data (user_id, chart_type)
      `);

      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_chart_documents_user_type 
        ON chart_documents (user_id, chart_type)
      `);

      logger.info('Database initialized successfully', { dbPath: this.dbPath });
    } catch (error) {
      logger.error('Error initializing database:', error);
    }
  }

  // Store user profile in database
  async storeUserProfile(userId, userData) {
    try {
      const birthDataJson = JSON.stringify(userData.birthData);
      const preferencesJson = userData.preferences ? JSON.stringify(userData.preferences) : null;

      await this.db.run(`
        INSERT OR REPLACE INTO user_profiles 
        (user_id, name, email, birth_data, preferences, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, userData.name, userData.email, birthDataJson, preferencesJson]);

      logger.info('User profile stored in database', { userId });
      return { success: true };
    } catch (error) {
      logger.error('Error storing user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Update specific user profile fields
  async updateUserProfile(userId, updates) {
    try {
      // Get current profile
      const currentProfile = await this.getUserProfile(userId);
      
      logger.info('Current profile:', { userId, currentProfile });
      logger.info('Updates:', { userId, updates });
      
      if (!currentProfile) {
        // If no profile exists, create one
        return await this.storeUserProfile(userId, { userId, ...updates });
      }

      // Merge current profile with updates
      const mergedProfile = { ...currentProfile, ...updates };
      
      logger.info('Merged profile:', { userId, mergedProfile });

      // Use storeUserProfile to save the merged data
      return await this.storeUserProfile(userId, mergedProfile);
    } catch (error) {
      logger.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Store chart data in database
  async storeChartData(userId, chartData) {
    try {
      const chartDataJson = JSON.stringify(chartData);
      const metadataJson = JSON.stringify({
        userId,
        chartType: chartData.type,
        timestamp: new Date().toISOString()
      });

      await this.db.run(`
        INSERT INTO chart_data (user_id, chart_type, chart_data, metadata)
        VALUES (?, ?, ?, ?)
      `, [userId, chartData.type, chartDataJson, metadataJson]);

      logger.info('Chart data stored in database', { userId, chartType: chartData.type });
      return { success: true };
    } catch (error) {
      logger.error('Error storing chart data:', error);
      return { success: false, error: error.message };
    }
  }

  // Store document in database for RAG
  async storeDocument(userId, document) {
    try {
      const metadataJson = JSON.stringify(document.metadata);

      await this.db.run(`
        INSERT INTO chart_documents (user_id, chart_type, document_content, document_metadata)
        VALUES (?, ?, ?, ?)
      `, [userId, document.metadata.chartType, document.pageContent, metadataJson]);

      logger.info('Document stored in database', { userId, chartType: document.metadata.chartType });
      return { success: true };
    } catch (error) {
      logger.error('Error storing document:', error);
      return { success: false, error: error.message };
    }
  }

  // Store user's astrological chart data (hybrid approach)
  async storeUserChartData(userId, chartData) {
    try {
      logger.info('Storing chart data using hybrid approach', { userId, chartType: chartData.type });

      // 1. Store in database (persistent storage)
      const dbResult = await this.storeChartData(userId, chartData);
      if (!dbResult.success) {
        return dbResult;
      }

      // 2. Create documents for RAG
      const documents = this.createDocumentsFromChartData(chartData);
      
      // 3. Store documents in database
      for (const doc of documents) {
        await this.storeDocument(userId, doc);
      }

      // 4. Add to in-memory vector store for fast access
      let vectorStore = this.vectorStores.get(userId);
      if (!vectorStore) {
        const embeddings = await this.getEmbeddings();
        vectorStore = new MemoryVectorStore(embeddings);
        this.vectorStores.set(userId, vectorStore);
      }
      await vectorStore.addDocuments(documents);

      logger.info('Successfully stored chart data using hybrid approach', { 
        userId, 
        chartType: chartData.type, 
        documentCount: documents.length 
      });

      return { success: true, documentCount: documents.length };
    } catch (error) {
      logger.error('Error storing chart data:', error);
      return { success: false, error: error.message };
    }
  }

  // Create documents from chart data
  createDocumentsFromChartData(chartData) {
    const documents = [];
    
    // Handle different chart types
    switch (chartData.type) {
      case 'astro_details':
        documents.push(new Document({
          pageContent: `Astrological Details for ${chartData.name || 'User'}:
          Sun Sign: ${chartData.sun_sign || 'N/A'}
          Moon Sign: ${chartData.moon_sign || 'N/A'}
          Ascendant: ${chartData.ascendant || 'N/A'}
          Birth Date: ${chartData.birth_date || 'N/A'}
          Birth Time: ${chartData.birth_time || 'N/A'}
          Birth Place: ${chartData.birth_place || 'N/A'}
          ${chartData.details || ''}`,
          metadata: {
            userId: chartData.userId,
            chartType: 'astro_details',
            timestamp: new Date().toISOString(),
            sunSign: chartData.sun_sign,
            moonSign: chartData.moon_sign,
            ascendant: chartData.ascendant
          }
        }));
        break;

      case 'planets':
        if (chartData.planets) {
          chartData.planets.forEach(planet => {
            documents.push(new Document({
              pageContent: `Planetary Position:
              Planet: ${planet.name}
              Sign: ${planet.sign}
              House: ${planet.house}
              Degree: ${planet.degree}
              Status: ${planet.status || 'N/A'}
              ${planet.description || ''}`,
              metadata: {
                userId: chartData.userId,
                chartType: 'planets',
                planet: planet.name,
                sign: planet.sign,
                house: planet.house,
                timestamp: new Date().toISOString()
              }
            }));
          });
        }
        break;

      case 'horo_chart':
        // Handle hora chart with numbered houses (0-11)
        const houses = [];
        for (let i = 0; i < 12; i++) {
          if (chartData[i]) {
            houses.push({
              house_number: i + 1,
              sign: chartData[i].sign_name,
              planets: chartData[i].planet || [],
              planet_small: chartData[i].planet_small || []
            });
          }
        }
        
        houses.forEach(house => {
          const planetList = house.planets.length > 0 ? house.planets.join(', ') : 'No planets';
          documents.push(new Document({
            pageContent: `House ${house.house_number} (${house.sign}):
            Planets: ${planetList}
            House represents: ${this.getHouseMeaning(house.house_number)}`,
            metadata: {
              userId: chartData.userId,
              chartType: 'horo_chart',
              houseNumber: house.house_number,
              sign: house.sign,
              planets: house.planets,
              timestamp: new Date().toISOString()
            }
          }));
        });
        break;

      case 'current_vdasha':
        if (chartData.vdasha) {
          documents.push(new Document({
            pageContent: `Current Vimshottari Dasha:
              Main Dasha: ${chartData.vdasha.main_dasha || 'N/A'}
              Sub Dasha: ${chartData.vdasha.sub_dasha || 'N/A'}
              Period: ${chartData.vdasha.period || 'N/A'}
              ${chartData.vdasha.description || ''}`,
            metadata: {
              userId: chartData.userId,
              chartType: 'current_vdasha',
              mainDasha: chartData.vdasha.main_dasha,
              subDasha: chartData.vdasha.sub_dasha,
              timestamp: new Date().toISOString()
            }
          }));
        }
        break;

      case 'kalsarpa_details':
        documents.push(new Document({
          pageContent: `KalSarpa Dosha Analysis:
            Type: ${chartData.kalsarpa_type || 'N/A'}
            Present: ${chartData.is_present ? 'Yes' : 'No'}
            ${chartData.description || ''}`,
          metadata: {
            userId: chartData.userId,
            chartType: 'kalsarpa_details',
            kalsarpaType: chartData.kalsarpa_type,
            isPresent: chartData.is_present,
            timestamp: new Date().toISOString()
          }
        }));
        break;

      default:
        // Generic chart data
        documents.push(new Document({
          pageContent: JSON.stringify(chartData, null, 2),
          metadata: {
            userId: chartData.userId,
            chartType: chartData.type,
            timestamp: new Date().toISOString()
          }
        }));
    }

    return documents;
  }

  // Retrieve relevant chart data for a query (hybrid approach)
  async retrieveRelevantCharts(userId, query, limit = 5) {
    try {
      logger.info('Retrieving relevant charts using hybrid approach', { userId, query });

      // 1. Try to get from in-memory vector store first (fastest)
      let vectorStore = this.vectorStores.get(userId);
      
      if (!vectorStore) {
        // 2. Load from database and rebuild vector store
        vectorStore = await this.loadVectorStoreFromDatabase(userId);
        if (vectorStore) {
          this.vectorStores.set(userId, vectorStore);
        }
      }

      if (!vectorStore) {
        logger.warn('No chart data found for user', { userId });
        return { success: false, charts: [], message: 'No chart data available' };
      }

      // 3. Search for relevant documents
      const results = await vectorStore.similaritySearch(query, limit);
      
      // 4. Group results by chart type
      const chartsByType = {};
      results.forEach(doc => {
        const chartType = doc.metadata.chartType;
        if (!chartsByType[chartType]) {
          chartsByType[chartType] = [];
        }
        chartsByType[chartType].push({
          content: doc.pageContent,
          metadata: doc.metadata,
          score: doc.score
        });
      });

      logger.info('Retrieved relevant charts using hybrid approach', { 
        userId, 
        query, 
        resultCount: results.length,
        chartTypes: Object.keys(chartsByType)
      });

      return {
        success: true,
        charts: chartsByType,
        totalResults: results.length,
        query: query,
        source: 'Hybrid RAG'
      };
    } catch (error) {
      logger.error('Error retrieving charts:', error);
      return { success: false, error: error.message };
    }
  }

  // Load vector store from database
  async loadVectorStoreFromDatabase(userId) {
    try {
      const documents = await this.db.all(`
        SELECT document_content, document_metadata
        FROM chart_documents
        WHERE user_id = ?
        ORDER BY created_at DESC
      `, [userId]);

      if (documents.length === 0) {
        return null;
      }

      const embeddings = await this.getEmbeddings();
      const vectorStore = new MemoryVectorStore(embeddings);
      
      // Recreate documents and add to vector store
      const docs = documents.map(doc => {
        const metadata = JSON.parse(doc.document_metadata);
        return new Document({
          pageContent: doc.document_content,
          metadata: metadata
        });
      });

      if (docs.length > 0) {
        await vectorStore.addDocuments(docs);
        logger.info('Vector store loaded from database', { userId, documentCount: docs.length });
      }

      return vectorStore;
    } catch (error) {
      logger.error('Error loading vector store from database:', error);
      return null;
    }
  }

  // Get all chart data for a user from database
  async getAllUserCharts(userId) {
    try {
      const charts = await this.db.all(`
        SELECT chart_type, chart_data, metadata, created_at
        FROM chart_data
        WHERE user_id = ?
        ORDER BY created_at DESC
      `, [userId]);

      if (charts.length === 0) {
        return { success: false, charts: [], message: 'No chart data available' };
      }

      const chartsByType = {};
      charts.forEach(chart => {
        const chartType = chart.chart_type;
        if (!chartsByType[chartType]) {
          chartsByType[chartType] = [];
        }
        chartsByType[chartType].push({
          data: JSON.parse(chart.chart_data),
          metadata: JSON.parse(chart.metadata),
          createdAt: chart.created_at
        });
      });

      return {
        success: true,
        charts: chartsByType,
        totalCharts: charts.length
      };
    } catch (error) {
      logger.error('Error getting all user charts:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user profile from database
  async getUserProfile(userId) {
    try {
      const profile = await this.db.get(`
        SELECT * FROM user_profiles WHERE user_id = ?
      `, [userId]);

      logger.info('Raw profile from database:', { userId, profile });

      if (!profile) {
        return null;
      }

      const result = {
        userId: profile.user_id,
        name: profile.name,
        email: profile.email,
        birthData: profile.birth_data ? JSON.parse(profile.birth_data) : null,
        preferences: profile.preferences ? JSON.parse(profile.preferences) : null,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      };

      logger.info('Parsed profile:', { userId, result });

      return result;
    } catch (error) {
      logger.error('Error getting user profile:', error);
      return null;
    }
  }

  // Delete user's chart data
  async deleteUserCharts(userId) {
    try {
      // Delete from in-memory store
      this.vectorStores.delete(userId);

      // Delete from database
      await this.db.run('DELETE FROM chart_data WHERE user_id = ?', [userId]);
      await this.db.run('DELETE FROM chart_documents WHERE user_id = ?', [userId]);
      await this.db.run('DELETE FROM user_profiles WHERE user_id = ?', [userId]);

      logger.info('Deleted chart data for user', { userId });
      return { success: true };
    } catch (error) {
      logger.error('Error deleting user charts:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if user has chart data
  async hasUserCharts(userId) {
    try {
      const count = await this.db.get(`
        SELECT COUNT(*) as count FROM chart_data WHERE user_id = ?
      `, [userId]);

      return count.count > 0;
    } catch (error) {
      logger.error('Error checking user charts:', error);
      return false;
    }
  }

  // Get database statistics
  async getDatabaseStats() {
    try {
      const userCount = await this.db.get('SELECT COUNT(*) as count FROM user_profiles');
      const chartCount = await this.db.get('SELECT COUNT(*) as count FROM chart_data');
      const documentCount = await this.db.get('SELECT COUNT(*) as count FROM chart_documents');

      return {
        users: userCount.count,
        charts: chartCount.count,
        documents: documentCount.count
      };
    } catch (error) {
      logger.error('Error getting database stats:', error);
      return null;
    }
  }

  // Import existing chart data into RAG system
  async importExistingChartsToRAG(userId) {
    try {
      logger.info('Importing existing charts to RAG system', { userId });
      
      // Get all chart data from database
      const charts = await this.getAllUserCharts(userId);
      
      if (!charts.success || !charts.charts) {
        logger.warn('No charts found for user', { userId });
        return { success: false, error: 'No charts found' };
      }

      let importedCount = 0;
      
      // Process each chart type
      for (const [chartType, chartData] of Object.entries(charts.charts)) {
        if (chartData && chartData.length > 0) {
          const chart = chartData[0]; // Get the first chart of this type
          
          // Check if documents already exist for this chart type
          const existingDocs = await this.db.all(`
            SELECT COUNT(*) as count FROM chart_documents 
            WHERE user_id = ? AND chart_type = ?
          `, [userId, chartType]);
          
          if (existingDocs[0].count === 0) {
            // No documents exist, create them
            logger.info('Creating RAG documents for chart type', { userId, chartType });
            
            const documents = this.createDocumentsFromChartData({
              ...chart.data,
              userId,
              type: chartType
            });
            
            // Store documents in database
            for (const doc of documents) {
              await this.storeDocument(userId, doc);
            }
            
            // Add to vector store
            let vectorStore = this.vectorStores.get(userId);
            if (!vectorStore) {
              const embeddings = await this.getEmbeddings();
              vectorStore = new MemoryVectorStore(embeddings);
              this.vectorStores.set(userId, vectorStore);
            }
            await vectorStore.addDocuments(documents);
            
            importedCount += documents.length;
            logger.info('Successfully imported chart type to RAG', { userId, chartType, documentCount: documents.length });
          } else {
            logger.info('Documents already exist for chart type', { userId, chartType });
          }
        }
      }
      
      logger.info('Completed importing existing charts to RAG', { userId, importedCount });
      return { success: true, importedCount };
      
    } catch (error) {
      logger.error('Error importing existing charts to RAG:', error);
      return { success: false, error: error.message };
    }
  }

  // Get astrological meaning for each house
  getHouseMeaning(houseNumber) {
    const houseMeanings = {
      1: 'Self, personality, physical appearance, and first impressions',
      2: 'Wealth, family, speech, and material possessions',
      3: 'Siblings, courage, short journeys, and communication',
      4: 'Mother, home, property, and emotional foundation',
      5: 'Children, intelligence, creativity, and romance',
      6: 'Health, enemies, obstacles, and service to others',
      7: 'Marriage, partnerships, and business relationships',
      8: 'Longevity, transformation, and occult knowledge',
      9: 'Religion, higher education, and long-distance travel',
      10: 'Career, profession, and social status',
      11: 'Gains, income, and fulfillment of desires',
      12: 'Losses, expenses, spirituality, and foreign lands'
    };
    return houseMeanings[houseNumber] || 'Astrological house';
  }

  // Store user contact with birth data and chart information
  async storeUserContact(userId, contactData) {
    try {
      const birthDataJson = JSON.stringify(contactData.birthData);
      const chartDataJson = JSON.stringify(contactData.chartData || {});

      await this.db.run(`
        INSERT OR REPLACE INTO user_contacts 
        (user_id, contact_name, contact_user_id, birth_data, chart_data, relationship_type, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        userId,
        contactData.name,
        contactData.contactUserId || null,
        birthDataJson,
        chartDataJson,
        contactData.relationshipType || 'friend'
      ]);

      logger.info('User contact stored successfully', { userId, contactName: contactData.name });
      return { success: true };
    } catch (error) {
      logger.error('Error storing user contact:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's contacts
  async getUserContacts(userId) {
    try {
      const contacts = await this.db.all(`
        SELECT * FROM user_contacts 
        WHERE user_id = ?
        ORDER BY created_at DESC
      `, [userId]);

      const parsedContacts = contacts.map(contact => ({
        ...contact,
        birthData: contact.birth_data ? JSON.parse(contact.birth_data) : null,
        chartData: contact.chart_data ? JSON.parse(contact.chart_data) : null
      }));

      logger.info('Retrieved user contacts', { userId, contactCount: parsedContacts.length });
      return { success: true, contacts: parsedContacts };
    } catch (error) {
      logger.error('Error getting user contacts:', error);
      return { success: false, error: error.message };
    }
  }

  // Get specific contact by name
  async getContactByName(userId, contactName) {
    try {
      const contact = await this.db.get(`
        SELECT * FROM user_contacts 
        WHERE user_id = ? AND contact_name = ?
      `, [userId, contactName]);

      if (contact) {
        return {
          success: true,
          contact: {
            ...contact,
            birthData: contact.birth_data ? JSON.parse(contact.birth_data) : null,
            chartData: contact.chart_data ? JSON.parse(contact.chart_data) : null
          }
        };
      }

      return { success: false, error: 'Contact not found' };
    } catch (error) {
      logger.error('Error getting contact by name:', error);
      return { success: false, error: error.message };
    }
  }

  // Update contact's chart data
  async updateContactChartData(userId, contactName, chartData) {
    try {
      const chartDataJson = JSON.stringify(chartData);

      await this.db.run(`
        UPDATE user_contacts 
        SET chart_data = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND contact_name = ?
      `, [chartDataJson, userId, contactName]);

      logger.info('Contact chart data updated', { userId, contactName });
      return { success: true };
    } catch (error) {
      logger.error('Error updating contact chart data:', error);
      return { success: false, error: error.message };
    }
  }
}

export const hybridRAGService = new HybridRAGService(); 