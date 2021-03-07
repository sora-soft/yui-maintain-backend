#!/usr/bin/env node

const program = require('commander');
const { main } = require('../');
const path = require('path');

// console.log(Commander);
// const program = new Commander();
program
  .option('-c, --config <config-file>', 'url to load config file')
  .option('-w, --work-dir <work-dir>', 'server work dir')
  .parse(process.argv);

const options = program.opts();
if (options.workDir)
  process.chdir(path.resolve(process.cwd(), options.workDir));

main(options);
