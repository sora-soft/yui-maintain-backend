export class AppConst {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
  static readonly appName = require('../../package.json').name;
}

export class TimeConst {
  static readonly second = 1000;
  static readonly minute = 60 * TimeConst.second;
  static readonly hour = 60 * TimeConst.minute;
  static readonly day = 24 * TimeConst.hour;
}
