// PeerJS-based room-code multiplayer. Best-effort: state sync of remote players,
// shot events, and building placements. The host is authoritative for scores.
const PEER_PREFIX = "operationpolygon-";

function shortCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export class Net {
  constructor() {
    this.peer = null;
    this.role = null; // 'host' | 'guest'
    this.code = null;
    this.conns = new Map(); // id -> DataConnection
    this.onMessage = () => {};
    this.onPeerJoin = () => {};
    this.onPeerLeave = () => {};
  }

  peerCount() { return this.conns.size; }

  available() { return typeof window.Peer !== "undefined"; }

  async host() {
    if (!this.available()) throw new Error("PeerJS not loaded");
    if (this.peer) this.disconnect();
    const code = shortCode();
    this.code = code; this.role = "host";
    return new Promise((resolve, reject) => {
      const peer = new window.Peer(PEER_PREFIX + code);
      this.peer = peer;
      peer.on("open", (id) => resolve(code));
      peer.on("error", (err) => { reject(err); });
      peer.on("connection", (conn) => this._addConn(conn));
    });
  }

  async join(code) {
    if (!this.available()) throw new Error("PeerJS not loaded");
    if (this.peer) this.disconnect();
    this.role = "guest"; this.code = code;
    return new Promise((resolve, reject) => {
      const peer = new window.Peer();
      this.peer = peer;
      peer.on("open", () => {
        const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
        let opened = false;
        conn.on("open", () => { opened = true; this._addConn(conn); resolve(); });
        conn.on("error", (e) => { if (!opened) reject(e); });
        setTimeout(() => { if (!opened) reject(new Error("timeout")); }, 8000);
      });
      peer.on("error", (err) => reject(err));
    });
  }

  _addConn(conn) {
    this.conns.set(conn.peer, conn);
    conn.on("data", (data) => this.onMessage(conn.peer, data));
    conn.on("close", () => { this.conns.delete(conn.peer); this.onPeerLeave(conn.peer); });
    conn.on("error", () => { this.conns.delete(conn.peer); this.onPeerLeave(conn.peer); });
    this.onPeerJoin(conn.peer);
  }

  send(data, to = null) {
    if (!this.peer) return;
    const msg = data;
    if (to) {
      const c = this.conns.get(to);
      if (c && c.open) c.send(msg);
    } else {
      for (const c of this.conns.values()) if (c.open) c.send(msg);
    }
  }

  disconnect() {
    for (const c of this.conns.values()) try { c.close(); } catch {}
    this.conns.clear();
    try { this.peer?.destroy(); } catch {}
    this.peer = null;
    this.role = null; this.code = null;
  }
}
