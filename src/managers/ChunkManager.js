export class ChunkManager {
    constructor() {
        this.chunks = new Map(); // pake Map biar lebih cepet akses key string "x:z"
    }

    // hash key generator
    getHash(x, z) {
        return `${x}:${z}`;
    }

    addChunk(chunk) {
        if (!chunk || chunk.x === undefined || chunk.z === undefined) {
            throw new Error(`Invalid chunk data received`);
        }
        const key = this.getHash(chunk.x, chunk.z);
        this.chunks.set(key, chunk);
        return chunk;
    }

    getChunk(x, z) {
        return this.chunks.get(this.getHash(x, z));
    }

    getChunkByWorldPos(worldX, worldZ) {
        const cx = worldX >> 4;
        const cz = worldZ >> 4;
        return this.getChunk(cx, cz);
    }

    // logic buat ambil ID block di koordinat tertentu
    getBlockIdAt(worldX, worldZ) {
        const chunk = this.getChunkByWorldPos(worldX, worldZ);
        if (!chunk) return null;
        const rx = Math.abs(worldX % 16);
        const rz = Math.abs(worldZ % 16);
        try {
            // logic akses layer yg unik (object keys)
            const cell = chunk.layer[rx][rz];
            return cell ? Object.values(cell)[0] : '?';
        } catch (e) {
            return '!';
        }
    }

    getAllChunks() {
        return Array.from(this.chunks.values());
    }
    
    getCount() {
        return this.chunks.size;
    }
    
    clear() {
        this.chunks.clear();
    }
}