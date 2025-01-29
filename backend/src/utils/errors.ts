export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public name: string = 'AppError'
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'ValidationError');
  }
}

export class AuthError extends AppError {
  constructor(message: string) {
    super(401, message, 'UnauthorizedError');
  }
} 