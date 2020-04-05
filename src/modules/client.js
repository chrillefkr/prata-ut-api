import _debug from 'debug';
import assert from 'assert';
import WebSocket from 'isomorphic-ws';
import { parse as parseUrl } from 'url';
import axios from 'axios';
import urlJoin from 'url-join';

const debug = _debug('prata-ut:client');

export class Client {
  constructor(opts){
    assert(typeof opts.host === 'string' || opts.host instanceof String);
    let url = parseUrl(opts.host);
    this.url = parseUrl(opts.host).href;
    this.paths = {
      base: this.url,
      client: urlJoin(this.url, '/client'),
      session: urlJoin(this.url, '/session'),
    }
    this.client = opts.client ? opts.client : {};
    this.session = {};
    this.onMessageCallbacks = new Set();
    this.onSessionCallbacks = new Set();
    this.onStatusCallbacks = new Set();
    this.onDataCallbacks = new Set();
  }
  async getIdentity() {
    debug(`Requesting identity by POSTing ${this.paths.client}, data: ${JSON.stringify(this.client)}`)
    const { data } = await axios.post(this.paths.client, this.client);
    debug(`Received data: ${JSON.stringify(data)}`);
    this.client.id = data.id;
    debug(`ID: ${JSON.stringify(this.client.id)}`);
    return data;
  }
  hasSession() {
    return this.session.socket && this.session.socket.readyState === WebSocket.OPEN;
  }
  onMessage(cb) {
    if (typeof cb !== 'function') return false;
    this.onMessageCallbacks.add(cb);
    return true;
  }
  removeMessageHandler(cb) {
    if (typeof cb !== 'function') return false;
    this.onMessageCallbacks.delete(cb);
  }
  onSession(cb) {
    if (typeof cb !== 'function') return false;
    this.onSessionCallbacks.add(cb);
    return true;
  }
  removeSessionHandler(cb) {
    if (typeof cb !== 'function') return false;
    this.onSessionCallbacks.delete(cb);
  }
  awaitSession() {
    return new Promise((resolve) => {
      this.onSession(resolve);
    })
  }
  onStatus(cb) {
    if (typeof cb !== 'function') return false;
    this.onStatusCallbacks.add(cb);
    return true;
  }
  removeStatusHandler(cb) {
    if (typeof cb !== 'function') return false;
    this.onStatusCallbacks.delete(cb);
  }
  onData(cb) {
    if (typeof cb !== 'function') return false;
    this.onStatusCallbacks.add(cb);
    return true;
  }
  removeDataHandler(cb) {
    if (typeof cb !== 'function') return false;
    this.onDataCallbacks.delete(cb);
  }

  async sendMessage(message){
    return await this._send(JSON.stringify({
      type: 'message',
      data: message,
    }));
  }

  async _send(data) {
    if (!this.hasSession()) return false;
    return this.session.socket.send(data);
  }


  _handleStatus(status){
    for (const cb of this.onStatusCallbacks) {
      if (typeof cb !== 'function') continue;
      cb(status);
    }
    if (status.connection) {
      debug(`Received new connection status: ${status.connection}`);
      if (status.connection === 'established') for (const cb of this.onSessionCallbacks) {
        if (typeof cb !== 'function') continue;
        cb();
      }
    }
  }

  _handleMessage(message){
    for (const cb of this.onMessageCallbacks) {
      if (typeof cb !== 'function') continue;
      cb(message);
    }
  }

  _handleData(data) {
    // console.log('_handleData', data)
    for (const cb of this.onDataCallbacks) {
      if (typeof cb !== 'function') continue;
      cb(data);
    }
    let json = {};
    try {
      json = JSON.parse(data);
    } catch (error){
      // Nah
    }
    if (json.type && json.type === 'status' && json.data) {
      return this._handleStatus(json.data);
    } else if (json.type && json.type === 'message' && json.data) {
      return this._handleMessage(json.data);
    } else {
      throw new Error('Unknown data format received.')
    }
  }
  async initSession(role = 'listen') {
    const url = urlJoin(this.paths.session, '/' + role, '/' + this.client.id);
    debug(`Initializing session to URL ${JSON.stringify(url)}`);
    const ws = new WebSocket(url, {
      origin: this.paths.base,
    });
    this.session.socket = ws;

    ws.onopen = function open() {
      debug(`Socket connected.`);
      // console.log(ws);
      // ws.send(Date.now());
    };

    ws.onclose = function close() {
      debug('Socket disconnected');
    };

    ws.onmessage = (data) => {
      debug(`Received data: ${JSON.stringify(data.data)}`);
      this._handleData(data.data);
    };
  }
}
/*
const ws = new WebSocket('wss://echo.websocket.org/', {
  origin: 'https://websocket.org'
});

ws.onopen = function open() {
  console.log('connected');
  ws.send(Date.now());
};

ws.onclose = function close() {
  console.log('disconnected');
};

ws.onmessage = function incoming(data) {
  console.log(`Roundtrip time: ${Date.now() - data.data} ms`);

  setTimeout(function timeout() {
    ws.send(Date.now());
  }, 500);
};
*/

export default Client;
