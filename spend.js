const program = require('commander');

const process = require('process');
const fs = require('fs');
const path = require('path')
const assert = require('assert');

// TODO - this should not always be testnet
const bcoin = require('bcoin').set('testnet');
const Coin = bcoin.coin;
const crypto = bcoin.crypto;
const Script = bcoin.script;
const Opcode = bcoin.opcode;
const MTX = bcoin.mtx;
const Amount = bcoin.amount;
const { Client, Wallet, RPCClient } = bcoin.http;

const { buildCLTVScript, buildp2shAddress, getKeyring, getMnemonic, parseValue, getSmartFee } = require('./bin/utilities')
const { getLogger } = require('./bin/logger')

// TODO - modularize out into single file
// this is the same as in p2sh.js
const parseArgs = () => {
  return program
    .version('0.0.1')
    .option('-m, --mnemonic <path/literal>', 'path to file containing the mnemonic or the literal mnemonic itself')
    .option('-p, --derived-path <path>', 'hd wallet path')
    .option('-n, --network <network>', 'bitcoin network to use', /^(testnet|regtest)$/i)
    .option('-r, --recipient <address>', 'address to send funds to')
    .option('-a, --change-address <address>', 'address to send change to')
    .option('-s, --redeem-script-path <path>', 'path to a file read the redeem script from')
    .option('-q, --locking-script-path <path>', 'path to a file to read the locking script from')
    .option('-y, --p2sh-address-path <path>', 'path to a file read the p2sh address from')
    .option('-x, --txn-hash-path <path>', 'path to a file to read the tranaction hash from')
    .option('-f, --smart-fee-blocks <blocks>', 'estimate fee based on inclusion in the next number of blocks', parseInt)
    .option('-d, --dry-run', 'dry run')
    .parse(process.argv)
}

const validateArgs = args => {
  assert(args.recipient !== undefined)
}

const main = async (args, logger) => {
  const mnemonic = getMnemonic(args.mnemonic)
  const keyring = getKeyring(mnemonic, args.derivedPath)

  const rpc = new RPCClient({ network: args.network })
  const client = new Client({ network: args.network })

  // TODO - determine if we still need the txn hash
  const txnHash = fs.readFileSync(args.txnHashPath).toString()
  logger.debug(`Spending txn hash: ${txnHash}`)
  
  const p2shAddress = fs.readFileSync(args.p2shAddressPath)
  // this isn't fully safe since there could be multiple
  // outputs that are spendable by different scripts/pubkeys
  const rawCoins = await client.getCoinsByAddress(p2shAddress)
  // but it will work for this usecase
  logger.debug(`Found ${rawCoins.length} coin(s)`)
  
  const coins = rawCoins.map(c => Coin.fromJSON(c))

  // read redeem script and locking script from file
  logger.debug(`Reading redeem script from ${args.redeemScriptPath}`)
  const redeem = fs.readFileSync(args.redeemScriptPath).toString()
  logger.debug(`Using redeem script: ${redeem}`)
  logger.debug(`Reading locking script from ${args.lockingScriptPath}`)
  const lockingScript = fs.readFileSync(args.lockingScriptPath).toString()
  logger.debug(`Using locking script: ${lockingScript}`)

  // TODO - is this the best name?
  const prevScriptPubKey = Script.fromString(lockingScript)
  logger.debug(`${prevScriptPubKey}`)
  // not sure what this does
  keyring.script = prevScriptPubKey

  const spend = new MTX()
  // if the txn was created using this repo, we
  // can trust the magic number 0 because it always
  // will only put one output in the txn
  const coin = coins[0]
  spend.addCoin(coin)

  // get the fee, then subtract it from the total in the input
  const smartFee = await getSmartFee(rpc, args.smartFeeBlocks)
  logger.info(`Using smart fee: ${smartFee}`)
  const coinValue = Amount.fromBTC(coin.value).value
  logger.debug(`Value in utxo: ${coinValue}`)
  assert(smartFee < coinValue)
  const txnValue = coinValue - smartFee
  logger.debug(`Transaction value: ${txnValue}`)

  spend.addOutput({
    address: args.recipient,
    value: txnValue
  })

  // TODO - determine which fields need to be zeroed out
  
  // TODO - determine if correct amount of bytes when appending sighashall
  const rawWithSighashAll = Buffer.concat([spend.toRaw(), Buffer.from('01000000', 'hex')])
  const rawHashed = crypto.sha256(crypto.sha256(rawWithSighashAll))
  const privateKey = keyring.privateKey;
  const sig = keyring.sign(rawHashed, privateKey)

  logger.debug(`sig: ${sig.toString('hex')}`)

  // TODO - doing this right...?
  // need to append sighashall to the end of the signature
  const derStart = sig.readInt8(0).toString(16)
  const sequenceLen = (sig.readInt8(1) + 1).toString(16)
  const newder = Buffer.concat([Buffer.from(derStart, 'hex'), Buffer.from(sequenceLen, 'hex'), sig.slice(2), Buffer.from('01', 'hex')])
  logger.debug(`With sighashall: ${newder.toString('hex')}`)

  const publicKey = keyring.publicKey;
  logger.debug(`Using public key: ${publicKey.toString('hex')}`)


  const redeemRaw = Script.fromString(redeem.toString()).toRaw()
  const pubkey = Buffer.from(publicKey);
  const redeemOps = [Opcode.fromData(newder), Opcode.fromData(pubkey), Opcode.fromData(redeemRaw)]
  const redeemScript = Script.fromArray(redeemOps)


  spend.inputs[0].script = redeemScript;

  const txn = spend.toTX()
  console.log(txn)
  const rawTxn = txn.toRaw().toString('hex')

  logger.debug(`Final txn: ${rawTxn}`)
  if (args.dryRun) {
    logger.debug(`DRY RUN`)
    process.exit(0)
  }
  
  let txnResponse;
  try {
    // send it
    txnResponse = await rpc.execute('sendrawtransaction', [rawTxn]);
  } catch (e) {
    logger.error('Problem sending txn')
    logger.error(e)
  }

  logger.info('Transaction sent')
}


if (require.main) {
  const args = parseArgs()
  const logger = getLogger(path.basename(__filename), 'debug')
  validateArgs(args)
  main(args, logger)
    .catch(err => {
      logger.error(err)
      process.exit(1)
    })
}

module.exports = {
  main,
}
