const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    // Unterstütze sowohl MONGO_URI als auch MONGODB_URI
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      logger.error('MONGO_URI oder MONGODB_URI ist nicht definiert in .env');
      throw new Error('MONGO_URI or MONGODB_URI environment variable is required');
    }
    
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 Sekunden Timeout
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB Verbindungsfehler: ${error.message}`);
    throw error; // Re-throw für Scripts
  }
};

module.exports = connectDB;
