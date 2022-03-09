const fs = require('fs')
const yargs = require('yargs')
const { subtle } = require('crypto').webcrypto;
const { hideBin } = require('yargs/helpers')

const iv = new Uint8Array([ 138, 34, 38, 4, 144, 89, 15, 5, 155, 11, 244, 21])

yargs(hideBin(process.argv))
  .scriptName('cryptoberry')
  .command('generate', 'Generate a key and store it in a file.', (yargs) => {
    yargs.option('path', {
      alias: 'p',
      default: './key',
      describe: 'Path of the generatede key file',
      type: 'string'
    })
  }, (args => {
    const path = args.path ? args.path : './key';
    generateKey(path);
  }))
  .command('encrypt', 'Encrypt file', (yargs) => {
    yargs.option('key', {
      alias: 'k',
      demandOption: true,
      describe: 'Location of the key file',
      type: 'string'
    }),
    yargs.option('file', {
      alias: 'f',
      demandOption: true,
      describe: 'File to encrypt',
      type: 'string'
    }),
    yargs.option('output', {
      alias: 'o', 
      demandOption: true,
      describe: 'Output path',
      type: 'string'
    })
  }, args => {
    crypt(true, args.key, args.file, args.output)
  })
  .command('decrypt', 'Decrypt file', (yargs) => {
    yargs.option('key', {
      alias: 'k',
      demandOption: true,
      describe: 'Location of the key file',
      type: 'string'
    }),
    yargs.option('file', {
      alias: 'f',
      demandOption: true,
      describe: 'File to decrypt',
      type: 'string'
    }),
    yargs.option('output', {
      alias: 'o', 
      demandOption: true,
      describe: 'Output for plaintext',
      type: 'string'
    })
  }, args => {
    crypt(false, args.key, args.file, args.output)
  })
  .argv

async function importKey(path) {
  try {
    console.log
    const file = fs.readFileSync(path);
    const key = await subtle.importKey("jwk", JSON.parse(file), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    return key;
  } catch (e) {
    console.error(e);
  }
}

async function generateKey(path) {
  const key = await subtle.generateKey({
    name: "AES-GCM",
    length: 256
  }, true, ["decrypt", "encrypt"])

  const ex = await exportKey(key);
  fs.writeFileSync(path, JSON.stringify(ex, null, 2));

  return key;
}

async function crypt(encrypt, keypath, inpath, outpath) {
  const key = await importKey(keypath);

  try {
    const content = fs.readFileSync(inpath);
    let text;
    
    if (encrypt) {
       text = await subtle.encrypt({
        name: 'AES-GCM',
        iv,
      }, key, content);

    } else {
      text = await subtle.decrypt({
        name: 'AES-GCM',
        iv,
      }, key, content);
    }

    fs.writeFileSync(outpath, Buffer.from(text));
  } catch (err) {
    console.error(err)
  }  
}

async function encryptForBuild(keypath, buffer) {
  const key = await importKey(keypath);
  const text = await subtle.encrypt({
    name: 'AES-GCM',
    iv,
  }, key, buffer);

  return Buffer.from(text);
}
  
exports.crypt = crypt;
exports.importKey = importKey;
exports.generateKey = generateKey;
exports.encryptForBuild = encryptForBuild;