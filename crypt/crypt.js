const { randomUUID } = require('crypto');
const fs = require('fs')
const yargs = require('yargs')
const { subtle } = require('crypto').webcrypto;
const { hideBin } = require('yargs/helpers')

const iv = new Uint8Array([ 138, 34, 38, 4, 144, 89, 15, 5, 155, 11, 244, 21])

const ViewSizeDefaults = {
  minSizeFiletree: 10,
  maxSizeFiletree: 30,
  minSizeTab: 10,
  maxSizeTab: 100,
  minSizeTerminal: 10,
  maxSizeTerminal: 100,
  minSizeTop: 30,
  maxSizeTop: 100
}

const ViewDefaultSettings = {
  'filetree': { group: 0, order: 0, size: 20, visible: true, minSize: ViewSizeDefaults.minSizeFiletree, maxSize: ViewSizeDefaults.maxSizeFiletree },
  'left': { group: 0, order: 1, size: 0, visible: false, minSize: ViewSizeDefaults.minSizeTab, maxSize: ViewSizeDefaults.maxSizeTab },
  'right': { group: 0, order: 2, size: 0, visible: false, minSize: ViewSizeDefaults.minSizeTab, maxSize: ViewSizeDefaults.maxSizeTab },
  'emptyMessage': { group: 0, order: 3, size: 80, visible: true, minSize: 0, maxSize: 100 },
  'code': { group: 1, order: 0, size: 100, visible: false, minSize: ViewSizeDefaults.minSizeTop, maxSize: ViewSizeDefaults.maxSizeTop },
  'terminal': { group: 1, order: 1, size: 20, visible: false, minSize: ViewSizeDefaults.minSizeTerminal, maxSize: ViewSizeDefaults.maxSizeTerminal }
}

yargs(hideBin(process.argv))
  .scriptName('cryptoberry')
  .command('key', 'Generate a key and store it in a file (overwrites existing files!)', (yargs) => {
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
  .command('config', 'Generate config with a unique UUID and some default values', (yargs) => {
    yargs.option('path', {
      alias: 'p',
      demandOption: false,
      describe: 'Location of the generated config',
      default: 'config.json',
      type: 'string'
    }),
    yargs.option('type', {
      alias: 't',
      demandOption: true,
      describe: 'Type of the generated config (LESSON or SANDBOX)',
      type: 'string'
    }),
    yargs.option('name', {
      alias: 'n',
      demandOption: true,
      describe: 'Name of the lesson/sandbox',
      type: 'string'
    })
  }, args => {
    generateConfig(args.path, args.type, args.name);
  })
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

function generateConfig(outpath, type, name) {
  const path = outpath.endsWith('.json') ? outpath : `${outpath}.json`;

  if (name.trim().length === 0) {
    throw new Error('Name is not allowed to be empty');
  }

  if (type !== 'LESSON' && type !== 'SANDBOX') {
    throw new Error(`Invalid type ${type} supplied`);
  }

  const config = {
    open: [],
    uuid: randomUUID(),
    name: name ,
    type: type,
    splitSettings: ViewDefaultSettings,
    unityEntryPoint: '',
    encrypted: [],
    hidden: [],
    external: [],
    modules: [],
    readonly: [],
    glossaryEntryPoint: '',
    hintRoot: '',
    preloadPythonLibs: [],
    tabinfo: '__tabinfo'
  }

  fs.writeFileSync(path, JSON.stringify(config, null, 2));  
}
  
exports.crypt = crypt;
exports.importKey = importKey;
exports.generateKey = generateKey;
exports.encryptForBuild = encryptForBuild;