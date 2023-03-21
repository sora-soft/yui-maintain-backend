import {ExError} from '@sora-soft/framework';
import {AppErrorCode} from './ErrorCode.js';

class AppError extends ExError {
  constructor(code: AppErrorCode, message: string) {
    super(code, 'AppError', message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export {AppError};
