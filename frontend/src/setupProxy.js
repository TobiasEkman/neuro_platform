const { createProxyMiddleware } = require('http-proxy-middleware');

// Add this at the very top
console.log('\x1b[41m\x1b[37m%s\x1b[0m', '!!! SETUP PROXY IS BEING LOADED !!!');

// Delay the setup logs slightly to avoid them being cleared
setTimeout(() => {
  console.log('\x1b[41m%s\x1b[0m', '=== PROXY SETUP COMPLETE ===');
  console.log('\x1b[33m%s\x1b[0m', 'Proxy is ready and listening for requests');
}, 2000);

module.exports = function(app) {
  console.log('\x1b[41m%s\x1b[0m', '=== PROXY SETUP STARTING ===');  // Red background
  console.log('\x1b[33m%s\x1b[0m', 'Current directory:', __dirname); // Yellow text
  
  // Add this before any other configuration
  process.env.GENERATE_SOURCEMAP = 'false';

  // Test that the proxy middleware is accessible
  if (!createProxyMiddleware) {
    console.error('\x1b[31m%s\x1b[0m', 'ERROR: createProxyMiddleware is not available');
    return;
  }

  console.log('\x1b[36m%s\x1b[0m', '[Proxy] Setting up proxy middleware...');
  console.log('\x1b[36m%s\x1b[0m', '[Proxy] Available endpoints:');
  console.log('- /api/patients -> http://localhost:5008');
  console.log('- /api/dicom -> http://localhost:5003');
  console.log('- /api/analysis -> http://localhost:5005');
  console.log('- /api/monitoring/icp -> http://localhost:5006');
  console.log('- /api/training -> http://localhost:5001');
  console.log('- /api/simulator -> http://localhost:5007');

  // Simple test proxy for patient service
  app.use(
    '/api',  // Match all /api requests
    createProxyMiddleware({
      target: 'http://localhost:4000',
      changeOrigin: true,
      logLevel: 'debug',
      pathRewrite: {
        '^/api': '' // Remove /api prefix when forwarding to backend
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('⭐ Proxying request:', {
          url: req.url,
          method: req.method,
          path: req.path
        });
      },
      onError: (err, req, res) => {
        console.error('❌ Proxy error:', err);
        res.status(500).send(err.message);
      }
    })
  );

  // Imaging Service på 5003
  app.use(
    '/api/dicom',
    createProxyMiddleware({
      target: 'http://localhost:4000',
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('\x1b[31m%s\x1b[0m', '[Proxy Error]', 'Imaging Service:', err);
        res.status(500).json({ 
          error: 'Imaging Service Unavailable',
          details: err.message 
        });
      }
    })
  );

  // For all other services, add logLevel: 'debug'
  const commonConfig = {
    changeOrigin: true,
    logLevel: 'debug',
    target: 'http://localhost:4000',
    onProxyReq: (proxyReq, req, res) => {
      console.log('\x1b[36m%s\x1b[0m', '[Proxy]', `${req.method} ${req.path}`);
    }
  };

  // Analysis Service på 5005
  app.use(
    '/api/analysis',
    createProxyMiddleware({
      ...commonConfig,
    })
  );

  // ICP Monitoring Service på 5006
  app.use(
    '/api/monitoring/icp',
    createProxyMiddleware({
      ...commonConfig,
    })
  );

  // Model Training Service på 5001
  app.use(
    '/api/training',
    createProxyMiddleware({
      ...commonConfig,
    })
  );

  // Simulator Service på 5007
  app.use(
    '/api/simulator',
    createProxyMiddleware({
      ...commonConfig,
    })
  );
}; 