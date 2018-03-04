#!/usr/bin/env node

const process = require('process');
const program = require('commander');
const fs = require('fs');
const bcoin = require('bcoin');

const { getKeyring, getMnemonic, HDWalletPath } = require('./utilities')
const { parseInt } = require('./commanderUtilities')

const parseArgs = () => {
  return program
    .version('0.0.1')
    .option('-p, --derived-path <path>', 'hd wallet path')
    .option('-m, --mnemonic <path/literal>', 'path to file containing the mnemonic or the literal mnemonic itself')
    .option('-n, --number-of-keys <count>', parseInt)
    .parse(process.argv)
}

const main = (args) => {
  const mnemonic = getMnemonic(args.mnemonic) 

  const { numberOfKeys } = args
  const paths = []
  if (numberOfKeys > 1) {
    let path = args.derivedPath
    let wallet;
    // ugh this state is the worst
    for (let i = 0; i < numberOfKeys; i++) {
      wallet = new HDWalletPath(path)
      path = wallet.getPath()
      let keyring = getKeyring(mnemonic, path)
      const address = keyring.getAddress('base58')
      paths.push(address)
      // increment the path
      wallet = wallet.nextAddressIndex()
      path = wallet.getPath()
    }
  } else {
    const keyring = getKeyring(mnemonic, args.derivedPath)
    const address = keyring.getAddress('base58')
    paths.push(address)
  }
  return paths
}


// like in python, allows to be ran as a script or module
if (require.main) {
  const args = parseArgs()
  const result = main(args)
  for (let i = 0; i < result.length; i++) {
    process.stdout.write(`${result[i]}\n`)
  }
}

module.exports = {
  getAddresses: main
}

