const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";
const rooms = new Map();
let nextClientId = 1;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer((request, response) => {
  let pathname = decodeURIComponent(new URL(request.url, `http://${host}:${port}`).pathname);
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.normalize(path.join(root, pathname));
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(data);
  });
});

server.on("upgrade", (request, socket) => {
  if (request.headers.upgrade?.toLowerCase() !== "websocket") {
    socket.destroy();
    return;
  }

  const key = request.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }

  const accept = crypto
    .createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");

  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "",
    "",
  ].join("\r\n"));

  const client = {
    id: `c${nextClientId++}`,
    socket,
    buffer: Buffer.alloc(0),
    roomCode: null,
    player: null,
  };

  sendJson(client, { type: "connected", clientId: client.id });
  socket.on("data", (chunk) => receiveFrames(client, chunk));
  socket.on("close", () => leaveRoom(client));
  socket.on("error", () => leaveRoom(client));
});

function receiveFrames(client, chunk) {
  client.buffer = Buffer.concat([client.buffer, chunk]);

  while (client.buffer.length >= 2) {
    const first = client.buffer[0];
    const second = client.buffer[1];
    const opcode = first & 0x0f;
    const masked = (second & 0x80) === 0x80;
    let length = second & 0x7f;
    let offset = 2;

    if (length === 126) {
      if (client.buffer.length < offset + 2) return;
      length = client.buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      if (client.buffer.length < offset + 8) return;
      const high = client.buffer.readUInt32BE(offset);
      const low = client.buffer.readUInt32BE(offset + 4);
      length = high * 2 ** 32 + low;
      offset += 8;
    }

    const maskOffset = masked ? 4 : 0;
    if (client.buffer.length < offset + maskOffset + length) return;

    const mask = masked ? client.buffer.subarray(offset, offset + 4) : null;
    offset += maskOffset;
    const payload = Buffer.from(client.buffer.subarray(offset, offset + length));
    client.buffer = client.buffer.subarray(offset + length);

    if (opcode === 0x8) {
      client.socket.end();
      return;
    }
    if (opcode !== 0x1) continue;

    if (mask) {
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] ^= mask[index % 4];
      }
    }

    try {
      handleMessage(client, JSON.parse(payload.toString("utf8")));
    } catch {
      sendJson(client, { type: "error", message: "잘못된 메시지입니다." });
    }
  }
}

function handleMessage(client, message) {
  if (message.type === "create_room") {
    createRoom(client, message);
    return;
  }

  if (message.type === "join_room") {
    joinRoom(client, message);
    return;
  }

  if (!client.roomCode || !rooms.has(client.roomCode)) {
    sendJson(client, { type: "error", message: "먼저 방에 들어가세요." });
    return;
  }

  const room = rooms.get(client.roomCode);
  if (message.type === "state_sync") {
    room.mapId = message.mapId || room.mapId;
    room.snapshot = message.snapshot || null;
    broadcast(room, {
      type: "state_sync",
      roomCode: room.code,
      mapId: room.mapId,
      snapshot: room.snapshot,
      fromPlayer: client.player,
    }, client);
    return;
  }

  if (message.type === "start_game") {
    room.mapId = message.mapId || room.mapId;
    room.snapshot = null;
    broadcast(room, {
      type: "start_game",
      roomCode: room.code,
      mapId: room.mapId,
      fromPlayer: client.player,
    });
    return;
  }

  if (message.type === "leave_room") {
    leaveRoom(client);
  }
}

function createRoom(client, message) {
  leaveRoom(client, { silent: true });
  const room = {
    code: createRoomCode(),
    mapId: String(message.mapId || "well"),
    snapshot: null,
    clients: new Set(),
  };
  rooms.set(room.code, room);
  attachClientToRoom(client, room, "south");
  sendJson(client, {
    type: "room_joined",
    roomCode: room.code,
    player: "south",
    mapId: room.mapId,
    players: room.clients.size,
  });
}

function joinRoom(client, message) {
  const roomCode = String(message.roomCode || "").trim().toUpperCase();
  const room = rooms.get(roomCode);
  if (!room) {
    sendJson(client, { type: "error", message: "방을 찾을 수 없습니다." });
    return;
  }
  if (room.clients.size >= 2 && !room.clients.has(client)) {
    sendJson(client, { type: "error", message: "이미 가득 찬 방입니다." });
    return;
  }

  leaveRoom(client, { silent: true });
  const usedPlayers = new Set([...room.clients].map((item) => item.player));
  attachClientToRoom(client, room, usedPlayers.has("south") ? "north" : "south");

  sendJson(client, {
    type: "room_joined",
    roomCode: room.code,
    player: client.player,
    mapId: room.mapId,
    players: room.clients.size,
    snapshot: room.snapshot,
  });

  broadcast(room, {
    type: "room_ready",
    roomCode: room.code,
    mapId: room.mapId,
    players: room.clients.size,
  });
}

function attachClientToRoom(client, room, player) {
  client.roomCode = room.code;
  client.player = player;
  room.clients.add(client);
}

function leaveRoom(client, options = {}) {
  const roomCode = client.roomCode;
  if (!roomCode || !rooms.has(roomCode)) return;

  const room = rooms.get(roomCode);
  room.clients.delete(client);
  if (!options.silent) {
    broadcast(room, {
      type: "peer_left",
      roomCode,
      players: room.clients.size,
    });
  }

  client.roomCode = null;
  client.player = null;
  if (room.clients.size === 0) {
    rooms.delete(roomCode);
  }
}

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function broadcast(room, message, exceptClient = null) {
  for (const client of room.clients) {
    if (client !== exceptClient) sendJson(client, message);
  }
}

function sendJson(client, message) {
  if (client.socket.destroyed) return;
  const payload = Buffer.from(JSON.stringify(message), "utf8");
  const header = [];
  header.push(0x81);
  if (payload.length < 126) {
    header.push(payload.length);
  } else if (payload.length < 65536) {
    header.push(126, (payload.length >> 8) & 0xff, payload.length & 0xff);
  } else {
    header.push(127, 0, 0, 0, 0);
    header.push(
      (payload.length >> 24) & 0xff,
      (payload.length >> 16) & 0xff,
      (payload.length >> 8) & 0xff,
      payload.length & 0xff
    );
  }
  client.socket.write(Buffer.concat([Buffer.from(header), payload]));
}

server.listen(port, host, () => {
  console.log(`Serving http://${host}:${port}/index.html`);
  console.log(`WebSocket ws://${host}:${port}`);
});
