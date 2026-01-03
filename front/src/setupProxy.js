const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy to the API Gateway (port 80)
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:80',
      changeOrigin: true,
    })
  );
  app.use(
    '/auth',
    createProxyMiddleware({
      target: 'http://127.0.0.1:80',
      changeOrigin: true,
    })
  );
  app.use(
    '/admin',
    createProxyMiddleware({
      target: 'http://127.0.0.1:80',
      changeOrigin: true,
    })
  );
};
