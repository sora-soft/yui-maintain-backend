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

class UnixTime {
  static fromNodeTime(ms: number) {
    return Math.floor(ms / 1000);
  }

  static fromDate(date: Date) {
    return Math.floor(date.getTime() / 1000)
  }

  static now() {
    return this.fromDate(new Date());
  }

  static day(days: number) {
    return days * this.hour(24);
  }

  static hour(hours: number) {
    return hours * this.minute(60);
  }

  static minute(minutes: number) {
    return minutes * this.second(60);
  }

  static second(seconds: number) {
    return seconds;
  }
}

class NodeTime {
  static fromUnixTime(second: number) {
    return second * 1000;
  }

  static fromDate(date: Date) {
    return date.getTime();
  }

  static now() {
    return new Date().getTime();
  }

  static day(days: number) {
    return days * this.hour(24)// 60 * 60 * 24 * days * 1000;
  }

  static hour(hours: number) {
    return hours * this.minute(60);
  }

  static minute(minutes: number) {
    return minutes * this.second(60);
  }

  static second(seconds: number) {
    return seconds * 1000;
  }
}

class PathUtility {
  static convertWSLPathToWindows(filePath: string) {
    if (process.env.platform === 'wsl') {
      const prefix = filePath.split('/').slice(0, 3);
      return `${prefix[2].toLocaleUpperCase()}:/` + filePath.split('/').slice(3).join('/')
    }
    return filePath;
  }
}

type NonFunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends Function ? never : K
}[keyof T];
type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;

export {Random, Hash, UnixTime, NodeTime, NonFunctionProperties, PathUtility, Util}
