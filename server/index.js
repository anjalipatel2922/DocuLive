
const dns = require('dns');
dns.setServers(['8.8.8.8']);

const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '.env')
});

const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const documentationRoutes = require('./routes/documentationRoutes');
const githubWebhookRoutes = require('./routes/githubWebhookRoutes');

const app = express();

// Middleware
app.use(cors());

app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/api/github-webhook')) {
      req.rawBody = Buffer.from(buf);
    }
  }
}));

// API routes
app.use('/api/documentation', documentationRoutes);
app.use('/api/github-webhook', githubWebhookRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('DocuLive backend is running');
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB before starting the server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start DocuLive backend:', error.message);
    process.exit(1);
  }
};

startServer();
