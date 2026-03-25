require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const apiRoutes = require('./src/routes/api');

const app = express();
const port = process.env.PORT || 3000;

// Security & Parsing Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Relax for local development (fonts, icons)
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRoutes);

// Main Dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health Check
app.get('/health', (req, res) => res.json({ status: 'OK', uptime: process.uptime() }));

app.listen(port, '0.0.0.0', () => {
  console.log(`--- Farmer Voice Backend is Running ---`);
  console.log(`Port: ${port}`);
  console.log(`Network: http://10.146.186.148:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'Development'}`);
});
