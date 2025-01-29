export const logger = {
  error: (err: Error, req?: any) => {
    console.error(err);
    // Add any error logging logic
  },
  info: (message: string, data?: any) => {
    console.log(message, data);
    // Add any info logging logic
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
}; 