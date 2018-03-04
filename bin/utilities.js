// TODO - this shouldn't always be testnet
const bcoin = require('bcoin').set('testnet');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// bcoin helpers
const Mnemonic = bcoin.hd.Mnemonic;
const Keyring = bcoin.keyring;
const opcodes = bcoin.script.opcodes;
const Opcode = bcoin.opcode;
const HD = bcoin.hd;
const Script = bcoin.script;
const crypto = bcoin.crypto;
const base58 = bcoin.utils.base58;
const Address = bcoin.address;
const Amount = bcoin.amount;

// create a globally scoped logger for this module
const { getLogger } = require('./logger')
const logger = getLogger(path.basename(__filename))

// hash is the pubkeyhash of the recipient
const buildCLTVScript = (lockUntil, hash) => {
  const script = []
  script.push(Opcode.fromInt(lockUntil))
  script.push(Opcode.fromOp(opcodes.OP_CHECKLOCKTIMEVERIFY))
  script.push(Opcode.fromOp(opcodes.OP_DROP))
  script.push(Opcode.fromOp(opcodes.OP_DUP))
  script.push(Opcode.fromOp(opcodes.OP_HASH160))
  // TODO - fix this! assumes 160 bit hash
  script.push(new Opcode(0x14, hash))
  script.push(Opcode.fromOp(opcodes.OP_EQUALVERIFY))
  script.push(Opcode.fromOp(opcodes.OP_CHECKSIG))
  return Script.fromArray(script)
}

// TODO - debug this
const buildp2shAddress = (hash) => {
  const versionedRawScript = Buffer.concat([Buffer.from('05', 'hex'), hash])
  const rawScriptChecksum = crypto.sha256(crypto.sha256(versionedRawScript)).toString('hex').slice(0,8)
  const fullRawScript = Buffer.concat([versionedRawScript, Buffer.from(rawScriptChecksum, 'hex')])
  const p2shFullAddress = base58.encode(fullRawScript)
  return Address.fromBase58(p2shFullAddress);
}

// get a keyring using a mnemonic and path
const getKeyring = (mnemonic, derivedPath) => {
  const masterKey = HD.fromMnemonic(mnemonic)
  const derived = masterKey.derivePath(derivedPath)
  return new Keyring(derived)
}

// try to read file, otherwise it is assumed to be a literal mnemonic passed in
const getMnemonic = pathOrLiteral => {
  try {
    const literal = fs.readFileSync(pathOrLiteral).toString()
    return new Mnemonic(literal)
  } catch (e) {
    // no file found, it must be a literal
    return new Mnemonic(pathOrLiteral)
  };
}

// assumes that if value contains a '.', then the value is
// in BTC, otherwise it is in satoshis
const parseValue = value => {
  assert.equal(typeof value, 'number')
  if (value.toString().includes('.')) {
    // assume btc value
    return Amount.fromBTC(value).value
  } 
  // assume satoshi value
  return Amount.fromSatoshis(value).value
}

class HDWalletPath {
  constructor(path) {
    this.rawPath = path
    this.parse(path)
  }
  parse(path) {
    const indices = path.split('/')
    assert(indices.length == 6)
    assert(indices[0] == 'm')
    let [ m, purpose, coinType, account, change, addressIndex ] = indices
    this.purpose = {
      value: purpose,
      hardened: this.isHardened(purpose)
    }
    this.coinType = {
      value: coinType,
      hardened: this.isHardened(coinType)
    }
    this.account = {
      value: account,
      hardened: this.isHardened(account)
    }
    this.change = {
      value: change,
      hardened: this.isHardened(change)
    }
    this.addressIndex = {
      value: addressIndex,
      hardened: this.isHardened(addressIndex)
    }
  }

  isHardened(index) {
    return index.slice(-1) == "'"
  }

  getPath() {
    return this.rawPath
  }

  incrementIndex(index) {
    let value;
    if (index.hardened) {
      value = +index.value.slice(0, index.value.length - 1) + 1
      value = `${value}'`
    } else {
      value = +index.value + 1
    }
    return value
  }

  nextAddressIndex() {
    const nextValue = this.incrementIndex(this.addressIndex);
    const path = `m/${this.purpose.value}/${this.coinType.value}/${this.account.value}/${this.change.value}/${nextValue}`
    return new HDWalletPath(path)
  }
}

module.exports = {
  buildCLTVScript,
  buildp2shAddress,
  getKeyring,
  getMnemonic,
  HDWalletPath,
  parseValue,
};
