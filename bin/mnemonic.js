#!/usr/bin/env node

const process = require('process');
const program = require('commander');
const fs = require('fs');
const bcoin = require('bcoin');
const Mnemonic = bcoin.hd.Mnemonic;

/*
 * This script generates a bip39 mnemonic passphrase
 * and writes it to file or echos it
 */

const parseArgs = () => {
  return program
    .version('0.0.1')
    .option('-o, --output-path <path>', 'path to write the file to')
    .option('-e, --echo', 'echo the mnemonic')
    .parse(process.argv)
}

const main = (args) => {
  if (args.outputPath && args.echo) {
    console.log('Cannot echo and write to file - please provide one action')
    process.exit(1)
  } else if (!args.outputPath && !args.echo) {
    console.log('Please provide one action')
    process.exit(1)
  }
  const mnemonic = new Mnemonic({
    bit: 512,
    language: 'english',
  })
  if (args.echo) {
    return mnemonic.toString()
  } else {
    const outputPath = args.outputPath
    fs.writeFileSync(outputPath, mnemonic.toString())
  }
}

if (require.main) {
  const args = parseArgs()
  const mnemonic = main(args)
  // only write to stdout if there is something to write
  if (mnemonic) {
    process.stdout.write(mnemonic)
  }
}

module.exports = {
  createMnemonic: main,
}
