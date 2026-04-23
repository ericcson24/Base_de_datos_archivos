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

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'tu_correo@gmail.com',
    pass: process.env.SMTP_PASS || 'tu_contraseña_app'
  }
});

const authenticate = (req, res, next) => {
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