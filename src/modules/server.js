import _debug from 'debug';
import assert from 'assert';
import http from 'http';
import { parse as parseUrl } from 'url';
import { v4 as uuid } from 'uuid';
import WebSocket from 'isomorphic-ws';

const debug = _debug('prata-ut:server');

export class Server {
  constructor(opts) {
    opts.port = Number(opts.port) || 8080;
    this.server = http.createServer((req, res) => {
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        let json = {};
        try {
          json = JSON.parse(body);
        } catch (err) {

        }
        const url = parseUrl(req.url, true);
        if (url.pathname === '/client' && req.method === 'POST') {
          return res.end(JSON.stringify({
            id: json.id || uuid()
          }));
        }
        res.end();
      });
    });
    this.server.on('upgrade', (request, socket, head) => {
      const url = parseUrl(request.url, true);
      if (!url.pathname.startsWith('/session')) return socket.destroy();
      return this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    })
    // this.wss = new WebSocket.Server({ server: this.server, path: '/session' });
    this.wss = new WebSocket.Server({
      noServer: true
    });
    this.wss.on('connection', function connection(ws) {
      debug(`Client connected`);
      debug(`Will send OK message in 1 second`);
      setTimeout(()=>{
        ws.send(JSON.stringify({
          type: 'status',
          data: {
            connection: 'established'
          }
        }));
        setInterval(()=>{
          ws.send(JSON.stringify({
            type: 'message',
            data: "This is a message, sent every five second."
          }));
        }, 5000);
      }, 1000);
      // console.log(ws);
      ws.on('message', (data) => {
        console.log('Received: %s', JSON.stringify(data));
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (error){
          // Nah
        }
        if (json.type && json.type === 'message' && json.data){
          const message = json.data
          ws.send(JSON.stringify({
            type: 'message',
            data: `You said ${JSON.stringify(message)}`
          }));
        }
      });

      // ws.send('something');
    });
    this.server.listen(opts.port);

  }
}


export default Server;
