const dns = require('dns');
dns.setServers(['8.8.8.8']);
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const documentationRoutes = require('./routes/documentationRoutes');
const githubWebhookRoutes = require('./routes/githubWebhookRoutes');

const app = express();

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/api/github-webhook')) {
      req.rawBody = Buffer.from(buf);
    }
  }
}));
app.use('/api/documentation', documentationRoutes);
app.use('/api/github-webhook', githubWebhookRoutes);

app.get('/', (req, res) => {
  res.send('DocuLive backend is running');
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

// Test: verify GitHub webhook to AI documentation workflow.