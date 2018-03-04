#!/bin/bash

./node_modules/bcoin/bin/bcoin --prefix ~/.bcoin-testnet \
    --network testnet \
    --http-port 18332 \
    --no-auth \
    --coin-cache 100 \
    --index-tx \
    --index-address \
    --persistent-mempool \
    --cache-size 64

