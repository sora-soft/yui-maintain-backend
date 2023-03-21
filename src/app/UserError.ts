import {ErrorLevel, ExError} from '@sora-soft/framework';
import {UserErrorCode} from './ErrorCode.js';

class UserError extends ExError {
  constructor(code: UserErrorCode, message: string) {
    super(code, 'UserError', message, ErrorLevel.EXPECTED);
    Object.setPrototypeOf(this, UserError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export {UserError};
