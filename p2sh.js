const process = require('process');
const fs = require('fs')
const assert = require('assert');

 /* ./bin/bcoin --prefix ~/.bcoin-test --network testnet --http-port 18332 --no-auth */

const bcoin = require('bcoin').set('testnet');
const MTX = bcoin.mtx;
const Keyring = bcoin.keyring;
const Amount = bcoin.amount;
const Script = bcoin.script;
const Coin = bcoin.coin;
const opcodes = bcoin.script.opcodes;
const Opcode = bcoin.opcode;
const crypto = bcoin.crypto;
const Address = bcoin.address;
const Mnemonic = bcoin.hd.Mnemonic;
const HD = bcoin.hd;
// debug
const base58 = bcoin.utils.base58;
const Input = bcoin.input;
const Outpoint = bcoin.outpoint;
const TX = bcoin.tx;
const Coinview = bcoin.coinview;
const { Client, Wallet, RPCClient } = bcoin.http;
const { buildCLTVScript, buildp2shAddress, getKeyring, getMnemonic } = require('./bin/utilities')

const program = require('commander');

/*
 * 
 */

const parseInt = arg => +arg

const parseArgs = () => {
  return program
    .version('0.0.1')
    .option('-m, --mnemonic <path/literal>', 'path to file containing the mnemonic or the literal mnemonic itself')
    .option('-p, --derived-path <path>', 'hd wallet path')
    .option('-n, --network <network>', 'bitcoin network to use', /^(testnet|regtest)$/i)
    .option('-l, --n-locktime <locktime>', 'value of nLocktime', parseInt)
    .option('-c, --checklocktime-input <checklocktime>', 'input to OP_CHECKLOCKTIMEVERIFY', parseInt)
    .option('-r, --recipient <address>', 'address to send funds to')
    .parse(process.argv)
}

// throw error here if problem
const validateArgs = args => {
  let msg;
  // validate required arguments
  if (!args.nLocktime || !args.checklocktimeInput) {
    msg = `Must provide values for nLocktime and CLTV input: ${args.nLocktime}, ${args.checklocktimeInput}`
    throw new Error(msg)
  }
  // check to make sure that both n-locktime and checklocktime input are in the same format
  // if 0 < n < 500_000_000 then it references block height
  // if n > 500_000_000 then it references unix epoch timestamp
  const upperBound = 500000000
  if ((args.nLocktime > upperBound && args.checklocktimeInput < upperBound)
      || (args.nLocktime < upperBound && args.checklocktimeInput > upperBound)) {
    msg = `Must provide the same format for n-locktime and checklocktime-input: ${args.nLocktime}, ${args.checklocktimeInput}`
    throw new Error(msg)
  }
}


const main = async (args) => {
  const mnemonic = getMnemonic(args.mnemonic)
  const keyring = getKeyring(mnemonic, args.derivedPath)
  
  const rpc = new RPCClient({ network: args.network });
  const info = await rpc.execute('getblockchaininfo') 
  console.log(info)


}

// script starting point
const args = parseArgs()
validateArgs(args)
main(args)
  .catch(err => {
    console.log(err)
    process.exit(1)
  })

