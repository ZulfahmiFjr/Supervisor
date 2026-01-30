export class EntityManager {
    constructor() {
        // map biar lookup ID cepet banget
        this.players = new Map();
        this.entities = new Map();
    }

    addPlayer(eid, data) {
        if (!eid) return console.warn("[EntityManager] Invalid EID for addPlayer");
        // simpen data player
        this.players.set(eid, {
            eid: eid,
            name: data.name || "Unknown",
            position: data.position || { x: 0, y: 0, z: 0, yaw: 0 },
            face: null // nanti diisi kalo ada packet face update
        });
        console.log(`[Entity] Player joined: ${data.name} (${eid})`);
    }

    removePlayer(eid) {
        if (this.players.has(eid)) {
            const p = this.players.get(eid);
            console.log(`[Entity] Player left: ${p.name}`);
            this.players.delete(eid);
        }
    }

    updatePosition(eid, position) {
        // cek di players dulu
        if (this.players.has(eid)) {
            const p = this.players.get(eid);
            p.position = position;
            return;
        }
        // kalo bukan player, cek entities logic futureproof
        if (this.entities.has(eid)) {
            const e = this.entities.get(eid);
            e.position = position;
        }
    }

    updateFace(eid, pixelArrayBase64) {
        if (this.players.has(eid)) {
            // nanti class FaceRenderer kalo mau dibuat bisa consume data ini
            // sekarang simpan raw datanya aja dulu biar ringan
            this.players.get(eid).face = pixelArrayBase64;
        }
    }

    // dipanggil sama Renderer setiap frame
    getAllPlayers() {
        return Array.from(this.players.values());
    }

    // buat fitur follow player nanti
    getPlayer(eid) {
        return this.players.get(eid);
    }
    
    clear() {
        this.players.clear();
        this.entities.clear();
    }
}