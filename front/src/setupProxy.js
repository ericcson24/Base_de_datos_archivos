const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy to the API Gateway (port 8080) — ws: true enables WebSocket upgrade for RDP
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8080',
      changeOrigin: true,
      ws: true,
    })
  );
  app.use(
    '/auth',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8080',
      changeOrigin: true,
    })
  );
  app.use(
    '/admin',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8080',
      changeOrigin: true,
    })
  );
};
