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
const { buildCLTVScript, buildp2shAddress } = require('../utilities')

const MNEMONIC_FILE_PATH = 'mnemonic.txt';

// outside of this file, need to create new txn using this wallets address in the locking script

// check to see if nmenoic file exists
// if not, create mnemonic
// create keyring

// get p2sh txnid from file, turn into coin object
// create MTX
// add the p2sh coin as an input
// create an output to self with standard p2pkh script
// get redeem script from file
// figure out how to sign the txn using the keyring
// send the txn
(async () => {
  const mnemonic = new Mnemonic(fs.readFileSync(MNEMONIC_FILE_PATH).toString())
  // create master key
  const masterKey = HD.fromMnemonic(mnemonic)
  const derived = masterKey.derivePath("m/44'/1'/1'/0/0");
  const keyring = new Keyring(derived);
  const myAddress = keyring.getAddress()

  const client = new Client({ network: 'testnet' });
  const rpc = new RPCClient({ network: 'testnet' });

  const txnHash = fs.readFileSync('txnhash.txt').toString();
  const coin = await client.getCoin(txnHash, 0);
  // console.log(Script.fromRaw(Buffer.from(coin.script, 'hex')))
  const coinObj =  Coin.fromJSON(coin);

  const redeem = fs.readFileSync('unlockingscript.txt');
  const lockingScript = fs.readFileSync('lockingscript.txt');
  const prevScriptPubKey = Script.fromString(lockingScript.toString());

  keyring.script = prevScriptPubKey;

  // now create txn
  const toSign = new MTX()

  toSign.addCoin(coinObj)

  toSign.scriptInput(0, coinObj, keyring)
  toSign.signInput(0, coinObj, keyring)

  // pay to self here
  toSign.addOutput({
    address: myAddress.toString(),
    value: 90000,
  })

  //toSign.inputs[0].script = prevScriptPubKey;

  console.log(toSign)
  process.exit(0)
  // lets sign the txn
  // TODO - make sure proper suffix
  const rawWithSighashAll = Buffer.concat([toSign.toRaw(), Buffer.from('01000000', 'hex')])
  const rawHashed = crypto.sha256(crypto.sha256(rawWithSighashAll))
  const privateKey = keyring.privateKey;
  const sig = crypto.secp256k1.sign(rawHashed, privateKey)

  // need to append sighashall to the end of the signature
  const derStart = sig.readInt8(0).toString(16)
  const sequenceLen = (sig.readInt8(1) + 1).toString(16)

  const newder = Buffer.concat([Buffer.from(derStart, 'hex'), Buffer.from(sequenceLen, 'hex'), sig.slice(2), Buffer.from('01', 'hex')])
  console.log(newder.toString('hex'))
  const publicKey = keyring.publicKey;

  // TODO - add sig and pubkey hash to redeemScript
  const redeemRaw = Script.fromString(redeem.toString()).toRaw()
  const pubkey = Buffer.from(publicKey);
  const redeemOps = [Opcode.fromData(newder), Opcode.fromData(pubkey), Opcode.fromData(redeemRaw)]
  const redeemScript = Script.fromArray(redeemOps)

  const spend = new MTX()
  spend.addCoin(coinObj);
  spend.addOutput({
    address: myAddress.toString(),
    value: 90000,
  })
  spend.inputs[0].script = redeemScript

  console.log(spend.toRaw().toString('hex'))

  // TODO - failing a sig verify, need to go in depth there
  process.exit(0)

  // TODO - debug this breaking
  const txn = spend.toTX()
  console.log(txn)
  const rawTxn = txn.toRaw().toString('hex')
  console.log(rawTxn)
  let txnResponse;
  try {
    // send it
    txnResponse = await rpc.execute('sendrawtransaction', [rawTxn]);
  } catch (e) {
    console.log(e)
  }

  fs.writeFileSync('txnhash-spend.txt', txnResponse)
  console.log(txnResponse);

})().catch(err => {
  console.log(err)
  process.exit(1)
})
