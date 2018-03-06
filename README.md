# bcoin-scripting
Hacking on bitcoin transactions with [bcoin](https://github.com/bcoin-org/bcoin)

NOTE: This is a work in progress and not intended to be used on mainnet

To start the `testnet`, run `./start.sh`

Make sure that the `testnet` is fully synced, because these scripts depend on that

In progress dev create p2sh script:
```bash
source utils/create_env.sh && node p2sh.js \
    -m $MNEMONIC_PATH -p $HD_PATH \
    -n $NETWORK -l $CLTV -c $N_LOCKTIME \
    -r $FIRST_ADDRESS -s $REDEEM_SCRIPT_PATH \
    -q $LOCKING_SCRIPT_PATH -v $TXN_VALUE \
    -f $SMART_FEE_BLOCKS -a $FIRST_ADDRESS \
    -x $TXN_HASH_PATH -y $P2SH_ADDRESS_PATH -d
```

In progress dev spend p2sh script:
```bash
source utils/spend_env.sh && node --inspect-brk spend.js \
    -m $MNEMONIC_PATH -p $HD_PATH \
    -n $NETWORK -s $REDEEM_SCRIPT_PATH \
    -q $LOCKING_SCRIPT_PATH -x $TXN_HASH_PATH \
    -y $P2SH_ADDRESS_PATH -r $FIRST_ADDRESS -d
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
