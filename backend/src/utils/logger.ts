import winston from 'winston';

export const createLogger = (service: string) => {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { service },
    transports: [
      new winston.transports.File({ filename: 'logs/pid-consistency.log' }),
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ]
  });
};

export const logger = {
  error: (err: Error, req?: any) => {
    console.error(err);
    // Add any error logging logic
  },
  info: (message: string, data?: any) => {
    if (data !== undefined) {
      console.log(message, data);
    } else {
      console.log(message);
    }
    // Add any additional info logging logic here if needed
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
}; 