import {ILoggerData, ILoggerOutputOptions, LoggerOutput} from '@sora-soft/framework';
import moment = require('moment');
import fs = require('fs');
import mkdirp = require('mkdirp');
import path = require('path');

export interface IFileOutputOptions extends ILoggerOutputOptions {
  fileFormat: string;
}

class FileOutput extends LoggerOutput {
  constructor(options: IFileOutputOptions) {
    super(options);
    this.fileOptions_ = options;
    const filename = moment().format(this.fileOptions_.fileFormat);
    this.createFileStream(filename);
  }

  async output(data: ILoggerData) {
    const filename = moment().format(this.fileOptions_.fileFormat);
    if (filename !== this.currentFileName_ || !this.stream_) {
      await this.createFileStream(filename);
    }
    this.stream_.write(`${data.timeString},${data.level},${data.identify},${data.category},${data.position},${data.content}\n`);
  }

  async createFileStream(filename: string) {
    if (this.creatingPromise_)
      return this.creatingPromise_;

    this.creatingPromise_ = new Promise(async (resolve) => {
      await mkdirp(path.dirname(filename));
      if (this.stream_)
        this.stream_.end();

      this.currentFileName_ = filename;
      this.stream_ = fs.createWriteStream(filename, {flags: 'a'});
      this.creatingPromise_ = null;
      resolve();
    });

    return this.creatingPromise_;

  }

  private currentFileName_: string;
  private stream_: fs.WriteStream;
  private fileOptions_: IFileOutputOptions;
  private creatingPromise_: Promise<void> | null;
}

export {FileOutput}
