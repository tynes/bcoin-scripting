# bcoin-scripting
Hacking on bitcoin transactions with [bcoin](https://github.com/bcoin-org/bcoin)

NOTE: This is a work in progress and not intended to be used on mainnet

Make sure to have `bcoin` installed
These scripts currently are hardcoded against the testnet, be sure to sync the testnet first with:

```
bcoin --network testnet --http-port 18332 --no-auth
```
If you want to specify a different directory to store the blockchain data besides `~/.bcoin`, provide a `prefix`
parameter. I use:

```
./bin/bcoin --prefix ~/.bcoin-test --network testnet --http-port 18332 --no-auth
```

NOTE: Use auth on mainnet

The file `basic-txn.js` builds and spends a transaction. It assumes that you created a `bcoin`
wallet that has some coin in it already. Use a testnet faucet to get some coin on the testnet

The files `create-p2sh.js` and `spend-p2sh.js` attempt to build a CLTV transaction.
Attempting to more manually sign the transaction in `spend-p2sh.js`, `CHECKSIG` fails
so still in the process of debugging that.

Major todos:
- Make configurable with cli args
- Fix manual signing process
