const { createClient } = require('redis');

let publisher = null;

const initRedis = async () => {
    try {
        publisher = createClient({ url: 'redis://redis:6379' });
        publisher.on('error', (err) => console.error('Redis Client Error', err));
        await publisher.connect();
        console.log('✅ Redis Connected for Notifications');
    } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
    }
};

const sendNotification = async (userId, title, message, type = 'info') => {
    if (!publisher) {
        console.warn('⚠️ Redis publisher not initialized. Notification skipped:', title);
        return;
    }

    const notificationPayload = JSON.stringify({
        userId,
        title,
        message,
        type,
        timestamp: new Date().toISOString()
    });

    try {
        await publisher.publish('notifications', notificationPayload);
        console.log(`[NOTIFICATION SENT] User: ${userId} | Title: ${title}`);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

module.exports = { initRedis, sendNotification };
