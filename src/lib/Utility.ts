import crypto = require('crypto');
import moment = require('moment');
import fs = require('fs/promises');
import path = require('path');

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

class UnixTime {
  static fromDate(date: Date) {
    return Math.floor(date.getTime() / 1000)
  }

  static now() {
    return this.fromDate(new Date());
  }

  static day(days: number) {
    return 60 * 60 * 24 * days;
  }

  static minute(minutes: number) {
    return 60 * minutes;
  }

  static second(seconds: number) {
    return seconds;
  }
}

class NodeTime {
  static now() {
    return new Date().getTime();
  }

  static day(days: number) {
    return days * this.hour(24)// 60 * 60 * 24 * days * 1000;
  }

  static minute(minutes: number) {
    return 60 * minutes * this.second(1);
  }

  static hour(hours: number) {
    return hours * this.minute(60);
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

export {Random, Hash, UnixTime, NodeTime, NonFunctionProperties, PathUtility}
