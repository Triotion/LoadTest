/**
 * Security Bypass Techniques for Load Testing
 * 
 * IMPORTANT DISCLAIMER:
 * This code is provided for EDUCATIONAL and LEGITIMATE SECURITY TESTING purposes only.
 * Only use on systems you own or have explicit permission to test.
 * Unauthorized testing is illegal and unethical.
 * 
 * Developed By Triotion (https://t.me/Triotion)
 */

// Utility function to generate random values
const crypto = require('crypto');

// Generate a random string of specified length
const randomString = (length = 10) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

// Get a random IPv4 address
const randomIP = () => {
  return Array.from({length: 4}, () => Math.floor(Math.random() * 256)).join('.');
};

// Get a number within a range
const randomInRange = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Shuffle array in place
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Collection of bypass techniques
const bypassTechniques = {
  /**
   * Randomize header order to bypass pattern matching systems
   */
  randomizeHeaderOrder: (requestOptions) => {
    const headers = requestOptions.headers;
    const headerNames = Object.keys(headers);
    const shuffledHeaders = {};
    
    shuffleArray(headerNames).forEach(name => {
      shuffledHeaders[name] = headers[name];
    });
    
    requestOptions.headers = shuffledHeaders;
  },
  
  /**
   * Add random case variation to header names
   * Many servers are case-insensitive for headers
   */
  randomizeHeaderCase: (requestOptions) => {
    const headers = requestOptions.headers;
    const randomCaseHeaders = {};
    
    Object.keys(headers).forEach(name => {
      // Convert header to random case
      const randomCaseName = name.split('').map(char => 
        Math.random() > 0.5 ? char.toUpperCase() : char.toLowerCase()
      ).join('');
      
      randomCaseHeaders[randomCaseName] = headers[name];
    });
    
    requestOptions.headers = randomCaseHeaders;
  },
  
  /**
   * Add X-Forwarded-For with random IP to simulate traffic coming
   * from different sources
   */
  randomForwardedIP: (requestOptions) => {
    requestOptions.headers['X-Forwarded-For'] = randomIP();
    requestOptions.headers['X-Forwarded-Host'] = `${randomString(8)}.com`;
    requestOptions.headers['X-Client-IP'] = randomIP();
  },
  
  /**
   * Add a believable referrer from popular websites
   */
  believableReferrer: (requestOptions) => {
    const referrers = [
      'https://www.google.com/search?q=',
      'https://www.bing.com/search?q=',
      'https://search.yahoo.com/search?p=',
      'https://duckduckgo.com/?q=',
      'https://www.facebook.com/',
      'https://twitter.com/search?q=',
      'https://www.reddit.com/r/',
      'https://www.linkedin.com/search/results/all/?keywords=',
      'https://www.youtube.com/results?search_query=',
      'https://www.instagram.com/explore/tags/'
    ];
    
    const searchTerms = [
      'latest news',
      'weather forecast',
      'online shopping',
      'best products',
      'top rated services',
      'discount codes',
      'local business',
      'sports results',
      'technology trends',
      'health advice'
    ];
    
    const baseReferrer = referrers[Math.floor(Math.random() * referrers.length)];
    const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    requestOptions.headers['Referer'] = `${baseReferrer}${encodeURIComponent(searchTerm + ' ' + randomString(5))}`;
  },
  
  /**
   * Add random query parameters and cache control headers to bypass cache
   */
  cacheBypass: (requestOptions) => {
    const timestamp = Date.now();
    const randomParam = randomString(8);
    
    // Add URL parameters to bypass cache
    if (requestOptions.path.includes('?')) {
      requestOptions.path += `&_=${timestamp}&${randomParam}=${randomString(5)}`;
    } else {
      requestOptions.path += `?_=${timestamp}&${randomParam}=${randomString(5)}`;
    }
    
    // Add cache-busting headers
    requestOptions.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0';
    requestOptions.headers['Pragma'] = 'no-cache';
    requestOptions.headers['Expires'] = '0';
    
    // Add If-Modified-Since with old date to force revalidation
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 1); // 1 year ago
    requestOptions.headers['If-Modified-Since'] = oldDate.toUTCString();
    
    // Add unique ETag to prevent matching
    requestOptions.headers['If-None-Match'] = `"${randomString(16)}"`;
  }
};

// Add more bypass techniques
Object.assign(bypassTechniques, {
  /**
   * Add client hints to make the request look like a modern browser
   */
  clientHints: (requestOptions) => {
    requestOptions.headers['Sec-CH-UA'] = `"Not.A/Brand";v="${randomInRange(8, 99)}", "Chromium";v="${randomInRange(110, 123)}", "Google Chrome";v="${randomInRange(110, 123)}"`;
    requestOptions.headers['Sec-CH-UA-Mobile'] = Math.random() > 0.7 ? '?1' : '?0';
    requestOptions.headers['Sec-CH-UA-Platform'] = ['Windows', 'macOS', 'Linux', 'Android', 'iOS'][Math.floor(Math.random() * 5)];
    requestOptions.headers['Sec-CH-UA-Platform-Version'] = `"${randomInRange(10, 15)}"`;
    requestOptions.headers['Sec-CH-UA-Full-Version-List'] = requestOptions.headers['Sec-CH-UA'];
  },
  
  /**
   * Simulate browser capabilities
   */
  browserCapabilities: (requestOptions) => {
    requestOptions.headers['Accept-Language'] = [
      'en-US,en;q=0.9',
      'en-GB,en;q=0.9',
      'es-ES,es;q=0.9,en;q=0.8',
      'fr-FR,fr;q=0.9,en;q=0.8',
      'de-DE,de;q=0.9,en;q=0.8',
      'zh-CN,zh;q=0.9,en;q=0.8',
      'ja-JP,ja;q=0.9,en;q=0.8',
      'ru-RU,ru;q=0.9,en;q=0.8',
      'pt-BR,pt;q=0.9,en;q=0.8',
      'ar-SA,ar;q=0.9,en;q=0.8'
    ][Math.floor(Math.random() * 10)];
    
    // Random DNT (Do Not Track) setting
    if (Math.random() > 0.7) {
      requestOptions.headers['DNT'] = '1';
    }
    
    // Random Save-Data setting (bandwidth saving mode)
    if (Math.random() > 0.9) {
      requestOptions.headers['Save-Data'] = 'on';
    }
  },
  
  /**
   * Generate and add security tokens to simulate a valid session
   */
  securityTokenEmulation: (requestOptions) => {
    // Add CSRF-like token
    const csrfToken = crypto.randomBytes(16).toString('hex');
    requestOptions.headers['X-CSRF-Token'] = csrfToken;
    
    // Add realistic cookie pattern with session tokens
    const sessionId = crypto.randomBytes(20).toString('hex');
    const visitorId = crypto.randomBytes(16).toString('hex');
    const cookieExpire = new Date(Date.now() + 86400000).toUTCString();
    
    const cookieParts = [
      `session_id=${sessionId}; Path=/; HttpOnly; Secure`,
      `visitor_id=${visitorId}; Expires=${cookieExpire}; Path=/`,
      `csrf=${csrfToken}; Path=/; Secure; SameSite=Lax`,
      `_ga=GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now()/1000 - Math.random() * 10000000)}; Expires=${cookieExpire}; Path=/`,
      `_gid=GA1.2.${Math.floor(Math.random() * 1000000000)}; Expires=${cookieExpire}; Path=/`
    ];
    
    // Add 50% chance of including additional typical cookies
    if (Math.random() > 0.5) {
      cookieParts.push(`theme=light; Path=/`);
    }
    
    if (Math.random() > 0.5) {
      cookieParts.push(`last_visit=${Math.floor(Date.now()/1000 - Math.random() * 864000)}; Path=/`);
    }
    
    requestOptions.headers['Cookie'] = cookieParts.join('; ');
  },
  
  /**
   * Add timing obfuscation to confuse timing-based detection
   */
  timingObfuscation: (requestOptions) => {
    // This is handled in the main code by adding a random delay
    // But we can add a header that some systems may use for timing metrics
    requestOptions.headers['X-Request-Start'] = Date.now().toString();
  },
  
  /**
   * Add TLS fingerprint scrambling headers
   */
  tlsFingerprintScrambling: (requestOptions) => {
    // JA3 fingerprint is derived from TLS client hello parameters
    // While we can't directly modify this, we can add headers that mislead systems
    // that try to correlate HTTP and TLS data
    requestOptions.headers['Sec-Fetch-Site'] = ['same-origin', 'same-site', 'cross-site', 'none'][Math.floor(Math.random() * 4)];
    requestOptions.headers['Sec-Fetch-Mode'] = ['navigate', 'cors', 'no-cors', 'same-origin'][Math.floor(Math.random() * 4)];
    requestOptions.headers['Sec-Fetch-Dest'] = ['document', 'image', 'style', 'script', 'font', 'empty'][Math.floor(Math.random() * 6)];
    requestOptions.headers['Sec-Fetch-User'] = Math.random() > 0.5 ? '?1' : '';
  },
  
  /**
   * Add browser-like navigation behavior
   */
  navigationBehavior: (requestOptions) => {
    const paths = ['/home', '/about', '/products', '/services', '/contact', '/news', '/blog', '/login', '/register', '/search'];
    
    // Determine the host and base path from the requested URL
    const urlParts = requestOptions.path.split('?')[0].split('/');
    const baseUrl = urlParts.slice(0, urlParts.length - 1).join('/') || '/';
    
    // Randomly choose a previous path from likely site structure
    const previousPath = paths[Math.floor(Math.random() * paths.length)];
    const fullPreviousPath = baseUrl + previousPath;
    
    // Set the Referer to simulate normal site navigation
    requestOptions.headers['Referer'] = `http${requestOptions.protocol === 'https:' ? 's' : ''}://${requestOptions.hostname}${fullPreviousPath}`;
  },
  
  /**
   * Add anti-measurement evasion techniques
   */
  antiMeasurementEvasion: (requestOptions) => {
    // Add random number of DOM elements to confuse bot detection
    requestOptions.headers['X-DOM-Elements'] = (500 + Math.floor(Math.random() * 1000)).toString();
    
    // Add random script execution time to confuse performance metrics
    requestOptions.headers['X-Script-Exec-Time'] = (10 + Math.floor(Math.random() * 500)).toString();
    
    // Add fake canvas fingerprint to appear like a real browser
    requestOptions.headers['X-Canvas-Fingerprint'] = crypto.randomBytes(16).toString('hex');
  },
  
  /**
   * Add content type specific behavior
   */
  contentTypeSpecificBehavior: (requestOptions) => {
    // Based on the request, set appropriate Accept headers
    if (requestOptions.path.endsWith('.jpg') || requestOptions.path.endsWith('.jpeg') || 
        requestOptions.path.endsWith('.png') || requestOptions.path.endsWith('.gif')) {
      requestOptions.headers['Accept'] = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8';
    } else if (requestOptions.path.endsWith('.css')) {
      requestOptions.headers['Accept'] = 'text/css,*/*;q=0.1';
    } else if (requestOptions.path.endsWith('.js')) {
      requestOptions.headers['Accept'] = '*/*';
    } else if (requestOptions.path.includes('/api/') || requestOptions.path.includes('/json/')) {
      requestOptions.headers['Accept'] = 'application/json, text/plain, */*';
    } else {
      // Default for HTML content
      requestOptions.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
    }
  }
});

// Add Cloudflare specific bypass techniques
Object.assign(bypassTechniques, {
  /**
   * Generic Cloudflare bypass
   */
  cloudflareBypass: (requestOptions) => {
    // Add Cloudflare-specific headers
    requestOptions.headers['CF-IPCountry'] = ['US', 'GB', 'CA', 'AU', 'DE', 'FR'][Math.floor(Math.random() * 6)];
    
    // Add Cloudflare clearance cookies
    const clearance = `${randomString(32)}-${Math.floor(Date.now()/1000) - randomInRange(100, 900)}`;
    
    const now = new Date();
    const expires = new Date(now.getTime() + 86400000);
    
    const cookieHeader = requestOptions.headers['Cookie'] || '';
    const cloudflareTokens = [
      `cf_clearance=${clearance}; Expires=${expires.toUTCString()}; Path=/; Domain=.${requestOptions.hostname}; Secure; SameSite=None`,
      `__cf_bm=${randomString(40)}; Expires=${new Date(now.getTime() + 1800000).toUTCString()}; Path=/; Domain=.${requestOptions.hostname}; Secure; SameSite=None`,
    ];
    
    requestOptions.headers['Cookie'] = cookieHeader + (cookieHeader ? '; ' : '') + cloudflareTokens.join('; ');
  },
  
  /**
   * Cloudflare UAM (Under Attack Mode) bypass
   */
  cloudflareUAMBypass: (requestOptions) => {
    // Generate a realistic cf_clearance token
    const nowSecs = Math.floor(Date.now() / 1000);
    const clearance = `${randomString(32)}-${nowSecs - randomInRange(100, 900)}-${randomInRange(0, 3)}-${randomInRange(0, 100)}`;
    
    // Generate realistic challenge values
    const challengeValues = {
      jsch: randomString(20),
      jschl_vc: randomString(32),
      jschl_answer: (Math.random() * 10 + 10).toFixed(10),
      pass: randomString(60)
    };
    
    // Apply to headers
    let cookieHeader = requestOptions.headers['Cookie'] || '';
    cookieHeader += (cookieHeader ? '; ' : '') + `cf_clearance=${clearance}`;
    requestOptions.headers['Cookie'] = cookieHeader;
    
    // Add browser verification tokens
    requestOptions.headers['CF-Challenge'] = challengeValues.jschl_vc;
    requestOptions.headers['CF-Worker'] = '1';
    
    // Add cf_chl parameters to URL
    const cfParams = `cf_chl_jschl_tk__=${encodeURIComponent(challengeValues.jsch)}&jschl_vc=${encodeURIComponent(challengeValues.jschl_vc)}&jschl_answer=${encodeURIComponent(challengeValues.jschl_answer)}&pass=${encodeURIComponent(challengeValues.pass)}`;
    
    if (requestOptions.path.includes('?')) {
      requestOptions.path += '&' + cfParams;
    } else {
      requestOptions.path += '?' + cfParams;
    }
  },
  
  /**
   * Cloudflare Turnstile bypass
   * Simulates solving the Turnstile CAPTCHA challenge
   */
  cloudflareTurnstileBypass: (requestOptions) => {
    // Generate a fake Turnstile token (cf_turnstile_response)
    const turnstileToken = `${randomString(600)}_${Date.now() / 1000 - randomInRange(10, 60)}`;
    
    // Generate site-specific data
    const siteKey = `0x4${randomString(7)}`;
    const actionTokens = {
      chlPageData: randomString(90),
      cDataNonce: randomString(60),
      execution: randomString(36),
      chlStageT: Date.now() - randomInRange(1000, 5000)
    };
    
    // Apply tokens to cookies
    let cookieHeader = requestOptions.headers['Cookie'] || '';
    const turnstileCookies = [
      `cf_turnstile=${randomString(20)}; Path=/; Max-Age=3600`,
      `cf_chl_tk=${actionTokens.cDataNonce}; Path=/; Max-Age=3600`,
      `cf_chl_seq_${siteKey}=${randomInRange(1, 5)}; Path=/; Max-Age=3600`
    ];
    
    cookieHeader += (cookieHeader ? '; ' : '') + turnstileCookies.join('; ');
    requestOptions.headers['Cookie'] = cookieHeader;
    
    // Add Turnstile-specific headers
    requestOptions.headers['CF-Turnstile-Response'] = turnstileToken;
    requestOptions.headers['Sec-Turnstile-Token'] = actionTokens.chlPageData;
    
    // Add Turnstile parameters to URL
    const turnstileParams = `cf_turnstile_response=${encodeURIComponent(turnstileToken)}&cf_chl_opt_tk=${encodeURIComponent(actionTokens.execution)}`;
    
    if (requestOptions.path.includes('?')) {
      requestOptions.path += '&' + turnstileParams;
    } else {
      requestOptions.path += '?' + turnstileParams;
    }
  },
  
  /**
   * Cloudflare Managed Challenge bypass
   * Simulates solving the non-interactive JS challenge
   */
  cloudflareManagedChallengeBypass: (requestOptions) => {
    // Generate a managed challenge token
    const mcToken = randomString(24);
    const mcTimestamp = Math.floor(Date.now() / 1000) - randomInRange(30, 120);
    const mcSignature = randomString(64);
    
    // Create the managed challenge data structure
    const managedChallengeData = {
      token: mcToken,
      ts: mcTimestamp,
      sig: mcSignature,
      // Browser fingerprint data
      fp: {
        canvas: randomString(30),
        timezone: randomInRange(-12, 12) * 60,
        webgl: randomString(40),
        plugins: randomInRange(0, 8),
        cores: randomInRange(2, 16)
      },
      // Challenge completion metrics
      metrics: {
        timeToSolve: randomInRange(500, 3000),
        interactionCount: randomInRange(0, 2),
        challengeId: randomString(16)
      }
    };
    
    // Add to cookies
    let cookieHeader = requestOptions.headers['Cookie'] || '';
    cookieHeader += (cookieHeader ? '; ' : '') + `cf_mc_token=${mcToken}; Path=/; Max-Age=1800; Secure`;
    requestOptions.headers['Cookie'] = cookieHeader;
    
    // Add managed challenge headers
    requestOptions.headers['CF-Challenge-Id'] = managedChallengeData.metrics.challengeId;
    requestOptions.headers['CF-Challenge-Response'] = Buffer.from(JSON.stringify(managedChallengeData)).toString('base64');
    
    // Add JS challenge parameters to URL
    const mcParams = `cf_mc=${encodeURIComponent(mcToken)}&cf_mc_ts=${mcTimestamp}&cf_mc_sig=${encodeURIComponent(mcSignature)}`;
    
    if (requestOptions.path.includes('?')) {
      requestOptions.path += '&' + mcParams;
    } else {
      requestOptions.path += '?' + mcParams;
    }
  },
  
  /**
   * HTTP/2 specific bypass for Cloudflare
   * Adds HTTP/2 specific headers and settings
   */
  http2Bypass: (requestOptions) => {
    // HTTP/2 pseudo-headers must be in correct order
    const h2PseudoHeaders = {
      ':method': requestOptions.method,
      ':scheme': 'https',
      ':authority': requestOptions.hostname + (requestOptions.port && requestOptions.port !== 443 ? `:${requestOptions.port}` : ''),
      ':path': requestOptions.path
    };
    
    // HTTP/2 frame settings
    const h2Settings = {
      SETTINGS_HEADER_TABLE_SIZE: 65536,
      SETTINGS_ENABLE_PUSH: 0,
      SETTINGS_MAX_CONCURRENT_STREAMS: 1000,
      SETTINGS_INITIAL_WINDOW_SIZE: 6291456,
      SETTINGS_MAX_FRAME_SIZE: 16384,
      SETTINGS_MAX_HEADER_LIST_SIZE: 262144
    };
    
    // HTTP/2 connection info
    const h2ConnectionInfo = {
      enablePush: false,
      initialWindowSize: 1048576,
      maxFrameSize: 16384,
      maxConcurrentStreams: 100
    };
    
    // Merge HTTP/2 specific headers with existing headers
    requestOptions.h2Settings = h2Settings;
    requestOptions.h2ConnectionInfo = h2ConnectionInfo;
    
    // Add HTTP/2 specific fingerprinting evasion
    const h2Priorities = [
      // Simulate Chrome H2 priorities
      { exclusive: true, parent: 0, weight: 256, dependency: 0 },
      // Simulate Firefox H2 priorities
      { exclusive: false, parent: 0, weight: 100, dependency: 3 }
    ];
    
    requestOptions.h2Priority = h2Priorities[Math.floor(Math.random() * h2Priorities.length)];
    
    // Add HTTP/2 specific headers that help bypass detection
    requestOptions.headers['Access-Control-Request-Method'] = requestOptions.method;
    requestOptions.headers['Accept-CH'] = 'DPR, Width, Viewport-Width, Sec-CH-UA, Sec-CH-UA-Mobile, Sec-CH-UA-Platform';
    requestOptions.headers['HTTP2-Settings'] = Buffer.from(JSON.stringify(h2Settings)).toString('base64');
  }
});

module.exports = bypassTechniques; 