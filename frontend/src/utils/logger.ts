type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enabled: boolean;
}

const config: LoggerConfig = {
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  enabled: true
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const shouldLog = (level: LogLevel): boolean => {
  return config.enabled && LOG_LEVELS[level] >= LOG_LEVELS[config.level];
};

// Simple logger for frontend
export const logger = {
  info: (message: string, meta?: object) => {
    console.log(message, meta);
  },
  error: (message: string, error?: unknown) => {
    console.error(message, error);
  },
  warn: (message: string, meta?: object) => {
    console.warn(message, meta);
  },
  debug: (message: string, meta?: object) => {
    console.debug(message, meta);
  },

  // Konfigurera loggern
  configure: (options: Partial<LoggerConfig>) => {
    Object.assign(config, options);
  }
}; 