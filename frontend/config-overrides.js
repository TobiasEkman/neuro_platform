module.exports = function override(config, env) {
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        http: false,
        https: false,
        url: false,
        assert: false,
        stream: false,
        zlib: false,
        crypto: false,
        os: false,
      },
    };
  
    return config;
  };