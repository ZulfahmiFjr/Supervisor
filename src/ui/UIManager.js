export class UIManager {
    constructor(app) {
        this.app = app; // reference ke main app
        // cache DOM elements biar performa ngebut
        this.dom = {
            // stats
            fps: document.getElementById('stats-fps-value'),
            players: document.getElementById('stats-players-value'),
            entities: document.getElementById('stats-entities-value'),
            chunks: document.getElementById('stats-chunks-value'),
            buffers: document.getElementById('stats-buffers-value'),
            // console
            logOutput: document.getElementById('log-output'),
            consoleInput: document.getElementById('console-input'),
            btnSend: document.getElementById('console-send'),
            btnClear: document.getElementById('console-clear'),
            // settings / toggles
            checkGrid: document.getElementById('render-chunk-grid'),
            checkOutline: document.getElementById('render-buffer-outlines'),
            checkAxis: document.getElementById('render-axis-lines'),
            checkPlayers: document.getElementById('render-player-markers'),
            checkCoords: document.getElementById('render-mouse-tooltip'),
            checkCrosshair: document.getElementById('render-crosshair'),
            // navigation inputs
            inputX: document.getElementById('x-offset-input'),
            inputZ: document.getElementById('z-offset-input'),
            inputScale: document.getElementById('scale-input'),
            // mobile sidebar, pngganti Alpine JS
            mobileMenuBtn: document.querySelector('button[class*="md:hidden"]'), // tombol hamburger
            mobileSidebar: document.querySelector('div[x-show="dashboardOpen"]'), // sidebar overlay
            mobileCloseBtn: null // nanti cari pas setup
        };
        // cari tombol close di dalam sidebar, krena gak ada ID nya di HTML lama
        if (this.dom.mobileSidebar) {
            this.dom.mobileCloseBtn = this.dom.mobileSidebar.querySelector('button.self-end');
        }
    }

    setup() {
        console.log("[UI] Setting up interface events...");
        // console events
        this.dom.btnSend?.addEventListener('click', () => this._handleConsoleSend());
        this.dom.consoleInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._handleConsoleSend();
        });
        this.dom.btnClear?.addEventListener('click', () => {
            if (this.dom.logOutput) this.dom.logOutput.innerHTML = '';
        });
        // settings toggles, langsung tembak ke renderer state
        this._bindToggle(this.dom.checkGrid, 'showGrid');
        this._bindToggle(this.dom.checkOutline, 'showOutlines');
        this._bindToggle(this.dom.checkAxis, 'showAxis');
        this._bindToggle(this.dom.checkPlayers, 'showPlayers');
        this._bindToggle(this.dom.checkCoords, 'showCoords');
        this._bindToggle(this.dom.checkCrosshair, 'showCrosshair');
        // navigation inputs, update viewport
        this.dom.inputX?.addEventListener('change', (e) => {
            this.app.renderer.viewport.setOffsets(parseFloat(e.target.value), null);
        });
        this.dom.inputZ?.addEventListener('change', (e) => {
            this.app.renderer.viewport.setOffsets(null, parseFloat(e.target.value));
        });
        this.dom.inputScale?.addEventListener('change', (e) => {
            this.app.renderer.viewport.setScale(parseFloat(e.target.value));
        });
        // mobile sidebar logic
        this._setupMobileMenu();
    }

    // update stats stiap beberapa frame, dipanggil dari main.js
    updateStats(fps) {
        if (this.dom.fps) this.dom.fps.innerText = fps;
        // ambil data real dari manager
        const pCount = this.app.entityManager.players.size;
        const eCount = this.app.entityManager.entities.size;
        const cCount = this.app.chunkManager.getCount();
        const bCount = this.app.renderer.buffers.size;
        if (this.dom.players) this.dom.players.innerText = pCount;
        if (this.dom.entities) this.dom.entities.innerText = eCount;
        if (this.dom.chunks) this.dom.chunks.innerText = cCount;
        if (this.dom.buffers) this.dom.buffers.innerText = bCount;
        // sync input navigasi kalo user geser map pake mouse
        const vp = this.app.renderer.viewport;
        if (document.activeElement !== this.dom.inputX && this.dom.inputX) {
            this.dom.inputX.value = Math.round(vp.offsetX);
        }
        if (document.activeElement !== this.dom.inputZ && this.dom.inputZ) {
            this.dom.inputZ.value = Math.round(vp.offsetY);
        }
        if (document.activeElement !== this.dom.inputScale && this.dom.inputScale) {
            this.dom.inputScale.value = vp.scale.toFixed(2);
        }
    }

    log(msg, type = 'info') {
        if (!this.dom.logOutput) return;
        const now = new Date();
        const timeStr = now.toLocaleTimeString("id-ID");
        const el = document.createElement('div');
        // style ngikutin CSS lama (.message-list__message)
        // inject class Tailwind juga biar aman
        el.className = "message-list__message transition-all text-xs font-mono mb-1 break-words";
        // Logic warna teks
        if (type === 'error') {
            el.style.color = '#ff5555'; // merah terang
        } else if (type === 'success') {
            el.style.color = '#55ff55'; // hijau terang
        } else if (type === 'cmd') {
            el.style.color = '#55ffff'; // cyan
        } else {
            el.style.color = '#cbd5e1'; // putih abu (default)
        }
        el.innerText = `[${timeStr}] ${msg}`;
        this.dom.logOutput.appendChild(el);
        this.dom.logOutput.scrollTop = this.dom.logOutput.scrollHeight; // auto scroll
    }

    // private helpers
    _handleConsoleSend() {
        const input = this.dom.consoleInput;
        if (!input) return;
        const txt = input.value.trim();
        if (txt.length === 0) return;
        // log local dulu
        this.log(`> ${txt}`, 'cmd');
        // kirim ke network, command handler server
        // format packet sesuaikan sama backend Atlas
        if (this.app.network) {
            this.app.network.sendConsoleCommand(txt);
        }
        input.value = '';
    }

    _bindToggle(element, rendererProp) {
        if (!element) return;
        // set state awal sesuai renderer
        element.checked = this.app.renderer[rendererProp];
        element.addEventListener('change', (e) => {
            this.app.renderer[rendererProp] = e.target.checked;
        });
    }

    _setupMobileMenu() {
        const { mobileMenuBtn, mobileSidebar, mobileCloseBtn } = this.dom;
        if (!mobileMenuBtn || !mobileSidebar) return;
        const toggleMenu = (show) => {
            if (show) {
                mobileSidebar.style.display = 'flex'; // override x-show behavior
                // tambah class animasi masuk nanti
            } else {
                mobileSidebar.style.display = 'none';
            }
        };
        // event listeners
        mobileMenuBtn.addEventListener('click', () => toggleMenu(true));
        if (mobileCloseBtn) {
            mobileCloseBtn.addEventListener('click', () => toggleMenu(false));
        }
        // klik di luar sidebar buat close overlay click
        mobileSidebar.addEventListener('click', (e) => {
            if (e.target === mobileSidebar) toggleMenu(false);
        });
    }
}