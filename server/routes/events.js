const express = require('express');
const { Client } = require('@microsoft/microsoft-graph-client');
const router = express.Router();

function getAuthenticatedClient(accessToken) {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });
}



// Función CORREGIDA - Sumar 2 horas a lo que devuelve Graph
function convertToSpainTime(dateStr, isAllDay = false) {
  if (!dateStr) return null;
  if (isAllDay) return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;

  // Limpiar milisegundos
  let cleanDate = dateStr;
  if (cleanDate.includes('.')) cleanDate = cleanDate.split('.')[0];

  // Si ya tiene Z o +02:00, no tocar
  if (cleanDate.endsWith('Z') || /\+\d{2}:\d{2}$/.test(cleanDate)) return cleanDate;

  // Sumar 2 horas y devolver con offset explícito
  const date = new Date(cleanDate);
  date.setHours(date.getHours() + 2);

  // Formatear como ISO y añadir offset de Madrid (verano: +02:00)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // DEVOLVER SIEMPRE CON OFFSET
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+02:00`;
}

// Función CORREGIDA para convertir desde España a UTC para envío
function convertFromSpainTime(dateStr, timeStr = null, isAllDay = false) {
  if (isAllDay) {
    // Para eventos de todo el día, enviar en formato de fecha
    return {
      date: dateStr,
      timeZone: 'Europe/Madrid'
    };
  }

  // Para eventos con hora - enviar directamente con zona horaria España
  const fullDateStr = timeStr ? `${dateStr}T${timeStr}:00` : dateStr;
  console.log('📤 Enviando a Graph con zona España:', fullDateStr);

  return {
    dateTime: fullDateStr,
    timeZone: 'Europe/Madrid'  // Usar zona horaria España en lugar de UTC
  };
}

// GET - Obtener todas las categorías de Outlook
router.get('/categories', async (req, res) => {
  try {
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    console.log('🏷️ Obteniendo categorías de Outlook...');
    const client = getAuthenticatedClient(req.session.accessToken);

    const categoriesResponse = await client
      .api('/me/outlook/masterCategories')
      .get();

    console.log(`📊 Categorías encontradas: ${categoriesResponse.value.length}`);

    const formattedCategories = categoriesResponse.value.map(category => ({
      id: category.id,
      name: category.displayName,
      color: category.color,
      hexColor: getOutlookCategoryColor(category.color)
    }));

    res.json(formattedCategories);

  } catch (error) {
    console.error('❌ Error obteniendo categorías:', error);

    if (error.statusCode === 401) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST - Crear nueva categoría en Outlook
router.post('/categories', async (req, res) => {
  try {
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }

    console.log('🏷️ Creando nueva categoría:', { name, color });
    const client = getAuthenticatedClient(req.session.accessToken);

    const newCategory = {
      displayName: name,
      color: color || 'preset0'
    };

    const createdCategory = await client
      .api('/me/outlook/masterCategories')
      .post(newCategory);

    const formattedCategory = {
      id: createdCategory.id,
      name: createdCategory.displayName,
      color: createdCategory.color,
      hexColor: getOutlookCategoryColor(createdCategory.color)
    };

    console.log('✅ Categoría creada:', formattedCategory);
    res.status(201).json(formattedCategory);

  } catch (error) {
    console.error('❌ Error creando categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Función para convertir colores de Outlook a hexadecimal
function getOutlookCategoryColor(outlookColor) {
  const colorMap = {
    'preset0': '#ff1a1a',   // Rojo
    'preset1': '#ff8c00',   // Naranja
    'preset2': '#8b4513',   // Marrón
    'preset3': '#ffd700',   // Amarillo
    'preset4': '#32cd32',   // Verde
    'preset5': '#008080',   // Turquesa
    'preset6': '#326acb',   // Azul
    'preset7': '#800080',   // Púrpura
    'preset8': '#c0c0c0',   // Gris
    'preset9': '#696969',   // Gris oscuro
    'preset10': '#dc143c',  // Crimson
    'preset11': '#ff69b4',  // Rosa
    'preset12': '#4169e1',  // Azul real
    'preset13': '#228b22',  // Verde bosque
    'preset14': '#ff4500',  // Rojo naranja
    'preset15': '#9932cc',  // Orquídea oscura
    'preset16': '#8b0000',  // Rojo oscuro
    'preset17': '#556b2f',  // Verde oliva oscuro
    'preset18': '#2f4f4f',  // Gris pizarra oscuro
    'preset19': '#b22222',  // Ladrillo
    'preset20': '#8fbc8f',  // Verde marino oscuro
    'preset21': '#483d8b',  // Azul pizarra oscuro
    'preset22': '#2e8b57',  // Verde marino
    'preset23': '#800000',  // Granate
    'preset24': '#9acd32'   // Verde amarillo
  };

  return colorMap[outlookColor] || '#4285f4';
}
// GET - Obtener eventos de Outlook (TODOS los calendarios)
router.get('/', async (req, res) => {
  try {
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    const { start, end } = req.query;
    console.log('Obteniendo eventos de TODOS los calendarios para:', req.session.account.username);
    console.log('Rango de fechas solicitado:', start, 'a', end);

    const client = getAuthenticatedClient(req.session.accessToken);

    let allEvents = [];

    try {
      // PASO 1: Obtener TODOS los calendarios disponibles
      console.log('🗂️ Obteniendo lista de calendarios...');

      const calendarsResponse = await client
        .api('/me/calendars')
        .select('id,name,color,canEdit,owner')
        .get();

      console.log(`📅 Calendarios encontrados: ${calendarsResponse.value.length}`);
      calendarsResponse.value.forEach((calendar, index) => {
        console.log(`${index + 1}. "${calendar.name}" (ID: ${calendar.id}) - Owner: ${calendar.owner?.name || 'N/A'}`);
      });

      // PASO 2: Obtener eventos de CADA calendario
      for (const calendar of calendarsResponse.value) {
        console.log(`\n🔍 Obteniendo eventos del calendario: "${calendar.name}"`);

        try {
          let calendarEvents = [];

          // MÉTODO 1: Intentar con filtro de fechas
          if (start && end) {
            console.log(`📅 Método 1: Con filtro de fechas para "${calendar.name}"`);
            try {
              const startISO = new Date(start).toISOString();
              const endISO = new Date(end).toISOString();

              console.log(`📅 Fechas ISO: ${startISO} a ${endISO}`);

              let nextUrl = null;
              let currentPage = 1;

              do {
                console.log(`📄 Calendario "${calendar.name}" - Página ${currentPage} (con filtro)...`);

                let query;
                if (nextUrl) {
                  query = client.api(nextUrl);
                  console.log(`📄 Usando nextUrl: ${nextUrl}`);
                } else {
                  const filter = `start/dateTime ge '${startISO}' and start/dateTime le '${endISO}'`;
                  console.log(`📄 Filtro: ${filter}`);

                  query = client
                    .api(`/me/calendars/${calendar.id}/events`)
                    .select('id,subject,start,end,location,bodyPreview,attendees,isAllDay,categories,showAs,importance') // Añadir importance
                    .filter(filter)
                    .orderby('start/dateTime')
                    .top(999); // Máximo permitido por Microsoft Graph
                }

                const response = await query.get();
                console.log(`📄 Página ${currentPage}: ${response.value.length} eventos`);

                if (response.value.length > 0) {
                  const eventsWithCalendarInfo = response.value.map(event => ({
                    ...event,
                    calendarName: calendar.name,
                    calendarId: calendar.id,
                    calendarColor: calendar.color,
                    calendarOwner: calendar.owner?.name || 'N/A'
                  }));

                  calendarEvents = calendarEvents.concat(eventsWithCalendarInfo);
                }

                nextUrl = response['@odata.nextLink'];
                console.log(`📄 NextUrl: ${nextUrl ? 'Existe' : 'No existe'}`);
                currentPage++;

                // Límite de seguridad aumentado
                if (currentPage > 50) {
                  console.warn(`⚠️ Límite de páginas alcanzado para calendario "${calendar.name}" (${currentPage})`);
                  break;
                }

              } while (nextUrl);

            } catch (filterError) {
              console.error(`❌ Error con filtro en "${calendar.name}":`, filterError.message);
              calendarEvents = []; // Resetear para intentar método 2
            }
          }

          // MÉTODO 2: Si no hay filtro o falló el filtro, obtener TODOS los eventos
          if (calendarEvents.length === 0) {
            console.log(`📅 Método 2: Sin filtro para "${calendar.name}" - obteniendo TODOS los eventos`);

            let nextUrl = null;
            let currentPage = 1;

            do {
              console.log(`📄 Calendario "${calendar.name}" - Página ${currentPage} (sin filtro)...`);

              let query;
              if (nextUrl) {
                query = client.api(nextUrl);
              } else {
                query = client
                  .api(`/me/calendars/${calendar.id}/events`)
                  .select('id,subject,start,end,location,bodyPreview,attendees,isAllDay,categories,showAs')
                  .orderby('start/dateTime')
                  .top(999);
              }

              const response = await query.get();
              console.log(`📄 Página ${currentPage}: ${response.value.length} eventos`);

              if (response.value.length > 0) {
                const eventsWithCalendarInfo = response.value.map(event => ({
                  ...event,
                  calendarName: calendar.name,
                  calendarId: calendar.id,
                  calendarColor: calendar.color,
                  calendarOwner: calendar.owner?.name || 'N/A'
                }));

                calendarEvents = calendarEvents.concat(eventsWithCalendarInfo);
              }

              nextUrl = response['@odata.nextLink'];
              currentPage++;

              // Límite de seguridad aumentado
              if (currentPage > 50) {
                console.warn(`⚠️ Límite de páginas alcanzado para calendario "${calendar.name}" (${currentPage})`);
                break;
              }

              // Si no hay más eventos, salir
              if (response.value.length === 0) {
                console.log(`📄 No hay más eventos en "${calendar.name}"`);
                break;
              }

            } while (nextUrl);

            // Filtrar manualmente por fechas si se obtuvieron todos los eventos
            if (start && end && calendarEvents.length > 0) {
              const startDate = new Date(start);
              const endDate = new Date(end);

              const originalCount = calendarEvents.length;
              calendarEvents = calendarEvents.filter(event => {
                const eventDate = new Date(event.start.dateTime || event.start.date);
                return eventDate >= startDate && eventDate <= endDate;
              });

              console.log(`🔍 Filtrado manual en "${calendar.name}": ${originalCount} → ${calendarEvents.length} eventos`);
            }
          }

          console.log(`✅ Calendario "${calendar.name}": ${calendarEvents.length} eventos obtenidos`);
          allEvents = allEvents.concat(calendarEvents);

        } catch (calendarError) {
          console.error(`❌ Error obteniendo eventos del calendario "${calendar.name}":`, calendarError);
          console.error(`❌ Detalles del error:`, calendarError.message);
          // Continúa con el siguiente calendario
        }
      }

    } catch (calendarsError) {
      console.error('❌ Error obteniendo lista de calendarios:', calendarsError);
      console.log('🔄 Fallback: usando calendario principal...');

      // FALLBACK: Obtener eventos del calendario principal
      let nextUrl = null;
      let currentPage = 1;

      do {
        console.log(`📄 Calendario principal - Página ${currentPage}...`);

        let query;
        if (nextUrl) {
          query = client.api(nextUrl);
        } else {
          query = client
            .api('/me/events')
            .select('id,subject,start,end,location,bodyPreview,attendees,isAllDay,categories,showAs,importance') // Añadir importance
            .orderby('start/dateTime')
            .top(999);

          // Aplicar filtro si existe
          if (start && end) {
            try {
              const startISO = new Date(start).toISOString();
              const endISO = new Date(end).toISOString();
              const filter = `start/dateTime ge '${startISO}' and start/dateTime le '${endISO}'`;
              query = query.filter(filter);
            } catch (filterError) {
              console.warn('⚠️ Error aplicando filtro en fallback, continuando sin filtro');
            }
          }
        }

        const response = await query.get();
        console.log(`📄 Calendario principal - Página ${currentPage}: ${response.value.length} eventos`);

        if (response.value.length > 0) {
          const eventsWithCalendarInfo = response.value.map(event => ({
            ...event,
            calendarName: 'Calendario Principal',
            calendarId: 'primary',
            calendarColor: '#4285f4',
            calendarOwner: req.session.account.name
          }));

          allEvents = allEvents.concat(eventsWithCalendarInfo);
        }

        nextUrl = response['@odata.nextLink'];
        currentPage++;

        if (currentPage > 50) {
          console.warn('⚠️ Límite de páginas alcanzado en fallback');
          break;
        }

        if (response.value.length === 0) {
          console.log('📄 No hay más eventos en calendario principal');
          break;
        }
      } while (nextUrl);
    }

    console.log(`📊 TOTAL de eventos obtenidos de TODOS los calendarios: ${allEvents.length}`);

    // DEBUG: Mostrar estadísticas por calendario
    const calendarStats = {};
    allEvents.forEach(event => {
      const calName = event.calendarName || 'Sin nombre';
      calendarStats[calName] = (calendarStats[calName] || 0) + 1;
    });

    console.log('📊 Eventos por calendario:');
    Object.entries(calendarStats).forEach(([name, count]) => {
      console.log(`  • ${name}: ${count} eventos`);
    });

    // Mostrar rango de fechas si hay eventos
    if (allEvents.length > 0) {
      const eventDates = allEvents.map(e => new Date(e.start.dateTime || e.start.date));
      const minDate = new Date(Math.min(...eventDates));
      const maxDate = new Date(Math.max(...eventDates));
      console.log(`📅 Rango total de eventos: ${minDate.toISOString()} a ${maxDate.toISOString()}`);
    }


    // Crear un cache de colores de categorías para optimizar
    const categoryColorCache = {};

    // Intentar obtener todas las categorías una vez
    try {
      const categoriesResponse = await client
        .api('/me/outlook/masterCategories')
        .get();

      categoriesResponse.value.forEach(category => {
        categoryColorCache[category.displayName] = getOutlookCategoryColor(category.color);
      });

      console.log(`🎨 Cache de colores creado para ${Object.keys(categoryColorCache).length} categorías`);
    } catch (error) {
      console.warn('⚠️ No se pudo cargar cache de colores de categorías:', error.message);
    }

    // Formatear eventos para FullCalendar
    const formattedEvents = allEvents.map(event => {

      // ====== PASO 1: PROCESAR FECHAS CORRECTAMENTE ======
      let startDate, endDate;

      if (event.isAllDay) {
        startDate = event.start.date;
        endDate = event.end.date;
        console.log(`📅 TODO EL DÍA "${event.subject}": ${startDate} - ${endDate}`);
      } else {
        // CRÍTICO: Procesar ambas fechas de la misma manera
        console.log(`📅 ANTES de convertir "${event.subject}":`);
        console.log(`  • Start original: ${event.start.dateTime}`);
        console.log(`  • End original: ${event.end.dateTime}`);

        startDate = convertToSpainTime(event.start.dateTime, false);
        endDate = convertToSpainTime(event.end.dateTime, false);

        console.log(`📅 DESPUÉS de convertir "${event.subject}":`);
        console.log(`  • Start convertido: ${startDate}`);
        console.log(`  • End convertido: ${endDate}`);

        // VERIFICACIÓN: Comprobar que las fechas son válidas
        if (!startDate || !endDate) {
          console.error(`❌ ERROR: Fechas inválidas para "${event.subject}"`);
          console.error(`  • Start: ${startDate}`);
          console.error(`  • End: ${endDate}`);
          console.error(`  • Start original: ${event.start.dateTime}`);
          console.error(`  • End original: ${event.end.dateTime}`);
        }

        // VERIFICACIÓN: Comprobar que end > start
        if (startDate && endDate) {
          const startMs = new Date(startDate).getTime();
          const endMs = new Date(endDate).getTime();
          if (endMs <= startMs) {
            console.warn(`⚠️ ADVERTENCIA: Hora fin <= hora inicio para "${event.subject}"`);
            console.warn(`  • Start: ${startDate} (${startMs})`);
            console.warn(`  • End: ${endDate} (${endMs})`);
          }
        }
      }

      // ====== PASO 2: CREAR EVENTO BASE CON FECHAS VERIFICADAS ======
      const baseEvent = {
        id: event.id,
        title: event.subject || 'Sin título',
        start: startDate,
        end: endDate,
        allDay: event.isAllDay || false,
        backgroundColor: '#4285f4', // Default azul
        borderColor: '#4285f4',
        textColor: '#ffffff',
        extendedProps: {
          location: event.location?.displayName || '',
          description: event.bodyPreview || '',
          calendarName: event.calendarName || 'Sin nombre',
          calendarId: event.calendarId || '',
          calendarOwner: event.calendarOwner || '',
          categories: event.categories || [],
          showAs: event.showAs || 'busy'
        }
      };

      // ====== PASO 3: APLICAR COLORES SOLO SI HAY CATEGORÍAS ======
      if (event.categories && Array.isArray(event.categories) && event.categories.length > 0) {
        const firstCategory = event.categories[0];

        // Usar cache de colores de categorías master
        if (categoryColorCache[firstCategory]) {
          baseEvent.backgroundColor = categoryColorCache[firstCategory];
          baseEvent.borderColor = categoryColorCache[firstCategory];
          console.log(`🎨 "${event.subject}" con categoría "${firstCategory}" → Color cache: ${baseEvent.backgroundColor}`);
        } else {
          // Mapear categorías comunes
          const categoryColorMap = {
            'Categoría roja': '#ff1a1a',
            'Categoría naranja': '#ff8c00',
            'Categoría amarilla': '#ffd700',
            'Categoría verde': '#32cd32',
            'Categoría azul': '#326acb',
            'Categoría púrpura': '#800080',
            'Trabajo': '#32cd32',
            'Personal': '#326acb',
            'Familia': '#ff69b4',
            'Cumpleaños': '#ff8c00',
            'Vacaciones': '#ffd700',
            'Importante': '#ff1a1a',
            'Reunión': '#800080',
            'Cita médica': '#dc143c',
            'Deporte': '#228b22'
          };

          const mappedColor = categoryColorMap[firstCategory] ||
                             categoryColorMap[firstCategory.toLowerCase()] ||
                             '#4285f4';

          baseEvent.backgroundColor = mappedColor;
          baseEvent.borderColor = mappedColor;
          console.log(`🎨 "${event.subject}" con categoría "${firstCategory}" → Color mapeo: ${baseEvent.backgroundColor}`);
        }
      }

      // ====== PASO 4: VERIFICACIÓN FINAL ======
      console.log(`✅ EVENTO FINAL "${baseEvent.title}":`, {
        start: baseEvent.start,
        end: baseEvent.end,
        allDay: baseEvent.allDay,
        categories: baseEvent.extendedProps.categories,
        color: baseEvent.backgroundColor,
        startType: typeof baseEvent.start,
        endType: typeof baseEvent.end
      });

      return baseEvent;
    });

    console.log('Eventos formateados para FullCalendar:', formattedEvents.length);
    if (formattedEvents.length > 0) {
      console.log('Ejemplo de evento formateado:', JSON.stringify(formattedEvents[0], null, 2));
      console.log('Primeros 5 eventos del rango:');
      formattedEvents.slice(0, 5).forEach((event, index) => {
        console.log(`${index + 1}. "${event.title}" [${event.extendedProps.calendarName}] - ${event.start}`);
      });
    }

    console.log(`✅ Se encontraron ${formattedEvents.length} eventos de TODOS los calendarios`);
    res.json(formattedEvents);

  } catch (error) {
    console.error('❌ Error obteniendo eventos:', error);

    if (error.statusCode === 401) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    if (error.statusCode === 403) {
      return res.status(403).json({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'No tienes permisos para acceder a los calendarios. Verifica los permisos de la aplicación.'
      });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST - Crear evento en Outlook
router.post('/', async (req, res) => {
  try {
    console.log('📝 POST /api/events - Iniciando creación de evento');
    console.log('📋 Datos de sesión:', {
      hasAccessToken: !!req.session.accessToken,
      accountType: req.session.accountType,
      accountEmail: req.session.account?.username
    });

    if (!req.session.accessToken) {
      console.log('❌ No access token found in session');
      return res.status(401).json({ error: 'REAUTH' });
    }

    const { title, start, end, allDay, location, description, attendees, categories } = req.body;
    console.log('📥 Request body completo:', JSON.stringify(req.body, null, 2));

    if (!title || !start) {
      console.log('❌ Faltan campos requeridos:', { title: !!title, start: !!start });
      return res.status(400).json({ error: 'Título y fecha de inicio son requeridos' });
    }

    console.log('📝 Creando evento en Outlook:', { title, start, end, allDay, location, description, attendees, categories });

    const client = getAuthenticatedClient(req.session.accessToken);

    const newEvent = {
      subject: title,
      location: location ? { displayName: location } : null,
      body: {
        contentType: 'text',
        content: description || ''
      },
      categories: Array.isArray(categories) ? categories : (categories ? [categories] : [])
    };

    // Manejar fechas según si es todo el día o no
    if (allDay) {
      newEvent.isAllDay = true;
      newEvent.start = {
        date: start.split('T')[0],
        timeZone: 'Europe/Madrid'
      };
      newEvent.end = {
        date: end.split('T')[0],
        timeZone: 'Europe/Madrid'
      };
    } else {
      // CAMBIO: No usar convertFromSpainTime, enviar directo con zona España
      newEvent.isAllDay = false;
      newEvent.start = {
        dateTime: start,
        timeZone: 'Europe/Madrid'
      };
      newEvent.end = {
        dateTime: end,
        timeZone: 'Europe/Madrid'
      };

      console.log('📤 Enviando fechas con zona España:', {
        start: start,
        end: end,
        timeZone: 'Europe/Madrid'
      });
    }

    // Añadir asistentes si se proporcionan
    if (attendees && attendees.trim()) {
      newEvent.attendees = attendees.split(',').map(email => ({
        emailAddress: {
          address: email.trim(),
          name: email.trim()
        }
      }));
    }

    console.log('📤 Enviando evento a Outlook:', JSON.stringify(newEvent, null, 2));

    let createdEvent;
    try {
      createdEvent = await client.api('/me/events').post(newEvent);
      console.log('✅ Evento creado exitosamente en Microsoft Graph');
    } catch (graphError) {
      console.error('❌ Error específico de Microsoft Graph:', {
        statusCode: graphError.statusCode,
        code: graphError.code,
        message: graphError.message,
        body: graphError.body
      });
      throw graphError;
    }

    console.log('✅ Evento creado exitosamente en Microsoft Graph');
    console.log('📄 Respuesta cruda de Graph:', JSON.stringify(createdEvent, null, 2));

    // Formatear respuesta con zona horaria correcta usando el mismo formato que GET
    let startDate, endDate;

    if (createdEvent.isAllDay) {
      startDate = createdEvent.start.date;
      endDate = createdEvent.end.date;
    } else {
      // Función inline para convertir fechas (copia de convertToSpainTime)
      const convertToSpainTimeInline = (dateStr) => {
        if (!dateStr) return null;

        console.log('📅 Graph original (España-2h):', dateStr);

        // Limpiar el formato y quitar milisegundos
        let cleanDate = dateStr;
        if (cleanDate.includes('.')) {
          cleanDate = cleanDate.split('.')[0];
        }

        // Crear fecha y SUMAR 2 horas (porque Graph la devuelve 2 horas menos)
        const date = new Date(cleanDate);
        date.setHours(date.getHours() + 2);

        // Formatear como ISO local sin Z
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        const result = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

        console.log('✅ España (+2h):', result);
        console.log('🕐 Hora original:', cleanDate.split('T')[1]);
        console.log('🕐 Hora final:', result.split('T')[1]);

        return result;
      };

      console.log('🔄 Convirtiendo fechas de respuesta...');
      startDate = convertToSpainTimeInline(createdEvent.start.dateTime);
      endDate = convertToSpainTimeInline(createdEvent.end.dateTime);

      console.log('✅ Fechas convertidas para respuesta:', {
        start: startDate,
        end: endDate
      });
    }

    // Formatear respuesta SIMPLE - sin colores de categorías (se aplican en GET)
    const formattedEvent = {
      id: createdEvent.id,
      title: createdEvent.subject || 'Sin título',
      start: startDate,
      end: endDate,
      allDay: createdEvent.isAllDay || false,
      backgroundColor: '#4285f4', // Color por defecto - se aplicará el correcto en GET
      borderColor: '#4285f4',
      textColor: '#ffffff',
      extendedProps: {
        location: createdEvent.location?.displayName || '',
        description: createdEvent.bodyPreview || '',
        calendarName: 'Calendario Principal',
        calendarId: 'primary',
        calendarOwner: req.session.account.name,
        categories: createdEvent.categories || [],
        showAs: createdEvent.showAs || 'busy'
      }
    };

    console.log('✅ Evento creado y formateado (sin colores):', formattedEvent.title);
    console.log('📅 Fechas finales POST:', {
      start: formattedEvent.start,
      end: formattedEvent.end,
      allDay: formattedEvent.allDay
    });

    res.status(201).json(formattedEvent);  // Usar 201 para "Created"

  } catch (error) {
    console.error('❌ Error creando evento - detalles completos:', {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      stack: error.stack,
      body: error.body
    });

    if (error.statusCode === 401) {
      console.log('🔐 Token expirado o inválido, requiere reautenticación');
      return res.status(401).json({ error: 'REAUTH' });
    }

    // Devolver mensaje de error más descriptivo
    const errorMessage = error.body?.error?.message || error.message || 'Error interno del servidor';
    console.log('📤 Enviando error al cliente:', errorMessage);

    res.status(500).json({
      error: 'Error interno del servidor',
      details: errorMessage,
      errorCode: error.code || 'UNKNOWN'
    });
  }
});

// DELETE - Eliminar evento de Outlook
router.delete('/:id', async (req, res) => {
  try {
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    const { id } = req.params;
    console.log('🗑️ Eliminando evento:', id, 'para usuario:', req.session.account.username);

    const client = getAuthenticatedClient(req.session.accessToken);

    // Intentar eliminar el evento
    await client.api(`/me/events/${id}`).delete();

    console.log('✅ Evento eliminado de Outlook:', id);
    res.json({
      success: true,
      message: 'Evento eliminado correctamente',
      id: id
    });

  } catch (error) {
    console.error('❌ Error eliminando evento:', error);
    console.error('❌ Detalles del error:', {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message
    });

    if (error.statusCode === 401) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        error: 'Evento no encontrado',
        message: 'El evento que intentas eliminar no existe o ya fue eliminado'
      });
    }

    if (error.statusCode === 403) {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'No tienes permisos para eliminar este evento'
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// PUT - Actualizar evento en Outlook
router.put('/:id', async (req, res) => {
  try {
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    const { id } = req.params;
    const { title, start, end, allDay, location, description, attendees, categories } = req.body;

    if (!title || !start) {
      return res.status(400).json({ error: 'Título y fecha de inicio son requeridos' });
    }

    console.log('✏️ Actualizando evento en Outlook:', { id, title, start, end, allDay, location, description, attendees, categories });

    const client = getAuthenticatedClient(req.session.accessToken);

    const updatedEvent = {
      subject: title,
      location: location ? { displayName: location } : null,
      body: {
        contentType: 'text',
        content: description || ''
      },
      categories: Array.isArray(categories) ? categories : (categories ? [categories] : [])
    };

    // Manejar fechas según si es todo el día o no
    if (allDay) {
      updatedEvent.isAllDay = true;
      updatedEvent.start = {
        date: start.split('T')[0],
        timeZone: 'Europe/Madrid'
      };
      updatedEvent.end = {
        date: end.split('T')[0],
        timeZone: 'Europe/Madrid'
      };
    } else {
      // CAMBIO: No usar convertFromSpainTime, enviar directo con zona España
      updatedEvent.isAllDay = false;
      updatedEvent.start = {
        dateTime: start,
        timeZone: 'Europe/Madrid'
      };
      updatedEvent.end = {
        dateTime: end,
        timeZone: 'Europe/Madrid'
      };

      console.log('📤 Enviando fechas con zona España:', {
        start: start,
        end: end,
        timeZone: 'Europe/Madrid'
      });
    }

    // Añadir asistentes si se proporcionan
    if (attendees && attendees.trim()) {
      updatedEvent.attendees = attendees.split(',').map(email => ({
        emailAddress: {
          address: email.trim(),
          name: email.trim()
        }
      }));
    }

    console.log('📤 Enviando evento a Outlook:', JSON.stringify(updatedEvent, null, 2));

    const response = await client.api(`/me/events/${id}`).patch(updatedEvent);

    console.log('✅ Evento actualizado exitosamente en Microsoft Graph');
    console.log('📄 Respuesta cruda de Graph:', JSON.stringify(response, null, 2));

    // Formatear respuesta con zona horaria correcta usando el mismo formato que GET
    let startDate, endDate;

    if (response.isAllDay) {
      startDate = response.start.date;
      endDate = response.end.date;
    } else {
      // Función inline para convertir fechas (copia de convertToSpainTime)
      const convertToSpainTimeInline = (dateStr) => {
        if (!dateStr) return null;

        console.log('📅 Graph original (España-2h):', dateStr);

        // Limpiar el formato y quitar milisegundos
        let cleanDate = dateStr;
        if (cleanDate.includes('.')) {
          cleanDate = cleanDate.split('.')[0];
        }

        // Crear fecha y SUMAR 2 horas (porque Graph la devuelve 2 horas menos)
        const date = new Date(cleanDate);
        date.setHours(date.getHours() + 2);

        // Formatear como ISO local sin Z
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        const result = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

        console.log('✅ España (+2h):', result);
        console.log('🕐 Hora original:', cleanDate.split('T')[1]);
        console.log('🕐 Hora final:', result.split('T')[1]);

        return result;
      };

      console.log('🔄 Convirtiendo fechas de respuesta...');
      startDate = convertToSpainTimeInline(response.start.dateTime);
      endDate = convertToSpainTimeInline(response.end.dateTime);

      console.log('✅ Fechas convertidas para respuesta:', {
        start: startDate,
        end: endDate
      });
    }

    // Formatear respuesta SIMPLE - sin colores de categorías (se aplican en GET)
    const formattedEvent = {
      id: response.id,
      title: response.subject || 'Sin título',
      start: startDate,
      end: endDate,
      allDay: response.isAllDay || false,
      backgroundColor: '#4285f4', // Color por defecto - se aplicará el correcto en GET
      borderColor: '#4285f4',
      textColor: '#ffffff',
      extendedProps: {
        location: response.location?.displayName || '',
        description: response.bodyPreview || '',
        calendarName: 'Calendario Principal',
        calendarId: 'primary',
        calendarOwner: req.session.account.name,
        categories: response.categories || [],
        showAs: response.showAs || 'busy'
      }
    };

    console.log('✅ Evento actualizado y formateado (sin colores):', formattedEvent.title);
    console.log('📅 Fechas finales PUT:', {
      start: formattedEvent.start,
      end: formattedEvent.end,
      allDay: formattedEvent.allDay
    });

    res.json(formattedEvent);

  } catch (error) {
    console.error('❌ Error actualizando evento:', error);

    if (error.statusCode === 401) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET - Obtener evento individual de Outlook
router.get('/:id', async (req, res) => {
  try {
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    const { id } = req.params;
    console.log('📄 Obteniendo evento individual:', id);

    const client = getAuthenticatedClient(req.session.accessToken);

    const event = await client
      .api(`/me/events/${id}`)
      .select('id,subject,start,end,location,body,bodyPreview,attendees,isAllDay,categories,showAs,sensitivity,organizer,webLink,recurrence')
      .get();

    console.log('✅ Evento obtenido:', event.subject);

    // Formatear fechas
    let startDate, endDate;

    if (event.isAllDay) {
      startDate = event.start.date;
      endDate = event.end.date;
    } else {
      startDate = convertToSpainTime(event.start.dateTime, false);
      endDate = convertToSpainTime(event.end.dateTime, false);
    }

    // Formatear asistentes
    const attendeesEmails = event.attendees ?
      event.attendees.map(att => att.emailAddress.address).join(', ') : '';

    const formattedEvent = {
      id: event.id,
      title: event.subject || 'Sin título',
      start: startDate,
      end: endDate,
      allDay: event.isAllDay || false,
      location: event.location?.displayName || '',
      description: event.body?.content || event.bodyPreview || '',
      attendeesEmails: attendeesEmails,
      categories: event.categories || [],
      showAs: event.showAs || 'busy',
      sensitivity: event.sensitivity || 'normal',
      organizer: event.organizer?.emailAddress?.address || '',
      webLink: event.webLink || ''
    };

    console.log('✅ Evento formateado para modal:', formattedEvent.title);
    res.json(formattedEvent);

  } catch (error) {
    console.error('❌ Error obteniendo evento individual:', error);

    if (error.statusCode === 401) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Función para obtener color de una categoría específica
async function getCategoryColor(categoryName, accessToken) {
  try {
    const client = getAuthenticatedClient(accessToken);

    // Obtener todas las categorías master
    const categoriesResponse = await client
      .api('/me/outlook/masterCategories')
      .get();

    // Buscar la categoría específica
    const category = categoriesResponse.value.find(cat =>
      cat.displayName.toLowerCase() === categoryName.toLowerCase()
    );

    if (category) {
      return getOutlookCategoryColor(category.color);
    }

    return '#4285f4'; // Color por defecto

  } catch (error) {
    console.warn(`⚠️ No se pudo obtener color para categoría "${categoryName}":`, error.message);
    return '#4285f4'; // Color por defecto
  }
}

module.exports = router;