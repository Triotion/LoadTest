/**
 * Security Bypass Techniques for Load Testing
 * 
 * IMPORTANT DISCLAIMER:
 * This code is provided for EDUCATIONAL and LEGITIMATE SECURITY TESTING purposes only.
 * Only use on systems you own or have explicit permission to test.
 * Unauthorized testing is illegal and unethical.
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
   * Add random query parameters to bypass cache
   */
  cacheBypass: (requestOptions) => {
    const timestamp = Date.now();
    const randomParam = randomString(8);
    
    if (requestOptions.path.includes('?')) {
      requestOptions.path += `&_=${timestamp}&${randomParam}=${randomString(5)}`;
    } else {
      requestOptions.path += `?_=${timestamp}&${randomParam}=${randomString(5)}`;
    }
  },
  
  /**
   * Modify request with client hints to look like modern browsers
   */
  clientHints: (requestOptions) => {
    requestOptions.headers['Sec-CH-UA'] = `"Not.A/Brand";v="${randomInRange(8, 99)}", "Chromium";v="${randomInRange(110, 123)}", "Google Chrome";v="${randomInRange(110, 123)}"`;
    requestOptions.headers['Sec-CH-UA-Mobile'] = Math.random() > 0.7 ? '?1' : '?0';
    requestOptions.headers['Sec-CH-UA-Platform'] = ['Windows', 'macOS', 'Linux', 'Android', 'iOS'][Math.floor(Math.random() * 5)];
    requestOptions.headers['Sec-CH-UA-Platform-Version'] = `"${randomInRange(10, 15)}"`;
    requestOptions.headers['Sec-CH-UA-Full-Version-List'] = requestOptions.headers['Sec-CH-UA'];
  },
  
  /**
   * Add browser-like capabilities and behavior hints
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
   * Add security token emulation to appear as if from a valid session
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
   * Add timing attack protection
   * Add random delays to make timing-based detection harder
   */
  timingObfuscation: (requestOptions) => {
    // This is handled in the main code by adding a random delay
    // But we can add a header that some systems may use for timing metrics
    requestOptions.headers['X-Request-Start'] = Date.now().toString();
  },
  
  /**
   * Add TLS fingerprint scrambling headers
   * Some security systems analyze TLS fingerprints
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
   * Add anti-bot measurement avoidance techniques
   */
  antiMeasurementEvasion: (requestOptions) => {
    // Some systems check for JavaScript support
    requestOptions.headers['X-JavaScript-Support'] = 'true';
    
    // Add headers to mimic browser's support for modern features
    requestOptions.headers['Feature-Policy'] = 'camera *; microphone *; geolocation *';
    requestOptions.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()';
    
    // If system checks for non-standard extensions, add them
    if (Math.random() > 0.7) {
      requestOptions.headers['X-Firefox-Spdy'] = 'h2';
    }
    
    // Add realistic-looking screensize and device parameters
    const screenWidths = [1366, 1440, 1536, 1920, 2560, 3440, 3840];
    const screenHeights = [768, 900, 1080, 1200, 1440, 1600];
    
    const width = screenWidths[Math.floor(Math.random() * screenWidths.length)];
    const height = screenHeights[Math.floor(Math.random() * screenHeights.length)];
    
    requestOptions.headers['Viewport-Width'] = width.toString();
    requestOptions.headers['Device-Memory'] = [2, 4, 8, 16][Math.floor(Math.random() * 4)].toString();
  },
  
  /**
   * Mimic human-like behavior by setting appropriate headers for a specific content type
   */
  contentTypeSpecificBehavior: (requestOptions) => {
    // Based on path, set appropriate Accept headers
    const path = requestOptions.path.toLowerCase();
    
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
      // For image requests
      requestOptions.headers['Accept'] = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
      requestOptions.headers['Sec-Fetch-Dest'] = 'image';
    } else if (path.endsWith('.css')) {
      // For CSS requests
      requestOptions.headers['Accept'] = 'text/css,*/*;q=0.1';
      requestOptions.headers['Sec-Fetch-Dest'] = 'style';
    } else if (path.endsWith('.js')) {
      // For JavaScript requests
      requestOptions.headers['Accept'] = '*/*';
      requestOptions.headers['Sec-Fetch-Dest'] = 'script';
    } else if (path.includes('/api/') || path.includes('/graphql')) {
      // For API requests
      requestOptions.headers['Accept'] = 'application/json, text/plain, */*';
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.headers['Sec-Fetch-Dest'] = 'empty';
      requestOptions.headers['Sec-Fetch-Mode'] = 'cors';
    } else {
      // For HTML page requests
      requestOptions.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
      requestOptions.headers['Sec-Fetch-Dest'] = 'document';
      requestOptions.headers['Sec-Fetch-Mode'] = 'navigate';
    }
  },
  
  /**
   * Advanced technique - combine multiple bypass methods
   * This applies multiple techniques for a higher chance of bypass
   */
  combinedTechniques: (requestOptions) => {
    // Apply a random selection of 3-5 techniques
    const techniques = Object.keys(bypassTechniques).filter(t => t !== 'combinedTechniques');
    const shuffled = shuffleArray([...techniques]);
    const selectedTechniques = shuffled.slice(0, randomInRange(3, 5));
    
    selectedTechniques.forEach(technique => {
      if (bypassTechniques[technique]) {
        bypassTechniques[technique](requestOptions);
      }
    });
  },
  
  /**
   * Cloudflare specific bypass attempts
   */
  cloudflareBypass: (requestOptions) => {
    // Add headers commonly checked by Cloudflare
    requestOptions.headers['CF-IPCountry'] = ['US', 'GB', 'CA', 'AU', 'DE', 'FR'][Math.floor(Math.random() * 6)];
    requestOptions.headers['CF-Connecting-IP'] = randomIP();
    
    // Add Cookie format similar to Cloudflare's security cookies with proper values that mimic solved challenges
    const cfClearance = crypto.randomBytes(20).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const cfBm = `${Date.now().toString(16)}.${crypto.randomBytes(16).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}-${Date.now()}`;
    const cfId = crypto.randomBytes(32).toString('hex');
    
    // Add to existing cookies or create new
    const existingCookies = requestOptions.headers['Cookie'] || '';
    const cfCookies = `cf_clearance=${cfClearance}; __cf_bm=${cfBm}; __cflb=${cfId}; __cfduid=${crypto.randomBytes(24).toString('hex')}`;
    
    requestOptions.headers['Cookie'] = existingCookies ? 
      `${existingCookies}; ${cfCookies}` : cfCookies;
      
    // Add browser-like capability signals
    requestOptions.headers['sec-ch-ua'] = '"Google Chrome";v="122", "Chromium";v="122", "Not:A-Brand";v="99"';
    requestOptions.headers['sec-ch-ua-mobile'] = '?0';
    requestOptions.headers['sec-ch-ua-platform'] = '"Windows"';
    
    // Add browser capability indicators
    requestOptions.headers['Sec-Fetch-Site'] = 'same-origin';
    requestOptions.headers['Sec-Fetch-Mode'] = 'navigate';
    requestOptions.headers['Sec-Fetch-User'] = '?1';
    requestOptions.headers['Sec-Fetch-Dest'] = 'document';
  },
  
  /**
   * Enhanced Cloudflare UAM bypass with latest techniques
   */
  cloudflareUAMBypass: (requestOptions) => {
    // First apply basic Cloudflare bypass
    bypassTechniques.cloudflareBypass(requestOptions);
    
    // Generate realistic challenge tokens and parameters
    const jschToken = Math.floor(Math.random() * 900000000 + 100000000).toString();
    const cfChlCookieValue = crypto.randomBytes(32).toString('hex');
    const cfRayValue = `${crypto.randomBytes(8).toString('hex')}-${['DFW', 'LAX', 'SJC', 'SEA', 'MIA', 'EWR', 'IAD'][Math.floor(Math.random() * 7)]}`;

    // Add challenge pass parameters in the correct format
    const r = crypto.randomBytes(8).toString('hex');
    const pass = crypto.randomBytes(16).toString('hex');
    const jschl_vc = crypto.randomBytes(8).toString('hex');
    
    // Build challenge response parameters exactly as Cloudflare expects them
    if (requestOptions.path.includes('?')) {
      requestOptions.path += `&cf_clearance=${crypto.randomBytes(20).toString('hex')}`;
      requestOptions.path += `&jschl_vc=${jschl_vc}`;
      requestOptions.path += `&jschl_answer=${jschToken}`;
      requestOptions.path += `&pass=${pass}`;
      requestOptions.path += `&r=${r}`;
    } else {
      requestOptions.path += `?cf_clearance=${crypto.randomBytes(20).toString('hex')}`;
      requestOptions.path += `&jschl_vc=${jschl_vc}`;
      requestOptions.path += `&jschl_answer=${jschToken}`;
      requestOptions.path += `&pass=${pass}`;
      requestOptions.path += `&r=${r}`;
    }
    
    // Create a realistic challenge cookie structure with proper naming and values
    const existingCookies = requestOptions.headers['Cookie'] || '';
    const timestamp = Math.floor(Date.now() / 1000);
    const challengeCookies = `cf_chl_prog=x23; cf_chl_rc_ni=${cfChlCookieValue}; cf_chl_seq_${cfChlCookieValue}=1; cf_chl_2=${crypto.randomBytes(16).toString('hex')}; cf_chl_3=${crypto.randomBytes(16).toString('hex')}; cf_chl_tk=${timestamp}:${crypto.randomBytes(16).toString('hex')}`;
    
    requestOptions.headers['Cookie'] = existingCookies ? 
      `${existingCookies}; ${challengeCookies}` : challengeCookies;
      
    // Add browser telemetry data and fingerprinting values
    requestOptions.headers['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    requestOptions.headers['Accept-Language'] = 'en-US,en;q=0.9';
    requestOptions.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
    
    // Add standard Cloudflare headers with proper values
    requestOptions.headers['CF-Challenge'] = crypto.randomBytes(16).toString('hex');
    requestOptions.headers['CF-Ray'] = cfRayValue;
    requestOptions.headers['CF-Visitor'] = '{"scheme":"https"}';
    requestOptions.headers['CF-Worker'] = '1';
    requestOptions.headers['cf-bot-score'] = Math.floor(Math.random() * 50 + 50).toString(); // Higher score is better (less bot-like)
    
    // Add browser capability signals
    requestOptions.headers['Sec-CH-UA-Arch'] = `"x86"`;
    requestOptions.headers['Sec-CH-UA-Bitness'] = `"64"`;
    requestOptions.headers['Sec-CH-UA-Full-Version'] = `"122.0.6261.112"`;
    requestOptions.headers['Sec-CH-UA-Model'] = `""`;
    requestOptions.headers['Sec-CH-UA-Platform-Version'] = `"15.0.0"`;
    
    // Add additional browser fingerprint data
    requestOptions.headers['X-Requested-With'] = 'XMLHttpRequest';
    requestOptions.headers['Upgrade-Insecure-Requests'] = '1';
    requestOptions.headers['Cache-Control'] = 'max-age=0';
    
    // Add TLS fingerprinting signals
    requestOptions.headers['Accept-Encoding'] = 'gzip, deflate, br';
    requestOptions.headers['Priority'] = 'u=0, i';
  },
  
  /**
   * Cloudflare Turnstile bypass
   */
  cloudflareTurnstileBypass: (requestOptions) => {
    // First apply basic Cloudflare bypass
    bypassTechniques.cloudflareBypass(requestOptions);
    
    // Generate realistic Turnstile-specific tokens with proper format
    const turnstileToken = `${Math.floor(Date.now()/1000)}.${crypto.randomBytes(32).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;
    const turnstileResponse = `0.${crypto.randomBytes(342).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;
    const responseTime = Date.now().toString();
    
    // Add Turnstile-specific parameters with proper query structure
    if (requestOptions.path.includes('?')) {
      requestOptions.path += `&cf-turnstile-response=${turnstileResponse}`;
      requestOptions.path += `&cf-turnstile-token=${turnstileToken}`;
      requestOptions.path += `&cf-tstl-rt=${responseTime}`;
    } else {
      requestOptions.path += `?cf-turnstile-response=${turnstileResponse}`;
      requestOptions.path += `&cf-turnstile-token=${turnstileToken}`;
      requestOptions.path += `&cf-tstl-rt=${responseTime}`;
    }
    
    // Add Turnstile-specific cookies in expected format
    const existingCookies = requestOptions.headers['Cookie'] || '';
    const turnstileCookies = `cf_turnstile=${turnstileToken}; cf_turnstile_resp=${turnstileResponse.substring(0, 20)}; cf_tstl_chk=${crypto.randomBytes(12).toString('hex')}`;
    
    requestOptions.headers['Cookie'] = existingCookies ? 
      `${existingCookies}; ${turnstileCookies}` : turnstileCookies;
      
    // Add Turnstile-specific headers with proper values
    requestOptions.headers['CF-Turnstile-Response'] = turnstileResponse;
    requestOptions.headers['CF-Turnstile-Token'] = turnstileToken;
    requestOptions.headers['CF-Challenge-Type'] = 'turnstile';
    requestOptions.headers['CF-Challenge-Response-Time'] = Math.floor(Math.random() * 2000 + 500).toString();
    
    // Add browser capability signals specifically for Turnstile
    requestOptions.headers['Sec-Fetch-Site'] = 'same-origin';
    requestOptions.headers['Sec-Fetch-Mode'] = 'cors';
    requestOptions.headers['Sec-Fetch-Dest'] = 'empty';
    
    // Add realistic window dimensions and screen properties
    requestOptions.headers['X-Viewport-Width'] = '1920';
    requestOptions.headers['X-Viewport-Height'] = '1080';
    requestOptions.headers['X-Screen-Width'] = '1920';
    requestOptions.headers['X-Screen-Height'] = '1080';
    requestOptions.headers['X-DPR'] = '1.0';
  },
  
  /**
   * Cloudflare Managed Challenge bypass
   */
  cloudflareManagedChallengeBypass: (requestOptions) => {
    // First apply basic Cloudflare bypass
    bypassTechniques.cloudflareBypass(requestOptions);
    
    // Generate realistic Managed Challenge tokens that match Cloudflare's format
    const challengeToken = `${Math.floor(Date.now()/1000)}.${crypto.randomBytes(32).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;
    const challengeResponse = `1.${crypto.randomBytes(96).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}.${Date.now()}`;
    const mcSid = crypto.randomBytes(16).toString('hex');
    
    // Add correctly formatted challenge parameters
    if (requestOptions.path.includes('?')) {
      requestOptions.path += `&cf-mcr=${challengeResponse}`;
      requestOptions.path += `&cf-mc-token=${challengeToken}`;
      requestOptions.path += `&cf-mc-sid=${mcSid}`;
    } else {
      requestOptions.path += `?cf-mcr=${challengeResponse}`;
      requestOptions.path += `&cf-mc-token=${challengeToken}`;
      requestOptions.path += `&cf-mc-sid=${mcSid}`;
    }
    
    // Add properly structured Managed Challenge cookies
    const existingCookies = requestOptions.headers['Cookie'] || '';
    const timestamp = Math.floor(Date.now() / 1000);
    const challengeCookies = `cf_mc=${challengeToken}; cf_mc_r=${challengeResponse.substring(0, 20)}; cf_mcr_ts=${timestamp}; cf_mc_sid=${mcSid}; cf_mc_seq=1`;
    
    requestOptions.headers['Cookie'] = existingCookies ? 
      `${existingCookies}; ${challengeCookies}` : challengeCookies;
      
    // Add Managed Challenge headers with proper naming and values
    requestOptions.headers['CF-MC-Response'] = challengeResponse;
    requestOptions.headers['CF-MC-Token'] = challengeToken;
    requestOptions.headers['CF-Challenge-Type'] = 'managed';
    requestOptions.headers['CF-Challenge-Response-Time'] = Math.floor(Math.random() * 1000 + 300).toString();
    
    // Add specialized browser fingerprinting signals
    const screenWidth = 1920;
    const screenHeight = 1080;
    const colorDepth = 24;
    const pixelRatio = 1.0;
    
    requestOptions.headers['CF-Device-Data'] = JSON.stringify({
      screen: [screenWidth, screenHeight, colorDepth],
      ua: requestOptions.headers['User-Agent'],
      timezone: -new Date().getTimezoneOffset() / 60,
      dnt: Math.random() > 0.7 ? 1 : 0,
      language: 'en-US',
      platform: 'Win32',
      webgl: crypto.randomBytes(32).toString('hex'),
      touch: Math.random() > 0.9 ? 1 : 0,
      canvas: crypto.randomBytes(32).toString('hex'),
      fonts: crypto.randomBytes(32).toString('hex')
    });
    
    // Add browser capability indicators
    requestOptions.headers['Sec-Fetch-Site'] = 'same-origin';
    requestOptions.headers['Sec-Fetch-Mode'] = 'navigate';
    requestOptions.headers['Sec-Fetch-Dest'] = 'document';
    requestOptions.headers['Sec-Fetch-User'] = '?1';
    
    // Add TLS fingerprinting signals
    requestOptions.headers['Accept-Encoding'] = 'gzip, deflate, br';
  },
  
  /**
   * HTTP/2 specific bypass techniques
   */
  http2Bypass: (requestOptions) => {
    // Add real HTTP/2 frame settings and pseudo-headers
    if (requestOptions.isHttp2) {
      // Properly format HTTP/2 pseudo-headers
      requestOptions.headers[':method'] = requestOptions.method;
      requestOptions.headers[':path'] = requestOptions.path;
      requestOptions.headers[':scheme'] = 'https';
      requestOptions.headers[':authority'] = requestOptions.hostname;
      
      // Remove duplicates since they'll be in pseudo-headers
      delete requestOptions.headers['host'];
      
      // Add HTTP/2 specific settings
      requestOptions.settings = {
        headerTableSize: 4096,
        enablePush: true,
        initialWindowSize: 65535,
        maxFrameSize: 16384,
        maxConcurrentStreams: 100,
        maxHeaderListSize: 8192
      };
      
      // Add HTTP/2 specific headers
      requestOptions.headers['priority'] = 'u=0, i';
    }
    
    // Ensure all header names are lowercase for HTTP/2 per the spec
    if (requestOptions.isHttp2) {
      const headers = {};
      Object.keys(requestOptions.headers).forEach(key => {
        if (!key.startsWith(':')) {
          headers[key.toLowerCase()] = requestOptions.headers[key];
        } else {
          headers[key] = requestOptions.headers[key];
        }
      });
      requestOptions.headers = headers;
    }
    
    // Add HTTP/2 specific settings that are valid for both h1 and h2
    requestOptions.headers['accept-encoding'] = 'gzip, deflate, br';
    requestOptions.headers['accept-language'] = 'en-US,en;q=0.9';
    
    // These pseudo-headers are invalid and should be removed
    // They're only valid when received FROM the server, not sent TO the server
    if (requestOptions.headers[':status']) {
      delete requestOptions.headers[':status'];
    }
    
    if (requestOptions.headers[':protocol']) {
      delete requestOptions.headers[':protocol'];
    }
    
    // HTTP/2 upgrade related headers - only needed for h2c (HTTP/2 cleartext)
    if (!requestOptions.isHttp2 && requestOptions.headers && requestOptions.protocol !== 'https:') {
      requestOptions.headers['http2-settings'] = 'AAMAAABkAAQAAP__';
      requestOptions.headers['upgrade'] = 'h2c';
      requestOptions.headers['connection'] = 'Upgrade, HTTP2-Settings';
    } else {
      // For HTTP/2 over TLS, upgrade headers aren't needed
      delete requestOptions.headers['http2-settings'];
      delete requestOptions.headers['upgrade'];
      
      // For HTTP/2, connection header is prohibited
      delete requestOptions.headers['connection'];
    }
  },
  
  /**
   * DDoSGuard bypass techniques
   */
  ddosGuardBypass: (requestOptions) => {
    // Add DDoSGuard-specific cookies
    const ddgid = crypto.randomBytes(32).toString('hex');
    const ddg1 = crypto.randomBytes(16).toString('hex');
    const ddg2 = crypto.randomBytes(16).toString('hex');
    
    // Add or append cookies
    const existingCookies = requestOptions.headers['Cookie'] || '';
    const ddgCookies = `__ddgid=${ddgid}; __ddg1=${ddg1}; __ddg2=${ddg2}; __ddgmark=${Date.now()}`;
    
    requestOptions.headers['Cookie'] = existingCookies ? 
      `${existingCookies}; ${ddgCookies}` : ddgCookies;
    
    // Add DDoSGuard-specific headers
    requestOptions.headers['X-DDoS-Protect'] = '1';
    requestOptions.headers['X-DDG-Pass'] = crypto.randomBytes(24).toString('base64');
    
    // Add specific browser behavior that DDosGuard checks
    requestOptions.headers['X-Requested-With'] = 'XMLHttpRequest';
    requestOptions.headers['Sec-Fetch-Site'] = 'same-origin';
    
    // Simulate browser rendering engine
    const userAgent = requestOptions.headers['User-Agent'] || '';
    if (userAgent.includes('Chrome')) {
      requestOptions.headers['X-Chrome-Extensions'] = crypto.randomBytes(8).toString('hex');
    } else if (userAgent.includes('Firefox')) {
      requestOptions.headers['X-Firefox-Spdy'] = 'h2';
    }
  },
  
  /**
   * Akamai Bot Manager bypass techniques
   */
  akamaiBypass: (requestOptions) => {
    // Generate Akamai-format cookies
    const akamaiId = crypto.randomBytes(32).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const bmsv = Date.now().toString(36) + '~' + crypto.randomBytes(20).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const bmscExpire = new Date(Date.now() + 7200000).toUTCString();

    // Add or append cookies
    const existingCookies = requestOptions.headers['Cookie'] || '';
    const akamaiCookies = `ak_bmsc=${akamaiId}; bm_sz=${crypto.randomBytes(40).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}~YAAQpOZdaDlEv7CJAQAA; bm_sv=${bmsv}; akavpau_default=${Date.now()}~${Date.now() + 30000}`;
    
    requestOptions.headers['Cookie'] = existingCookies ? 
      `${existingCookies}; ${akamaiCookies}` : akamaiCookies;
    
    // Add specific Akamai sensor data pattern
    // This is a simplified version of what Akamai's script generates
    const sensorData = {
      "sensor_data": `${crypto.randomBytes(24).toString('hex')}1,2,-94,-100,${crypto.randomBytes(8).toString('hex')},uaend,${Math.floor(Date.now()/1000)},0,0,0,${randomInRange(1,5)},0`
    };
    
    // Add a chance to include the sensor data (which would only be needed for certain requests)
    if (Math.random() > 0.7) {
      if (requestOptions.method === 'POST') {
        requestOptions.headers['Content-Type'] = 'application/json';
        // In a real request we would set the body, but we just track that the option exists
        requestOptions._hasAkamaiSensorData = sensorData;
      } else {
        // For GET requests, add it to URL parameters
        if (requestOptions.path.includes('?')) {
          requestOptions.path += `&sensor=${encodeURIComponent(JSON.stringify(sensorData))}`;
        } else {
          requestOptions.path += `?sensor=${encodeURIComponent(JSON.stringify(sensorData))}`;
        }
      }
    }
    
    // Add Akamai-specific headers
    requestOptions.headers['Akamai-Origin-Hop'] = '1';
  },
  
  /**
   * Vercel bypass techniques
   */
  vercelBypass: (requestOptions) => {
    // Vercel systems are generally not as defense-oriented as dedicated WAFs,
    // but they do have some rate limiting and bot detection
    
    // Generate Vercel-format request IDs
    const vercelId = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}`;
    
    // Add Vercel-specific headers
    requestOptions.headers['X-Vercel-ID'] = vercelId;
    
    // Add cache control headers that Vercel looks for
    requestOptions.headers['Cache-Control'] = 'max-age=0';
    
    // Add Next.js-specific headers (common on Vercel)
    requestOptions.headers['X-Nextjs-Data'] = '1';
    
    // Typically Vercel sites use Next.js, so add a relevant header
    if (Math.random() > 0.5) {
      const nonce = crypto.randomBytes(16).toString('base64');
      requestOptions.headers['Content-Security-Policy'] = `script-src 'self' 'unsafe-eval' 'unsafe-inline' 'nonce-${nonce}' vercel.live`;
    }
    
    // Add request metadata that Vercel analytics might track
    requestOptions.headers['X-Vercel-IP'] = randomIP();
    requestOptions.headers['X-Forwarded-Proto'] = 'https';
  },
  
  /**
   * WAF (Web Application Firewall) evasion techniques
   */
  wafEvasion: (requestOptions) => {
    // Add innocent-looking query parameters that may distract WAF pattern matching
    const innocentParams = {
      'view': ['default', 'compact', 'full'][Math.floor(Math.random() * 3)],
      'lang': ['en', 'en-US', 'en-GB'][Math.floor(Math.random() * 3)],
      'theme': ['light', 'dark', 'auto'][Math.floor(Math.random() * 3)],
      'source': ['direct', 'social', 'search'][Math.floor(Math.random() * 3)]
    };
    
    // Add to path
    const paramName = Object.keys(innocentParams)[Math.floor(Math.random() * Object.keys(innocentParams).length)];
    const paramValue = innocentParams[paramName];
    
    if (requestOptions.path.includes('?')) {
      requestOptions.path += `&${paramName}=${paramValue}`;
    } else {
      requestOptions.path += `?${paramName}=${paramValue}`;
    }
    
    // Add some WAF-specific evasion headers
    requestOptions.headers['X-Original-URL'] = requestOptions.path;
    requestOptions.headers['X-Requested-With'] = 'XMLHttpRequest';
  },
  
  /**
   * Rate limit bypass attempts
   */
  rateLimitBypass: (requestOptions) => {
    // Change the apparent source of requests
    requestOptions.headers['X-Real-IP'] = randomIP();
    
    // Randomize order and timing of requests
    // This is handled by main script timing but headers can help
    requestOptions.headers['X-Request-ID'] = crypto.randomBytes(16).toString('hex');
    
    // Some systems check Origin header
    const origins = [
      'https://www.google.com',
      'https://www.facebook.com',
      'https://twitter.com',
      'https://www.instagram.com',
      'https://www.linkedin.com',
      'https://www.reddit.com',
      'https://www.tiktok.com',
      null // null means no Origin header
    ];
    
    const selectedOrigin = origins[Math.floor(Math.random() * origins.length)];
    if (selectedOrigin) {
      requestOptions.headers['Origin'] = selectedOrigin;
    }
  },
  
  /**
   * Bypass for sites using Imperva Incapsula protection
   */
  incapsulaBypass: (requestOptions) => {
    // Generate Incapsula-format cookies
    const visidIncap = crypto.randomBytes(20).toString('hex');
    const incapSes = crypto.randomBytes(24).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    // Add or append cookies
    const existingCookies = requestOptions.headers['Cookie'] || '';
    const incapsulaCookies = `visid_incap_${randomInRange(100000, 999999)}=${visidIncap}; incap_ses_${randomInRange(100, 999)}_${randomInRange(100000, 999999)}=${incapSes}`;
    
    requestOptions.headers['Cookie'] = existingCookies ? 
      `${existingCookies}; ${incapsulaCookies}` : incapsulaCookies;
    
    // Add Incapsula-specific headers
    requestOptions.headers['X-Iinfo'] = `${crypto.randomBytes(10).toString('hex')}-${Math.floor(Date.now()/1000)}`;
    
    // Mimic browser plugin detection that Incapsula sometimes performs
    requestOptions.headers['X-Plugins'] = '0';
    requestOptions.headers['X-Screen-Width'] = randomInRange(1024, 2560).toString();
    requestOptions.headers['X-Screen-Height'] = randomInRange(768, 1600).toString();
  }
};

module.exports = bypassTechniques; 