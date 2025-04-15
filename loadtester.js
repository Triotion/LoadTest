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
const { program } = require('commander');
const userAgents = require('./user-agents.js');
const bypassTechniques = require('./bypass-techniques.js');
const networkDetector = require('./network-detector.js');
const { performance } = require('perf_hooks');

// Disable certificate validation for testing purposes
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Command line options
program
  .version('1.0.0')
  .description('Advanced Website Load Tester with security bypass features')
  .option('-t, --target <url>', 'Target URL')
  .option('-c, --connections <number>', 'Number of concurrent connections', parseInt, 200)
  .option('-d, --duration <seconds>', 'Test duration in seconds', parseInt, 30)
  .option('-m, --method <method>', 'HTTP method to use (GET, POST, etc.)', 'GET')
  .option('-p, --payload <file>', 'Payload file for POST/PUT requests')
  .option('-r, --rate <number>', 'Requests per second per worker', parseInt, 50)
  .option('-b, --bypass <techniques>', 'Comma-separated list of bypass techniques', 'all')
  .option('--headers <headers>', 'Custom headers in JSON format')
  .option('--no-verbose', 'Disable verbose output')
  .option('--delay <ms>', 'Delay between requests in ms', parseInt, 0)
  .option('--proxy <proxy>', 'Use proxy (format: host:port)')
  .option('--proxy-file <file>', 'Load proxies from file (format: host:port per line)')
  .option('--log <file>', 'Log results to file')
  .option('--keep-alive', 'Use HTTP keep-alive', false)
  .option('--randomize-path', 'Add random path segments to URL', false)
  .option('--auto-detect', 'Auto-detect best bypass techniques for target', false)
  .option('--timeout <ms>', 'Request timeout in milliseconds', parseInt, 10000)
  .option('--follow-redirects', 'Follow HTTP redirects', false)
  .option('--max-redirects <number>', 'Maximum number of redirects to follow', parseInt, 5)
  .parse(process.argv);

const options = program.opts();

// Validate arguments
if (!options.target) {
  console.error('Error: Target URL is required');
  program.help();
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
  ? Object.keys(bypassTechniques)
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
---------------------------------------------------------------
`);

  console.log(`[*] Target: ${options.target}`);
  console.log(`[*] Method: ${options.method}`);
  console.log(`[*] Connections: ${options.connections}`);
  console.log(`[*] Duration: ${options.duration} seconds`);
  console.log(`[*] Request rate: ${options.rate} requests/second/worker`);
  
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
    
    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
      const worker = cluster.fork();
      
      // Send bypass options to worker
      worker.send({ type: 'config', bypassOptions, proxyList });
      
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
    
    // Calculate bandwidth
    const totalMBReceived = stats.bytesReceived / (1024 * 1024);
    const totalMBSent = stats.bytesSent / (1024 * 1024);
    const mbpsReceived = totalMBReceived * 8 / totalTime;
    const mbpsSent = totalMBSent * 8 / totalTime;
    
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
  // Worker process
  const workerStats = {
    requests: 0,
    successful: 0,
    failed: 0,
    statusCodes: {},
    bytesReceived: 0,
    bytesSent: 0
  };
  
  // Proxy rotation index
  let proxyIndex = 0;
  let proxyList = [];
  let bypassOptions = [];
  
  // Get bypass options from master
  process.on('message', (msg) => {
    if (msg.type === 'config') {
      bypassOptions = msg.bypassOptions;
      proxyList = msg.proxyList;
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
    
    const proxy = proxyList[proxyIndex];
    proxyIndex = (proxyIndex + 1) % proxyList.length;
    return proxy;
  };
  
  // Setup request interval
  let requestInterval;
  
  // Wait for initial config message before starting requests
  const startRequestInterval = () => {
    if (bypassOptions.length === 0) {
      setTimeout(startRequestInterval, 100);
      return;
    }
    
    // Perform requests at specified rate
    requestInterval = setInterval(() => {
      const requestsPerInterval = options.delay ? 
        1 : Math.max(1, Math.floor(options.rate / (1000 / 10)));
      
      for (let i = 0; i < requestsPerInterval; i++) {
        performRequest();
      }
    }, options.delay || 10);
  };
  
  startRequestInterval();
  
  // Perform a single request
  function performRequest() {
    try {
      // Apply bypass techniques
      const requestOptions = createRequestOptions();
      
      // Track sent bytes
      let bytesSent = 0;
      
      // Add size of headers
      for (const header in requestOptions.headers) {
        bytesSent += header.length + requestOptions.headers[header].length + 4; // 4 for ': ' and '\r\n'
      }
      
      // Add payload size if applicable
      if (['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase()) && payloadData) {
        bytesSent += Buffer.byteLength(payloadData);
      }
      
      // Start request
      const req = targetProtocol.request(requestOptions, (res) => {
        const statusCode = res.statusCode.toString();
        workerStats.statusCodes[statusCode] = (workerStats.statusCodes[statusCode] || 0) + 1;
        
        // Handle redirects if enabled
        if (options.followRedirects && 
            [301, 302, 303, 307, 308].includes(res.statusCode) && 
            res.headers.location) {
          
          handleRedirect(res, 1);
          return;
        }
        
        // Track response size
        let responseSize = 0;
        
        // Calculate headers size
        for (const header in res.headers) {
          responseSize += header.length + (res.headers[header]?.length || 0) + 4;
        }
        
        if (res.statusCode >= 200 && res.statusCode < 400) {
          workerStats.successful++;
        } else {
          workerStats.failed++;
        }
        
        // Consume response data
        res.on('data', (chunk) => {
          responseSize += chunk.length;
        });
        
        res.on('end', () => {
          workerStats.bytesReceived += responseSize;
        });
      });
      
      req.on('error', (error) => {
        workerStats.failed++;
        console.error('Request error:', error.message);
      });
      
      // Set request timeout
      req.setTimeout(options.timeout, () => {
        req.destroy(new Error('Request timeout'));
      });
      
      // Send payload if applicable
      if (['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase()) && payloadData) {
        req.write(payloadData);
      }
      
      req.end();
      workerStats.requests++;
      workerStats.bytesSent += bytesSent;
    } catch (error) {
      workerStats.failed++;
      console.error('Error in performRequest:', error.message);
    }
  }
  
  // Handle redirect
  function handleRedirect(res, redirectCount) {
    // Check max redirects
    if (redirectCount > options.maxRedirects) {
      workerStats.failed++;
      return;
    }
    
    // Get redirect location
    let redirectUrl;
    try {
      redirectUrl = new url.URL(res.headers.location, options.target);
    } catch (error) {
      workerStats.failed++;
      return;
    }
    
    // Create new request options
    const redirectOptions = {
      hostname: redirectUrl.hostname,
      port: redirectUrl.port || (redirectUrl.protocol === 'https:' ? 443 : 80),
      path: redirectUrl.pathname + redirectUrl.search,
      method: 'GET', // Redirects typically use GET
      headers: {
        'User-Agent': userAgents.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': options.keepAlive ? 'keep-alive' : 'close',
        'Referer': options.target
      }
    };
    
    // Apply bypass techniques to the redirect request
    bypassOptions.forEach(technique => {
      if (bypassTechniques[technique]) {
        bypassTechniques[technique](redirectOptions);
      }
    });
    
    // Apply proxy if available
    if (proxyList.length > 0) {
      const proxy = getNextProxy();
      if (proxy) {
        const [host, port] = proxy.split(':');
        redirectOptions.agent = new (redirectUrl.protocol === 'https:' ? https : http).Agent({
          host: host,
          port: parseInt(port),
          path: redirectUrl.href
        });
      }
    }
    
    // Make the redirect request
    const protocol = redirectUrl.protocol === 'https:' ? https : http;
    const redirectReq = protocol.request(redirectOptions, (redirectRes) => {
      const statusCode = redirectRes.statusCode.toString();
      workerStats.statusCodes[statusCode] = (workerStats.statusCodes[statusCode] || 0) + 1;
      
      // Handle nested redirects
      if (options.followRedirects && 
          [301, 302, 303, 307, 308].includes(redirectRes.statusCode) && 
          redirectRes.headers.location) {
        
        handleRedirect(redirectRes, redirectCount + 1);
        return;
      }
      
      let responseSize = 0;
      
      // Calculate headers size
      for (const header in redirectRes.headers) {
        responseSize += header.length + (redirectRes.headers[header]?.length || 0) + 4;
      }
      
      if (redirectRes.statusCode >= 200 && redirectRes.statusCode < 400) {
        workerStats.successful++;
      } else {
        workerStats.failed++;
      }
      
      // Consume response data
      redirectRes.on('data', (chunk) => {
        responseSize += chunk.length;
      });
      
      redirectRes.on('end', () => {
        workerStats.bytesReceived += responseSize;
      });
    });
    
    redirectReq.on('error', (error) => {
      workerStats.failed++;
    });
    
    redirectReq.end();
  }
  
  // Create request options with bypass techniques
  function createRequestOptions() {
    const parsedUrl = new url.URL(options.target);
    let path = parsedUrl.pathname + parsedUrl.search;
    
    // Apply randomized path if enabled
    if (options.randomizePath) {
      const randomPath = crypto.randomBytes(8).toString('hex');
      path = path + (path.includes('?') ? '&' : '?') + randomPath + '=' + Date.now();
    }
    
    // Base request options with default headers
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: targetPort,
      path: path,
      method: options.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': options.keepAlive ? 'keep-alive' : 'close',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...customHeaders
      },
      timeout: options.timeout
    };
    
    // Apply proxy if provided directly or from list
    let proxyToUse = options.proxy;
    
    if (!proxyToUse && proxyList.length > 0) {
      proxyToUse = getNextProxy();
    }
    
    if (proxyToUse) {
      const [host, port] = proxyToUse.split(':');
      requestOptions.agent = new (targetProtocol.Agent)({
        host: host,
        port: parseInt(port),
        path: options.target
      });
    }
    
    // Apply selected bypass techniques
    bypassOptions.forEach(technique => {
      if (bypassTechniques[technique]) {
        try {
          bypassTechniques[technique](requestOptions);
        } catch (error) {
          console.error(`Error applying bypass technique ${technique}:`, error.message);
        }
      }
    });
    
    return requestOptions;
  }
} 