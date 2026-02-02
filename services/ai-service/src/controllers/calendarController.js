const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../utils/database');
const { sendNotification } = require('../utils/notificationClient');
const dotenv = require('dotenv');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key_for_startup");

const createEvent = async (req, res) => {
  try {
    const { query, assignMode = 'me', targetUserId, groupId } = req.body;
    const userId = req.user.id; // Added via authenticateToken middleware

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Query vacío' });
    }

    console.log(`[AI CALENDAR] Usuario ${userId}: "${query}" [Asignar: ${assignMode}]`);

    // Prompt para Gemini para extraer información del evento
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0].slice(0, 5);

    const prompt = `Eres un asistente de calendario. Hoy es ${currentDate} y son las ${currentTime}.
El usuario dice: "${query}"

Extrae la información del evento y responde SOLO en formato JSON con esta estructura exacta:
{
  "title": "título del evento",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "description": "descripción breve",
  "success": true
}

Si el usuario menciona:
- "mañana" = día siguiente a ${currentDate}
- "pasado mañana" = dos días después de ${currentDate}
- "hora de comer" = 14:00-15:00
- "mediodía" = 12:00-13:00
- "tarde" = 17:00-18:00
- "mañana" (tiempo) = 09:00-10:00

Si no puedes extraer la información, responde:
{
  "success": false,
  "error": "No pude entender la información del evento"
}

Responde SOLO el JSON, sin texto adicional.`;

    // (Using gemini-flash-latest)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let aiResponse = response.text().trim();

    // Limpiar respuesta JSON (eliminar markdown si existe)
    aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let eventData;
    try {
      eventData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('[AI CALENDAR] Error parseando JSON:', aiResponse);
      return res.status(400).json({ 
        error: 'No pude interpretar tu solicitud de evento',
        aiResponse 
      });
    }

    if (!eventData.success) {
      return res.status(400).json({ 
        error: eventData.error || 'No pude crear el evento',
        aiResponse: eventData
      });
    }

    // Determinar el destino de la tarea
    let targetUserIds = [];
    
    if (assignMode === 'group' && groupId) {
      // Obtener miembros del grupo
      const groupResult = await db.query(
        'SELECT user_id FROM group_members WHERE group_id = $1',
        [groupId]
      );
      targetUserIds = groupResult.rows.map(row => row.user_id);
      
      if (targetUserIds.length === 0) {
        return res.status(400).json({ error: 'El grupo no tiene miembros' });
      }
    } else if (assignMode === 'user' && targetUserId) {
      targetUserIds = [targetUserId];
    } else {
      // Asignar a mí mismo
      targetUserIds = [userId];
    }

    // Añadir nota de creador si se asigna a otros
    let finalDescription = eventData.description || '';
    if (assignMode !== 'me') {
      // Obtener nombre del creador
      const creatorResult = await db.query(
        'SELECT username FROM users WHERE id = $1',
        [userId]
      );
      const creatorName = creatorResult.rows[0]?.username || 'Admin';
      finalDescription += `\n\n(Tarea creada por ${creatorName})`;
    }

    // Crear eventos para cada usuario
    const createdEvents = [];
    for (const targetId of targetUserIds) {
      const insertResult = await db.query(
        `INSERT INTO calendar_events (user_id, subject, body_preview, start_time, end_time, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [
          targetId,
          eventData.title,
          finalDescription,
          `${eventData.date}T${eventData.startTime}:00`,
          `${eventData.date}T${eventData.endTime}:00`
        ]
      );
      createdEvents.push(insertResult.rows[0]);

      // Notificar al usuario (via Redis -> Notification Service)
      try {
        await sendNotification({
          userId: targetId,
          title: '📅 Nuevo Evento Creado',
          message: `Evento "${eventData.title}" programado para el ${eventData.date} a las ${eventData.startTime}`,
          type: 'info',
          link: '/calendar',
          metadata: {
            eventId: insertResult.rows[0].id,
            date: eventData.date
          }
        });
      } catch (notifError) {
        console.error(`[AI CALENDAR] Error enviando notificación a ${targetId}:`, notifError);
      }
    }

    res.json({
        success: true,
        events: createdEvents,
        message: `Evento creado para ${targetUserIds.length} usuario(s)`
    });

  } catch (error) {
    console.error('[AI CALENDAR] Error:', error);
    res.status(500).json({ error: 'Error creating event', details: error.message });
  }
};

module.exports = {
    createEvent
};
