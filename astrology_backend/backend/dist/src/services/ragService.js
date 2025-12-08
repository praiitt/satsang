import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

class RAGService {
  constructor() {
    this.vectorStores = new Map(); // userId -> vectorStore
    this.embeddings = null; // Lazy initialization
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    // Persistent storage directory
    this.storageDir = path.join(process.cwd(), 'data', 'rag');
    this.ensureStorageDir();
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

  // Ensure storage directory exists
  async ensureStorageDir() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      logger.info('RAG storage directory ensured', { path: this.storageDir });
    } catch (error) {
      logger.error('Error creating storage directory:', error);
    }
  }

  // Get user storage file path
  getUserStoragePath(userId) {
    return path.join(this.storageDir, `${userId}.json`);
  }

  // Save vector store to disk
  async saveVectorStore(userId, vectorStore) {
    try {
      const filePath = this.getUserStoragePath(userId);
      const documents = await vectorStore.similaritySearch('', 10000); // Get all documents
      
      const dataToSave = {
        userId,
        documents: documents.map(doc => ({
          pageContent: doc.pageContent,
          metadata: doc.metadata
        })),
        timestamp: new Date().toISOString()
      };
      
      await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));
      logger.info('Vector store saved to disk', { userId, documentCount: documents.length });
    } catch (error) {
      logger.error('Error saving vector store:', error);
    }
  }

  // Load vector store from disk
  async loadVectorStore(userId) {
    try {
      const filePath = this.getUserStoragePath(userId);
      const data = await fs.readFile(filePath, 'utf8');
      const savedData = JSON.parse(data);
      
      const embeddings = await this.getEmbeddings();
      const vectorStore = new MemoryVectorStore(embeddings);
      
      // Recreate documents and add to vector store
      const documents = savedData.documents.map(doc => 
        new Document({
          pageContent: doc.pageContent,
          metadata: doc.metadata
        })
      );
      
      if (documents.length > 0) {
        await vectorStore.addDocuments(documents);
        logger.info('Vector store loaded from disk', { userId, documentCount: documents.length });
      }
      
      return vectorStore;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create new vector store
        logger.info('No existing vector store found, creating new one', { userId });
        const embeddings = await this.getEmbeddings();
        return new MemoryVectorStore(embeddings);
      }
      logger.error('Error loading vector store:', error);
      const embeddings = await this.getEmbeddings();
      return new MemoryVectorStore(embeddings);
    }
  }

  // Store user's astrological chart data
  async storeUserChartData(userId, chartData) {
    try {
      logger.info('Storing chart data for user', { userId, chartType: chartData.type });

      // Create or get vector store for this user
      let vectorStore = this.vectorStores.get(userId);
      if (!vectorStore) {
        vectorStore = await this.loadVectorStore(userId);
        this.vectorStores.set(userId, vectorStore);
      }

      // Convert chart data to documents
      const documents = this.createDocumentsFromChartData(chartData);
      
      // Add documents to vector store
      await vectorStore.addDocuments(documents);
      
      // Save to disk for persistence
      await this.saveVectorStore(userId, vectorStore);
      
      logger.info('Successfully stored chart data', { 
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
    
    // Handle different chart types based on actual API responses
    switch (chartData.type) {
      case 'astro_details':
        documents.push(new Document({
          pageContent: `Astrological Details:
          Sign: ${chartData.sign || 'N/A'}
          Ascendant: ${chartData.ascendant || 'N/A'}
          Ascendant Lord: ${chartData.ascendant_lord || 'N/A'}
          Nakshatra: ${chartData.Naksahtra || 'N/A'}
          Nakshatra Lord: ${chartData.NaksahtraLord || 'N/A'}
          Charan: ${chartData.Charan || 'N/A'}
          Yog: ${chartData.Yog || 'N/A'}
          Karan: ${chartData.Karan || 'N/A'}
          Tithi: ${chartData.Tithi || 'N/A'}
          Tatva: ${chartData.tatva || 'N/A'}
          Varna: ${chartData.Varna || 'N/A'}
          Vashya: ${chartData.Vashya || 'N/A'}
          Yoni: ${chartData.Yoni || 'N/A'}
          Gan: ${chartData.Gan || 'N/A'}
          Nadi: ${chartData.Nadi || 'N/A'}
          Sign Lord: ${chartData.SignLord || 'N/A'}
          Name Alphabet: ${chartData.name_alphabet || 'N/A'}
          Paya: ${chartData.paya || 'N/A'}`,
          metadata: {
            userId: chartData.userId,
            chartType: 'astro_details',
            timestamp: new Date().toISOString(),
            sign: chartData.sign,
            ascendant: chartData.ascendant,
            nakshatra: chartData.Naksahtra
          }
        }));
        break;

      case 'planets':
        // Handle array of planets from API
        if (Array.isArray(chartData)) {
          chartData.forEach(planet => {
            documents.push(new Document({
              pageContent: `Planetary Position:
              Planet: ${planet.name}
              Sign: ${planet.sign}
              Sign Lord: ${planet.signLord}
              House: ${planet.house}
              Full Degree: ${planet.fullDegree}
              Normalized Degree: ${planet.normDegree}
              Speed: ${planet.speed}
              Is Retrograde: ${planet.isRetro}
              Nakshatra: ${planet.nakshatra}
              Nakshatra Lord: ${planet.nakshatraLord}
              Nakshatra Pad: ${planet.nakshatra_pad}
              Planet Awastha: ${planet.planet_awastha}
              Is Planet Set: ${planet.is_planet_set}`,
              metadata: {
                userId: chartData.userId,
                chartType: 'planets',
                planet: planet.name,
                sign: planet.sign,
                house: planet.house,
                nakshatra: planet.nakshatra,
                timestamp: new Date().toISOString()
              }
            }));
          });
        }
        break;

      case 'horo_chart':
        // Handle horoscope chart data
        if (Array.isArray(chartData)) {
          chartData.forEach(house => {
            documents.push(new Document({
              pageContent: `House ${house.house_number || 'N/A'}:
              Sign: ${house.sign || 'N/A'}
              Lord: ${house.lord || 'N/A'}
              Degree: ${house.degree || 'N/A'}
              ${house.description || ''}`,
              metadata: {
                userId: chartData.userId,
                chartType: 'horo_chart',
                houseNumber: house.house_number,
                sign: house.sign,
                lord: house.lord,
                timestamp: new Date().toISOString()
              }
            }));
          });
        }
        break;

      case 'current_vdasha':
        // Handle Vimshottari Dasha data
        if (chartData.vdasha || chartData.main_dasha) {
          documents.push(new Document({
            pageContent: `Current Vimshottari Dasha:
              Main Dasha: ${chartData.main_dasha || chartData.vdasha?.main_dasha || 'N/A'}
              Sub Dasha: ${chartData.sub_dasha || chartData.vdasha?.sub_dasha || 'N/A'}
              Period: ${chartData.period || chartData.vdasha?.period || 'N/A'}
              ${chartData.description || chartData.vdasha?.description || ''}`,
            metadata: {
              userId: chartData.userId,
              chartType: 'current_vdasha',
              mainDasha: chartData.main_dasha || chartData.vdasha?.main_dasha,
              subDasha: chartData.sub_dasha || chartData.vdasha?.sub_dasha,
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

  // Retrieve relevant chart data for a query
  async retrieveRelevantCharts(userId, query, limit = 5) {
    try {
      logger.info('Retrieving relevant charts for query', { userId, query });

      const vectorStore = this.vectorStores.get(userId);
      if (!vectorStore) {
        // Try to load from disk
        const loadedStore = await this.loadVectorStore(userId);
        if (loadedStore) {
          this.vectorStores.set(userId, loadedStore);
        } else {
          logger.warn('No chart data found for user', { userId });
          return { success: false, charts: [], message: 'No chart data available' };
        }
      }

      const currentStore = this.vectorStores.get(userId);
      if (!currentStore) {
        logger.warn('No chart data found for user', { userId });
        return { success: false, charts: [], message: 'No chart data available' };
      }

      // Search for relevant documents
      const results = await currentStore.similaritySearch(query, limit);
      
      // Group results by chart type
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

      logger.info('Retrieved relevant charts', { 
        userId, 
        query, 
        resultCount: results.length,
        chartTypes: Object.keys(chartsByType)
      });

      return {
        success: true,
        charts: chartsByType,
        totalResults: results.length,
        query: query
      };
    } catch (error) {
      logger.error('Error retrieving charts:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all chart data for a user
  async getAllUserCharts(userId) {
    try {
      let vectorStore = this.vectorStores.get(userId);
      if (!vectorStore) {
        vectorStore = await this.loadVectorStore(userId);
        if (vectorStore) {
          this.vectorStores.set(userId, vectorStore);
        }
      }

      if (!vectorStore) {
        return { success: false, charts: [], message: 'No chart data available' };
      }

      // Get all documents (this is a simplified approach)
      // In production, you'd want to implement proper pagination
      const results = await vectorStore.similaritySearch('', 1000);
      
      const chartsByType = {};
      results.forEach(doc => {
        const chartType = doc.metadata.chartType;
        if (!chartsByType[chartType]) {
          chartsByType[chartType] = [];
        }
        chartsByType[chartType].push({
          content: doc.pageContent,
          metadata: doc.metadata
        });
      });

      return {
        success: true,
        charts: chartsByType,
        totalCharts: results.length
      };
    } catch (error) {
      logger.error('Error getting all user charts:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete user's chart data
  async deleteUserCharts(userId) {
    try {
      this.vectorStores.delete(userId);
      
      // Delete from disk
      const filePath = this.getUserStoragePath(userId);
      try {
        await fs.unlink(filePath);
        logger.info('Deleted user chart file from disk', { userId });
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logger.error('Error deleting user chart file:', error);
        }
      }
      
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
      if (this.vectorStores.has(userId)) {
        return true;
      }
      
      // Check disk
      const filePath = this.getUserStoragePath(userId);
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const ragService = new RAGService(); 