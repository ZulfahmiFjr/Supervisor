function twoChar(text) {
    return (text + "").padStart(2, "0");
}

function getTime() {
    const d = new Date();
    return `${twoChar(d.getHours())}:${twoChar(d.getMinutes())}:${twoChar(d.getSeconds())}`;
}

// warna aktif kalo terminal mendukung dan gak didisable aja
const COLOR_ENABLED =
    process.stdout.isTTY &&
    process.env.TERM !== "dumb" &&
    !("NO_COLOR" in process.env);

const ansi = (code) => (text) =>
    COLOR_ENABLED ? `\x1b[${code}m${text}\x1b[0m` : text;

const C = {
    cyan: ansi(36),
    gray: ansi(90),
    white: ansi(97),
    magenta: ansi(35),
    yellow: ansi(33),
    red: ansi(31)
};

const logger = {
    debugLevel: 0,

    _log: (text, prefix, colorFn) => {
        console.log(`${C.cyan(getTime())} ${colorFn(`[${prefix}]: ${text}`)}`);
    },

    debug: (text) => {
        if (logger.debugLevel > 0) {
            logger._log(text, "DEBUG", C.gray);
        }
    },

    info: (text) => {
        logger._log(text, "INFO", C.white);
    },

    notice: (text) => {
        logger._log(text, "NOTICE", C.magenta);
    },

    warning: (text) => {
        logger._log(text, "WARNING", C.yellow);
    },

    error: (text) => {
        logger._log(text, "ERROR", C.red);
    }
};

module.exports = logger;
