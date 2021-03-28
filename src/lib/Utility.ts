import crypto = require('crypto');

class Random {
  static randomString(length: number) {
    return crypto.randomBytes(Math.floor(length / 2)).toString('hex').slice(0, length);
  }
}

class Hash {
  static md5(content: string) {
    return crypto.createHash('md5').update(content).digest('hex');
  }
}

export {Random, Hash}
