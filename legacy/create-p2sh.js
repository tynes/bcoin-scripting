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
const { buildCLTVScript, buildp2shAddress } = require('./utilities')

// TODO - move all file names to cli args that accept the value or a file with the value
const MNEMONIC_FILE_PATH = 'mnemonic.txt';

(async () => {
  // check to see if seed file exists
  let mnemonic;
  try {
    mnemonic = new Mnemonic(fs.readFileSync(MNEMONIC_FILE_PATH).toString())
  } catch (e) {
    // no file found, creating and writing file
    mnemonic = new Mnemonic()
    fs.writeFileSync(MNEMONIC_FILE_PATH, mnemonic.toString())
  }

  // create master key
  const masterKey = HD.fromMnemonic(mnemonic)

  const derived = masterKey.derivePath("m/44'/1'/1'/0/0");
  const keyring = new Keyring(derived);
  const myAddress = keyring.getAddress()

  // log address
  console.log(myAddress.toString())

  const rpc = new RPCClient({ network: 'testnet' });
  const info = await rpc.execute('getblockchaininfo');

  // TODO - make this configurable
  const lockUntil = info.blocks + 1

  // send the coins to myself
  // TODO - use change address
  var redeemScript = buildCLTVScript(lockUntil, myAddress.hash)
  // write the script we used to disk
  fs.writeFileSync('unlockingscript.txt', redeemScript.toString())
  // create p2sh address
  const hashedRawScript = redeemScript.hash160();
  const p2sh = Address.fromScripthash(hashedRawScript, 'testnet')
  fs.writeFileSync('p2shAddress.txt', p2sh.toString())

  // create locking script
  const lockscript = Script.fromScripthash(hashedRawScript, 'testnet');
  fs.writeFileSync('lockingscript.txt', lockscript.toString())

  const client = new Client({
    network: 'testnet'
  })

  // TODO - generalize this
  // this is empty for some reason...
  const coins = await client.getCoinsByAddress(myAddress.toString());
  // so hardcode in the coin that we know we own...
  const coin = await client.getCoin('b4a412e1b81693712c8bf8080fa7cee7231c22d4ba3685d2af650da9b8b4f8d0', 0)
  const coinObj = Coin.fromJSON(coin)

  const spend = new MTX();

  spend.addOutput({
    address: p2sh,
    value: 100000
  })

  // send the change back to myself
  let tx = await spend.fund([coinObj], {
    rate: 7000,
    changeAddress: myAddress,
  })

  spend.sign(keyring)
  assert(spend.verify())

  const txn = spend.toTX().toRaw().toString('hex')

  let txnResponse;
  try {
    txnResponse = await rpc.execute('sendrawtransaction', [txn]);
  } catch (e) {
    console.log(e)
  }

  fs.writeFileSync('txnhash.txt', txnResponse)
  console.log(txnResponse);
  console.log('success')

})().catch(error => {
  console.log(`Error: ${error}`)
  process.exit(1)
})
