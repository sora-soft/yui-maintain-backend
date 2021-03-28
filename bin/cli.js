#!/usr/bin/env node

const program = require('commander');
const {container, server, command} = require('../');
const path = require('path');

// console.log(Commander);
// const program = new Commander();
program
  .command('run [mode]')
  .requiredOption('-c, --config <config-file>', 'url to load config file')
  .option('-w, --work-dir <work-dir>', 'server work dir')
  .action((mode, options) => {
    if (options.workDir)
      process.chdir(path.resolve(process.cwd(), options.workDir));

    switch (mode) {
      case 'container':
        container({
          config: options.config
        });
        break;
      case 'server':
        server({
          config: options.config
        });
        break;
      case 'command':

        break;
      default:
        console.log(`${mode} not support`);
        break;
    }
  });

program
  .command('command <args...>')
  .requiredOption('-c, --config <config-file>', 'url to load config file')
  .option('-w, --work-dir <work-dir>', 'server work dir')
  .option('-n, --worker-name <worker-name>', 'worker name')
  .action((args, options) => {
    if (options.workDir)
      process.chdir(path.resolve(process.cwd(), options.workDir));

    command({
      config: options.config,
      name: options.workerName,
      arguments: args
    });
  });

program.parse(process.argv);

// const options = program.opts();
// if (options.workDir)
//   process.chdir(path.resolve(process.cwd(), options.workDir));

// main(options);
