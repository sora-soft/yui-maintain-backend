import {ExError} from '@sora-soft/framework';
import {UserErrorCode} from './ErrorCode';

class UserError extends ExError {
  constructor(code: UserErrorCode, message: string) {
    super(code, 'UserError', message);
    Object.setPrototypeOf(this, UserError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export {UserError}
