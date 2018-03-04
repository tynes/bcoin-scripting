const process = require('process');
const fs = require('fs')
const path = require('path')
const assert = require('assert');

// TODO - this should not always be testnet
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
const { buildCLTVScript, buildp2shAddress, getKeyring, getMnemonic, parseValue } = require('./bin/utilities')
const { parseInt } = require('./bin/commanderUtilities')
const { getLogger } = require('./bin/logger')

const program = require('commander');

/*
 * 
 */

const parseArgs = () => {
  return program
    .version('0.0.1')
    .option('-m, --mnemonic <path/literal>', 'path to file containing the mnemonic or the literal mnemonic itself')
    .option('-p, --derived-path <path>', 'hd wallet path')
    .option('-n, --network <network>', 'bitcoin network to use', /^(testnet|regtest)$/i)
    .option('-l, --n-locktime <locktime>', 'value of nLocktime', parseInt)
    .option('-c, --checklocktime-input <checklocktime>', 'input to OP_CHECKLOCKTIMEVERIFY', parseInt)
    .option('-r, --recipient <address>', 'address to send funds to')
    .option('-a, --change-address <address>', 'address to send change to')
    .option('-s, --redeem-script-path <path>', 'path to a file write the redeem script to')
    .option('-q, --locking-script-path <path>', 'path to a file to write the locking script to')
    .option('-x, --txn-hash-path <path>', 'path to a file to write the tranaction hash to')
    .option('-w, --bcoin-wallet-id <id>', 'bcoin wallet id for http wallet')
    .option('-v, --send-value <value>', 'amount of value to send in satoshis or bitcoin', parseInt)
    .option('-f, --smart-fee-blocks <blocks>', 'estimate fee based on inclusion in the next number of blocks', parseInt)
    .option('-d, --dry-run', 'dry run')
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


const main = async (args, logger) => {
  const mnemonic = getMnemonic(args.mnemonic)
  const keyring = getKeyring(mnemonic, args.derivedPath)
  const rpc = new RPCClient({ network: args.network });
  const info = await rpc.execute('getblockchaininfo') 
  const lockUntil = args.checklocktimeInput
  const recipientAddress = Address.fromBase58(args.recipient)

  const redeemScript = buildCLTVScript(lockUntil, recipientAddress.hash)
  fs.writeFileSync(args.redeemScriptPath, redeemScript.toString())
  logger.debug(`Wrote redeem script to file ${args.redeemScriptPath}`)
  
  // spend to this address?
  const hashedRawScript = redeemScript.hash160();
  logger.debug(`Hashed script: ${hashedRawScript}`)

  // create p2sh address
  const p2sh = Address.fromScripthash(hashedRawScript, args.network)

  // create locking script
  const lockscript = Script.fromScripthash(hashedRawScript, args.network);
  fs.writeFileSync(args.lockingScriptPath, lockscript.toString())

  const client = new Client({ network: args.network })
  const rawCoins = await client.getCoinsByAddress(recipientAddress.toString())
  const coins = rawCoins.map(c => Coin.fromJSON(c))

  const sendValue = parseValue(args.sendValue)

  // calculate smartfee based on user input
  const rawSmartFee = await rpc.execute('estimatesmartfee', [args.smartFeeBlocks])
  const smartFee = Amount.fromBTC(rawSmartFee.fee).value 
  logger.info(`Using smart fee ${smartFee}`)

  const spend = new MTX();
  spend.addOutput({
    address: p2sh,
    value: sendValue,
  });

  const tx = await spend.fund(coins, {
    rate: smartFee,
    changeAddress: args.changeAddress
  })

  // sign and verify the transaction
  spend.sign(keyring)
  assert(spend.verify())
  logger.debug('Transaction successfully verified')

  const txn = spend.toTX().toRaw().toString('hex')

  if (args.dryRun) {
    logger.info('DRY RUN')
    process.exit(0)
  }

  let txnResponse;
  try {
    txnResponse = await rpc.execute('sendrawtransaction', [txn]);
  } catch (e) {
    logger.error('Problem sending txn')
    logger.error(e)
    throw (e)
  }

  fs.writeFileSync(args.txnHashPath, txnResponse)
  logger.info({transaction_id: txnResponse}, 'Transaction successfully sent')
}

// script starting point
if (require.main) {
  const args = parseArgs()
  const logger = getLogger(path.basename(__filename))
  validateArgs(args)
  main(args, logger)
    .catch(err => {
      logger.error(err)
      process.exit(1)
    })
}

module.exports = {
  createp2sh: main,
}
