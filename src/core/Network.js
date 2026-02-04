export class Network {
    constructor(app) {
        this.app = app; // reference ke main app state buat akses managers
        this.socket = null;
        this.url = '';
        this.manualUrl = null;
        this.reconnectTimer = null;
        this.viewportInterval = null;
        // status state
        this.isConnected = false;
    }

    async connect(url) {
        this.manualUrl = url ?? null;
        // cleanup koneksi lama kalo ada
        if (this.socket) {
            try { this.socket.close(); } catch (_) {}
            this.socket = null;
        }
        this.url = this.manualUrl || await this._resolveWsUrl();
        console.log(`[Network] Connecting to ${this.url}...`);
        this.socket = new WebSocket(this.url);
        // event listeners
        this.socket.onopen = () => {
            console.log("[Network] Connected!");
            this.app.ui.log("Connected to Supervisor!", "success");
            this.isConnected = true;
            // handshake login
            this.send('login.viewer', { 
                name: 'Supervisor', 
                level: null 
            });
            // start viewport sync loop, 1 detik sekali
            this._startViewportSync();
            // update UI, nanti kalo UIManager udah ada
            // if (this.app.ui) this.app.ui.setConnectionStatus(true);
        };

        this.socket.onclose = (e) => {
            console.warn(`[Network] Disconnected. Reason: ${e.reason || 'Unknown'}`);
            this.app.ui.log(`Disconnected from server. Retrying...`, "error");
            this._cleanup();
            // retry logic
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
            // kalo manualUrl ada, pake itu. kalo auto, resolve ulang config.json
                this.connect(this.manualUrl);
            }, 3000);
        };

        this.socket.onerror = (err) => {
            console.error("[Network] WebSocket Error:", err);
            // socket otomatis close setelah error, jadi logic retry ada di onclose
        };

        this.socket.onmessage = (event) => {
            try {
                const packet = JSON.parse(event.data);
                this._handlePacket(packet);
            } catch (err) {
                console.error("[Network] Error decoding packet:", err);
            }
        };
    }

    send(type, body) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, body }));
        }
    }

    // internal handlers
    _cleanup() {
        this.isConnected = false;
        this.app.entityManager.clear(); // bersihin data player kalo DC
        this.app.chunkManager.clear(); // bersihin map kalo DC
        if (this.viewportInterval) clearInterval(this.viewportInterval);
        // if (this.app.ui) this.app.ui.setConnectionStatus(false);
    }

    async _resolveWsUrl() {
        const proto = window.location.protocol === "https:" ? "wss" : "ws";
        const host = window.location.hostname || "localhost";
        // kalo user isi manual
        const input = document.getElementById("connection-input");
        const value = input?.value?.trim();
        if (value && value !== "auto") return value;
        // coba ambil dari server config, paling akurat
        try {
            const res = await fetch("/config.json", { cache: "no-store" });
            if (res.ok) {
            const cfg = await res.json();
            if (cfg?.wsPort) return `${proto}://${host}:${cfg.wsPort}`;
            }
        } catch (_) {}
        // fallback
        if (window.location.port === "5173") {
            console.log("[Network] Dev Mode detected, fallback ws:8080");
            return `${proto}://${host}:27095`;
        }
        // fallback prod default kalo bener bener gak ada config
        return `${proto}://${host}:27095`;
    }

    _startViewportSync() {
        if (this.viewportInterval) clearInterval(this.viewportInterval);
        this.viewportInterval = setInterval(() => {
            if (!this.isConnected) return;
            // ambil data dari renderer -> viewport logic
            const vpPacket = this.app.renderer.viewport.toPacket(); 
            // harus nambahin method .toPacket() di Viewport.js nanti biar ssuai protokol
            this.send('viewport', vpPacket);
        }, 1000);
    }

    // packet handlers
    _handlePacket(packet) {
        const { type, body } = packet;
        switch (type) {
            case 'login.viewer':
                if (body.status) console.log("[Auth] Login Success!");
                else console.error("[Auth] Login Failed:", body.reason);
                break;

            case 'chunk':
                // langsung oper ke ChunkManager
                // renderer nanti otomatis ambil dari manager pas looping
                this.app.chunkManager.addChunk(body.chunk);
                // masukin ke queue renderer biar digambar di buffer frame berikutnya
                this.app.renderer.queueChunk(body.chunk);
                break;

            case 'sector':
                // handle bulk chunks
                if (body.chunks) {
                    this._handleBulkChunks(body.chunks);
                }
                if (body.entities) {
                    body.entities.forEach(e => this._handleEntityUpdate(e));
                }
                break;

            case 'player.join':
                this.app.entityManager.addPlayer(body.eid, body);
                this.app.ui.log(`Player ${body.name} joined the game.`, 'success');
                break;

            case 'player.leave':
                const leaverName = body.name || "Unknown";
                this.app.entityManager.removePlayer(body.eid);
                this.app.ui.log(`Player ${leaverName} left the game.`, 'error'); // log merah saat kluar
                break;

            case 'player.face':
                this.app.entityManager.updateFace(body.eid, body.pixelArray);
                break;
                
            case 'entity.position':
                if (body.eid) {
                    this.app.entityManager.updatePosition(body.eid, body.position);
                }
                break;

            case 'viewport':
                // server maksa set posisi kamera
                this.app.renderer.viewport.moveTo(body.worldX, body.worldZ);
                break;

            case 'info':
                // update stats UI, nanti disambung ke UIManager
                // console.log("Stats:", body);
                break;
                
            case 'message':
                this.app.ui.log(body.message);
                break;

            case 'player.message':
                let senderName = "Unknown";
                if (this.app.entityManager) {
                    const p = this.app.entityManager.getPlayer(body.eid);
                    if (p) senderName = p.name;
                }
                this.app.ui.log(`<${senderName}> ${body.message}`);
                break;

            default:
                console.debug("Unhandled packet:", type);
                break;
        }
    }

    _handleBulkChunks(data) {
        let chunks = [];
        // cek tipe data, String (Base64) atau Array (Raw JSON dari supervisor baru)
        if (typeof data === 'string') {
            try {
                const decoded = atob(data);
                chunks = JSON.parse(decoded);
            } catch (e) {
                console.error("[Network] Failed to parse Base64 sector:", e);
                return;
            }
        } else if (Array.isArray(data)) {
            // langsung pake
            chunks = data;
        } else {
            console.warn("[Network] Unknown sector data format:", typeof data);
            return;
        }
        // proses masukin ke manager & renderer
        let count = 0;
        chunks.forEach(chunk => {
            try {
                this.app.chunkManager.addChunk(chunk);
                this.app.renderer.queueChunk(chunk);
                count++;
            } catch (err) {
                // silent fail per chunk biar gak stop satu batch
            }
        });
    }
    
    _handleEntityUpdate(entity) {
        if (entity.type === 'player') {
            this.app.entityManager.addPlayer(entity.eid, entity);
        } else {
            // handle mob lain kalo nnti perlu
        }
    }
}