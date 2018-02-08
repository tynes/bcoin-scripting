const process = require('process');

 /*
 Running a bcoin full node with:
 ./bin/bcoin --prefix ~/.bcoin-test --network testnet --http-port 18332 --no-auth
 */

const bcoin = require('bcoin');
const { mtx: MTX, Keyring: keying, Amount } = bcoin;
const Script = bcoin.script;
const assert = require('assert');
const Coin = bcoin.coin;
const opcodes = bcoin.script.opcodes;
const Opcode = bcoin.opcode;
const crypto = bcoin.crypto;
const base58 = bcoin.utils.base58;

// debug
const Input = bcoin.input;
const Outpoint = bcoin.outpoint;

const { Client, Wallet, RPCClient } = bcoin.http;

// I created these manually with the cli
// TODO - remember to never use the passphrase 'mark' for anything ever again
// TODO - make configurable software
const network = 'testnet';
const url = '127.0.0.1:18333'
const walletId = 'mark-2';
const passphrase = 'mark'

(async () => {
  const client = new Client({ network });

  const rpc = new RPCClient({ network });
  const info = await rpc.execute('getblockchaininfo');

  // make this configurable
  const lockUntil = info.blocks + 2

  try {
    createWalletResponse = await client.createWallet({
      'id': walletId
    });
  } catch(e) {
    console.error(`wallet with id ${walletId} already exists`)
  }

  const httpWallet = new Wallet({ id: walletId, network })
  const wallet = await httpWallet.getInfo()


  const address = wallet.account.receiveAddress;

  // TODO - investigate getCoinsByAddress
  const coins = await httpWallet.getCoins();
  if (coins.length === 0) {
    console.log(`Your wallet is empty! Please send Bitcoin to your address ${address}`);
    process.exit(0);
  }

  // send coins to self
  // TODO - changeAddress leads to better privacy
  const recipient = address;

  // now create txn
  const spend = new MTX()

  const Coins = coins.map(c => new Coin().fromJSON(c))

  spend.addOutput({
    address: recipient,
    value: 1000,
  });

  let tx = await spend.fund(Coins, {
    rate: 10000,
    changeAddress: address
  })

  let signedTx;
  try {
    signedTx = await httpWallet.sign(spend, { passphrase })
  } catch (e) {
    console.log(e)
  }

  // turn it into a raw txn
  const rawTxn = signedTx.hex

  let txnResponse;
  try {
    // send it
    txnResponse = await rpc.execute('sendrawtransaction', [rawTxn]);
  } catch (e) {
    console.log(e)
  }

  console.log(txnResponse);

})().catch(err => {
  console.error(err);
  process.exit(1);
})
