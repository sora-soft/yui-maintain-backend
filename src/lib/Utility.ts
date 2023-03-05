import crypto = require('crypto');

type NonUndefined<T> = T extends undefined ? never : T;

class Random {
  static randomString(length: number) {
    return crypto.randomBytes(Math.floor(length / 2)).toString('hex').slice(0, length);
  }

  static randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min)) + min;
  }
}

class Util {
  static isMeaningful<T>(object: T): object is NonUndefined<T> {
    if (typeof object === 'number')
      return !isNaN(object);
    return !this.isUndefined(object);
  }

  static isUndefined(object: any): object is undefined {
    return object === undefined;
  }
}

class Hash {
  static md5(content: string) {
    return crypto.createHash('md5').update(content).digest('hex');
  }
}

class PathUtility {
  static convertWSLPathToWindows(filePath: string) {
    if (process.env.platform === 'wsl') {
      const prefix = filePath.split('/').slice(0, 3);
      return `${prefix[2].toLocaleUpperCase()}:/` + filePath.split('/').slice(3).join('/');
    }
    return filePath;
  }
}

type NonFunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends Function ? never : K
}[keyof T];
type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;

export {Random, Hash, NonFunctionProperties, PathUtility, Util};
