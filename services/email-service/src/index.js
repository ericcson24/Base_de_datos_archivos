require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5007;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Configuración del transporte (SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER || 'tu_correo@gmail.com',
    pass: process.env.SMTP_PASS || 'tu_contraseña_app'
  }
});

// Middleware de autenticación simple (solo interno o con token)
const authenticate = (req, res, next) => {
  // En una arquitectura real, esto debería validar un token de servicio a servicio
  // Por ahora, permitimos acceso si viene de la red interna o tiene un header específico
  // Simplificado para este ejemplo
  next();
};

app.post('/send', authenticate, async (req, res) => {
  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Sistema de Gestión'}" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: html,
    });

    console.log('Message sent: %s', info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, message: 'Error enviando email' });
  }
});

app.get('/', (req, res) => {
  res.send('Email Service is running');
});

app.listen(PORT, () => {
  console.log(`Email Service running on port ${PORT}`);
});