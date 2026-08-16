import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { attachWebSocketServer } from "../src/websocket-server.js";

test("websocket server authenticates and exchanges text frames", async () => {
  const server = createServer(), hub = attachWebSocketServer(server, { token: "1234567890123456", path: "/documentary" }); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); const { port } = server.address(), received = new Promise(resolve => hub.once("connection", peer => { peer.once("message", message => { resolve(message); peer.send({ ok: true }); }); })), socket = new WebSocket(`ws://127.0.0.1:${port}/documentary?token=1234567890123456`); await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); }); const reply = new Promise(resolve => socket.addEventListener("message", event => resolve(JSON.parse(event.data)), { once: true })); socket.send("hello"); assert.equal(await received, "hello"); assert.deepEqual(await reply, { ok: true }); socket.close(); await new Promise(resolve => server.close(resolve));
});
