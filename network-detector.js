/**
 * Advanced Network Protection Detection Module
 * Detects common website protection systems and recommends appropriate bypass techniques
 */

const https = require('https');
const http = require('http');
const url = require('url');
const userAgents = require('./user-agents.js');

// Disable certificate validation for testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Protection system fingerprints for detection
 */
const protectionSystems = {
  'Cloudflare': {
    headers: ['cf-ray', 'cf-cache-status', 'cf-request-id', 'server'],
    cookies: ['__cf_bm', 'cf_clearance'],
    serverPattern: /cloudflare/i,
    headerValues: {
      'server': /cloudflare/i
    },
    bypassTechniques: [
      'cloudflareBypass', 
      'cloudflareUAMBypass',
      'cloudflareTurnstileBypass',
      'cloudflareManagedChallengeBypass',
      'advancedCloudflareBypass',
      'browserCapabilities', 
      'clientHints', 
      'tlsFingerprintScrambling',
      'securityTokenEmulation',
      'navigationBehavior',
      'antiMeasurementEvasion',
      'behavioralBiometricsEvasion',
      'wafPayloadPadding',
      'protocolHeaderAbuse',
      'randomizeHeaderOrder',
      'randomizeHeaderCase',
      'randomForwardedIP',
      'believableReferrer',
      'cacheBypass',
      'contentTypeSpecificBehavior',
      'http2Bypass'
    ]
  },
  'Cloudflare UAM': {
    bodyPatterns: [
      /checking your browser/i,
      /challenge-platform/i,
      /jschl-answer/i,
      /cf-spinner/i,
      /cf_chl_/i
    ],
    bypassTechniques: [
      'cloudflareUAMBypass',
      'advancedCloudflareBypass',
      'securityTokenEmulation',
      'clientHints',
      'browserCapabilities',
      'tlsFingerprintScrambling',
      'antiMeasurementEvasion',
      'behavioralBiometricsEvasion',
      'wafPayloadPadding',
      'protocolHeaderAbuse',
      'randomizeHeaderOrder',
      'randomForwardedIP'
    ]
  },
  'DDoSGuard': {
    headers: ['x-ddg-protection', 'server'],
    cookies: ['__ddg1', '__ddg2', '__ddgid', '__ddgmark'],
    serverPattern: /ddos-guard/i,
    headerValues: {
      'server': /ddos-guard/i
    },
    bypassTechniques: [
      'neuralNetworkWafBypass',
      'browserCapabilities', 
      'clientHints',
      'securityTokenEmulation',
      'navigationBehavior',
      'antiMeasurementEvasion',
      'contentTypeSpecificBehavior',
      'cacheBypass',
      'randomizeHeaderOrder',
      'randomizeHeaderCase',
      'randomForwardedIP',
      'believableReferrer',
      'behavioralBiometricsEvasion',
      'wafPayloadPadding',
      'protocolHeaderAbuse'
    ]
  },
  'Akamai': {
    headers: ['x-akamai-transformed', 'akamai-origin-hop', 'x-akamai-config-log-detail', 'server'],
    cookies: ['ak_bmsc', 'bm_sv', 'bm_sz'],
    headerValues: {
      'server': /akamai/i
    },
    bypassTechniques: [
      'akamaiBotManagerBypass',
      'neuralNetworkWafBypass',
      'securityTokenEmulation',
      'browserCapabilities',
      'clientHints',
      'navigationBehavior',
      'contentTypeSpecificBehavior',
      'tlsFingerprintScrambling',
      'antiMeasurementEvasion',
      'behavioralBiometricsEvasion',
      'wafPayloadPadding',
      'protocolHeaderAbuse'
    ]
  },
  'Imperva Incapsula': {
    headers: ['x-iinfo', 'x-cdn', 'set-cookie'],
    cookies: ['incap_ses', 'visid_incap'],
    cookiePatterns: [/incap_ses/, /visid_incap/],
    bypassTechniques: [
      'impervaAdvancedBypass',
      'neuralNetworkWafBypass',
      'securityTokenEmulation',
      'browserCapabilities',
      'clientHints',
      'antiMeasurementEvasion',
      'navigationBehavior',
      'contentTypeSpecificBehavior',
      'tlsFingerprintScrambling',
      'behavioralBiometricsEvasion',
      'wafPayloadPadding',
      'protocolHeaderAbuse'
    ]
  },
  'Vercel': {
    headers: ['x-vercel-id', 'x-vercel-cache', 'server'],
    headerValues: {
      'server': /vercel/i
    },
    bypassTechniques: [
      'cacheBypass',
      'randomForwardedIP',
      'randomizeHeaderOrder',
      'browserCapabilities',
      'clientHints',
      'believableReferrer',
      'wafPayloadPadding',
      'protocolHeaderAbuse'
    ]
  },
  'Sucuri': {
    headers: ['x-sucuri-id', 'x-sucuri-cache', 'server'],
    headerValues: {
      'server': /sucuri/i
    },
    bypassTechniques: [
      'neuralNetworkWafBypass',
      'browserCapabilities',
      'clientHints',
      'navigationBehavior',
      'tlsFingerprintScrambling',
      'randomizeHeaderOrder',
      'randomizeHeaderCase',
      'randomForwardedIP',
      'believableReferrer',
      'cacheBypass',
      'antiMeasurementEvasion',
      'contentTypeSpecificBehavior',
      'behavioralBiometricsEvasion',
      'wafPayloadPadding',
      'protocolHeaderAbuse'
    ]
  },
  'ModSecurity': {
    bodyPatterns: [/mod_security/, /blocked by mod_security/i],
    bypassTechniques: [
      'randomizeHeaderCase',
      'randomizeHeaderOrder',
      'antiMeasurementEvasion',
      'contentTypeSpecificBehavior',
      'wafPayloadPadding',
      'protocolHeaderAbuse',
      'randomForwardedIP',
      'believableReferrer',
      'cacheBypass'
    ]
  },
  'AWS WAF': {
    headers: ['x-amzn-trace-id', 'x-amz-cf-id', 'x-amz-cf-pop'],
    bypassTechniques: [
      'awsWafShieldBypass',
      'neuralNetworkWafBypass',
      'browserCapabilities',
      'clientHints',
      'randomForwardedIP',
      'contentTypeSpecificBehavior',
      'tlsFingerprintScrambling',
      'behavioralBiometricsEvasion',
      'wafPayloadPadding',
      'protocolHeaderAbuse'
    ]
  }
};

/**
 * Detect protection systems on a website
 * @param {string} targetUrl - The URL to test
 * @returns {Promise<Object>} - Detection results with recommended bypass techniques
 */
function detectProtectionSystems(targetUrl) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new url.URL(targetUrl);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': userAgents.getRandomDesktopUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000
    };

    // Choose http or https based on protocol
    const requestModule = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = requestModule.request(options, (res) => {
      const result = {
        detected: [],
        recommendedBypass: [],
        headers: res.headers,
        statusCode: res.statusCode
      };
      
      let body = '';
      
      // Detect protection systems from headers
      detectFromHeaders(res.headers, result);
      
      res.on('data', (chunk) => {
        // Limit body collection to first 20KB to avoid memory issues
        if (body.length < 20480) {
          body += chunk.toString();
        }
      });
      
      res.on('end', () => {
        // Detect protection systems from body content
        detectFromBody(body, result);
        
        // Get unique bypass techniques
        const allBypassTechniques = result.detected
          .flatMap(system => protectionSystems[system]?.bypassTechniques || []);
        
        result.recommendedBypass = [...new Set(allBypassTechniques)];
        
        // Always add these basic techniques if none are detected
        if (result.recommendedBypass.length === 0) {
          result.recommendedBypass = [
            'randomizeHeaderOrder',
            'browserCapabilities',
            'cacheBypass',
            'randomForwardedIP',
            'believableReferrer'
          ];
        }
        
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    
    req.end();
  });
}

/**
 * Detect protection systems from HTTP headers
 */
function detectFromHeaders(headers, result) {
  // Convert header names to lowercase for case-insensitive comparison
  const normalizedHeaders = {};
  for (const key in headers) {
    normalizedHeaders[key.toLowerCase()] = headers[key];
  }
  
  // Check for known protection systems
  for (const system in protectionSystems) {
    const fingerprint = protectionSystems[system];
    
    // Check header presence
    if (fingerprint.headers) {
      const hasHeaders = fingerprint.headers.some(header => 
        normalizedHeaders[header.toLowerCase()] !== undefined
      );
      
      if (hasHeaders) {
        // Check specific header values if defined
        if (fingerprint.headerValues) {
          for (const headerName in fingerprint.headerValues) {
            const pattern = fingerprint.headerValues[headerName];
            const headerValue = normalizedHeaders[headerName.toLowerCase()];
            
            if (headerValue && pattern.test(headerValue)) {
              if (!result.detected.includes(system)) {
                result.detected.push(system);
              }
              break;
            }
          }
        } else {
          if (!result.detected.includes(system)) {
            result.detected.push(system);
          }
        }
      }
    }
    
    // Check for cookies
    if (fingerprint.cookies) {
      const setCookie = normalizedHeaders['set-cookie'] || [];
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      
      const hasCookies = fingerprint.cookies.some(cookie => 
        cookies.some(setCookieHeader => setCookieHeader.includes(cookie))
      );
      
      if (hasCookies && !result.detected.includes(system)) {
        result.detected.push(system);
      }
    }
    
    // Check for cookie patterns
    if (fingerprint.cookiePatterns) {
      const setCookie = normalizedHeaders['set-cookie'] || [];
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      
      const matchesPattern = fingerprint.cookiePatterns.some(pattern => 
        cookies.some(setCookieHeader => pattern.test(setCookieHeader))
      );
      
      if (matchesPattern && !result.detected.includes(system)) {
        result.detected.push(system);
      }
    }
    
    // Check server header specifically
    if (fingerprint.serverPattern && normalizedHeaders['server']) {
      if (fingerprint.serverPattern.test(normalizedHeaders['server']) && 
          !result.detected.includes(system)) {
        result.detected.push(system);
      }
    }
  }
}

/**
 * Detect protection systems from response body
 */
function detectFromBody(body, result) {
  for (const system in protectionSystems) {
    const fingerprint = protectionSystems[system];
    
    if (fingerprint.bodyPatterns) {
      const hasBodyPattern = fingerprint.bodyPatterns.some(pattern => pattern.test(body));
      
      if (hasBodyPattern && !result.detected.includes(system)) {
        result.detected.push(system);
      }
    }
  }
  
  // Additional specific checks for Cloudflare UAM (anti-bot)
  if (body.includes('cf-spinner') || 
      body.includes('jschl-answer') || 
      body.includes('cf_chl_') ||
      body.includes('cf-please-wait') ||
      body.includes('cloudflare-challenge')) {
    if (!result.detected.includes('Cloudflare UAM')) {
      result.detected.push('Cloudflare UAM');
    }
  }
}

module.exports = {
  detectProtectionSystems
}; 