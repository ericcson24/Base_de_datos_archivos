const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// CORS middleware para desarrollo (permitir requests del frontend)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Routes
const authRoutes = require('./routes/auth');
const filesRoutes = require(path.join(__dirname, '..', 'server', 'routes', 'files'));
app.use('/api/auth', authRoutes);
app.use('/api/files', filesRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend funcionando correctamente' });
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});