import {Logger} from '@sora-soft/framework';

class AppLogger extends Logger {
  constructor() {
    super({identify: 'app'});
  }
}

export {AppLogger};
