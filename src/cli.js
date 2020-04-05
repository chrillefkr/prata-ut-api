import Server from './modules/server.js';
import Client from './modules/client.js';
import arg from 'arg';

import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin, //or fileStream
  output: process.stdout
});

function parseArguments(rawArgs) {
  const args = arg({
    '--server': Boolean,
    '-s': '--server',
    '--client-id': String,
    '-I': '--client-id',
    '--role': String,
    '-r': '--role'
  }, {
    argv: rawArgs.slice(2),
  });
  return {
    server: args['--server'] || false,
    host: args._[0],
    client: {
      id: args['--client-id'],
    },
    session: {
      role: args['--role'] || 'listen',
    },
  };
}

function createServer(opts){
  return new Server(opts);
}

async function createClient(opts){
  let client = new Client(opts);
  let { id } = await client.getIdentity();
  client.onMessage(message => {
    console.log(`Received message: ${JSON.stringify(message)}`);
  });
  client.onData(data => {
    let json = null;
    try {
      json = JSON.parse(data);
    } catch (error){
      return console.log(`Received data which isn't JSON: ${JSON.stringify(data)}`)
    }
    if (!['message', 'status'].some(a => json.type == a)) {
      return console.log(`Received unknown message data type: ${JSON.stringify(json.type)}`)
    }
    console.log(`Data: ${json}`)
  });
  await client.initSession(opts.session.role);
  console.log('Awaiting session');
  await client.awaitSession();
  console.log('Got a session');
  for await (const line of rl) {
    await client.sendMessage(line);
    // console.log('Sent message', line)
  }

}

export function cli(args) {
  let opts = parseArguments(args);
  if (opts.server) return createServer(opts);
  return createClient(opts);
}
