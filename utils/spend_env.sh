#!/bin/bash

DATA_DIR=user
MNEMONIC_FILE=mnemonic.txt
REDEEM_FILE=redeem.txt
LOCKING_SCRIPT_FILE=locking.txt
TXN_HASH_FILE=txn-hash.txt
P2SH_ADDRESS_FILE=p2sh-address.txt
HD_PATH="m/44'/1'/1'/0/1"
NETWORK=testnet
TXN_VALUE='10000'
SMART_FEE_BLOCKS=1

mkdir -p $DATA_DIR

# TODO - handle change address properly
export HD_PATH
export NETWORK
export TXN_VALUE
export SMART_FEE_BLOCKS
export P2SH_ADDRESS_PATH=$DATA_DIR/$P2SH_ADDRESS_FILE
export REDEEM_SCRIPT_PATH=$DATA_DIR/$REDEEM_FILE
export LOCKING_SCRIPT_PATH=$DATA_DIR/$LOCKING_SCRIPT_FILE
export TXN_HASH_PATH=$DATA_DIR/$TXN_HASH_FILE
export MNEMONIC_PATH=$DATA_DIR/$MNEMONIC_FILE
export FIRST_ADDRESS=$(./bin/addresses.js -m $DATA_DIR/$MNEMONIC_FILE -p $HD_PATH -n 1 | tr -d '\n')
export CLTV=$(./bin/timelock.js -n $NETWORK -b -t $TIME_CLTV -e)
export N_LOCKTIME=$(./bin/timelock.js -n $NETWORK -b -t $TIME_N_LOCKTIME -e)

