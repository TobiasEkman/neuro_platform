import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = express.Router();

// Debug logging
router.use((req, res, next) => {
  console.log('\nPatients Route:', {
    originalUrl: req.originalUrl,
    path: req.path,
    method: req.method
  });
  next();
});

// Proxy alla patient-requests till patient management service
router.use('/', createProxyMiddleware({
  target: 'http://localhost:5008',
  changeOrigin: true,
  pathRewrite: {
    '^/api/patients': '/patients'  // Ta bort /api/patients prefix
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('\nProxying request:', {
      from: req.originalUrl,
      to: proxyReq.path
    });
  }
}));

export default router; 