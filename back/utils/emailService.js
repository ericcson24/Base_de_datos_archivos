const nodemailer = require('nodemailer');

// Configuración del transporte (SMTP)
// En producción, usar variables de entorno
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER || 'tu_correo@gmail.com',
    pass: process.env.SMTP_PASS || 'tu_contraseña_app'
  }
});

async function sendEmail(to, subject, html) {
  if (!to) {
    console.error('No recipient email provided');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Sistema de Gestión" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: html,
    });

    console.log('Message sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

module.exports = { sendEmail };
