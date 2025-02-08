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

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },

  info: (message: string, ...args: any[]) => {
    if (shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  error: (message: string | Error, ...args: any[]) => {
    if (shouldLog('error')) {
      if (message instanceof Error) {
        console.error(`[ERROR] ${message.message}`, message.stack, ...args);
      } else {
        console.error(`[ERROR] ${message}`, ...args);
      }
    }
  },

  // Konfigurera loggern
  configure: (options: Partial<LoggerConfig>) => {
    Object.assign(config, options);
  }
}; 