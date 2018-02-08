const bcoin = require('bcoin').set('testnet');

const opcodes = bcoin.script.opcodes;
const Opcode = bcoin.opcode;
const Script = bcoin.script;
const crypto = bcoin.crypto;
const base58 = bcoin.utils.base58;
const Address = bcoin.address;

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

const buildp2shAddress = (hash) => {
  const versionedRawScript = Buffer.concat([Buffer.from('05', 'hex'), hash])
  const rawScriptChecksum = crypto.sha256(crypto.sha256(versionedRawScript)).toString('hex').slice(0,8)
  const fullRawScript = Buffer.concat([versionedRawScript, Buffer.from(rawScriptChecksum, 'hex')])
  const p2shFullAddress = base58.encode(fullRawScript)
  return Address.fromBase58(p2shFullAddress);
}

module.exports = {
  buildCLTVScript,
  buildp2shAddress,
};
