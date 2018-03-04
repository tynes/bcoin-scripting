#!/usr/bin/env node

const process = require('process');
const program = require('commander');
const fs = require('fs');
const assert = require('assert');
const bcoin = require('bcoin');
const { RPCClient } = bcoin.http;

/*
 * This script generates a timestamp that can be used
 * as a value for nLocktime or an input for CLTV etc
 * IMPORTANT - this script assumes that it can pull information
 * from a fully synced node 
 * The -t must be a ISO 8601 compliant string including the time zone,
 * example: '25 Feb 2018 13:50:00 MST'
 */

const parseInt = val => +val

// THERE IS DEFINITELY SOMETHING WRONG HERE
const parseArgs = () => {
  return program
    .version('0.0.1')
    .option('-o, --output-path <path>', 'path to write the file to')
    .option('-e, --echo', 'echo the mnemonic')
    .option('-u, --unix-epoch', 'generate a unix epoch timestamp')
    .option('-b, --blockchain-height', 'generate a blockchain height value')
    .option('-n, --network <network>', 'network to fetch blockchain information from')
    .option('-t, --timestamp <timestamp>', 'timestamp to parse unix epoch time from')
    .option('-r, --relative-unlock-height <value>', 'height to unlock from relative from current height', parseInt)
    .parse(process.argv)
}

const validateArgs = (args) => {
  // only one of outputPath and echo
  // only one of unix epoch or block reference
  if (!args.blockchainHeight && !args.unixEpoch) {
    throw new Error(`Must provide a value for blockchain-height or unix-epoch: ${args.blockchainHeight}, ${args.unixEpoch}`) 
  }

  if (!args.echo && !args.outputPath) {
    throw new Error(`Must provide a value for echo or output-path: ${args.echo}, ${args.outputPath}`) 
  }
}

// this depends on a bcoin node running
const main = async (args) => {
  let result, date;
  if (args.blockchainHeight) {
    const rpc = new RPCClient({ network: args.network });
    const blockcount = await rpc.execute('getblockcount')

    // can use a literal relative unlock height or
    // attempt to calculate based on date
    if (args.relativeUnlockHeight) {
      result = blockcount + args.relativeUnlockHeight
    } else {
      // current unix epoch
      const currentTime = Date.now()
      date = Date.parse(args.timestamp)
      // take the difference and make sure its in the future
      const secondsDifference = date - currentTime
      assert(secondsDifference > 0)
      // calculate the number of minutes
      const minutesDifference = secondsDifference / 60
      // divide by 10 because ~10 minutes/block
      result = Math.floor(minutesDifference / 10) + blockcount
    }
  } else {
    // parse date
    result = Date.parse(args.timestamp)
  }

  if (args.echo) {
    process.stdout.write(result.toString())
  } else {
    fs.writeFileSync(args.outputPath, result)
  }
}

const args = parseArgs()
validateArgs(args)
main(args)
  .catch(err => {
    console.log(err)
    process.exit(1)
  })
