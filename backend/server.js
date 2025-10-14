const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cookieParser());

// Configurar sesiones
app.use(session({
  secret: 'your-secret-key-here', // En producción, usar variable de entorno
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // En producción con HTTPS, cambiar a true
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
  }
}));

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
const adminRoutes = require('../server/routes/admin');
const filesRoutes = require(path.join(__dirname, '..', 'server', 'routes', 'files'));
app.use('/api/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/api/files', filesRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend funcionando correctamente' });
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});