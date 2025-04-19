/**
 * Advanced WAF Bypass Techniques
 * For security testing and performance evaluation purposes only
 * 
 * IMPORTANT DISCLAIMER:
 * This code is provided for EDUCATIONAL and LEGITIMATE SECURITY TESTING purposes only.
 * Only use on systems you own or have explicit permission to test.
 * Unauthorized testing is illegal and unethical.
 */

const crypto = require('crypto');
const url = require('url');

// Utility functions
const randomString = (length = 10) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

const randomIP = () => {
  return Array.from({length: 4}, () => Math.floor(Math.random() * 256)).join('.');
};

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const generateJA3Fingerprint = () => {
  // Generate realistic JA3 fingerprints
  const ja3Samples = [
    '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-21,29-23-24,0',
    '771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513-21,29-23-24-25-256-257,0',
    '771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513-21,29-23-24-25-256-257,0',
    '771,4865-4866-4867-49195-49196-49200-49199-52393-52392-49171-49172-49161-49162-156-157-47-53,0-23-65281-10-11-13-35-16-5-51-18-45-43-27-21,29-23-24-25,0'
  ];
  
  return ja3Samples[Math.floor(Math.random() * ja3Samples.length)];
};

// Collection of new WAF bypass techniques
const wafBypassTechniques = {
  /**
   * Latest Cloudflare Bot Detection Bypass
   * Uses precise browser fingerprints and behaviors to appear like a real browser
   */
  advancedCloudflareBypass: (requestOptions) => {
    // Add Cloudflare-specific headers
    requestOptions.headers['CF-IPCountry'] = ['US', 'GB', 'CA', 'AU', 'DE', 'FR'][Math.floor(Math.random() * 6)];
    requestOptions.headers['CF-Visitor'] = JSON.stringify({ "scheme": "https" });
    requestOptions.headers['CF-RAY'] = `${randomString(16).toLowerCase()}-${['EWR', 'DFW', 'LAX', 'LHR', 'FRA'][Math.floor(Math.random() * 5)]}`;
    requestOptions.headers['CF-Connecting-IP'] = randomIP();
    
    // Add browser canvas fingerprint emulation via header
    requestOptions.headers['X-Canvas-Fingerprint'] = crypto.randomBytes(16).toString('hex');
    
    // Add WebGL fingerprint emulation
    requestOptions.headers['X-WebGL-Fingerprint'] = crypto.randomBytes(22).toString('hex');
    
    // Mimic browser JS engine characteristics
    requestOptions.headers['X-JS-Engine'] = ['V8', 'SpiderMonkey', 'JavaScriptCore'][Math.floor(Math.random() * 3)];
    
    // Add mouse movement telemetry simulation
    const mouseData = {
      moves: Math.floor(Math.random() * 100) + 50,
      clicks: Math.floor(Math.random() * 8) + 1,
      elements: ['nav', 'button', 'div.content', 'a.link', 'input'][Math.floor(Math.random() * 5)]
    };
    requestOptions.headers['X-User-Interaction'] = JSON.stringify(mouseData);
    
    // Emulate browser navigation timing
    const navTiming = {
      fetchStart: Date.now() - Math.floor(Math.random() * 1000) - 2000,
      domLoading: Date.now() - Math.floor(Math.random() * 800) - 1000,
      domInteractive: Date.now() - Math.floor(Math.random() * 500) - 500,
      domComplete: Date.now() - Math.floor(Math.random() * 300)
    };
    requestOptions.headers['X-Nav-Timing'] = JSON.stringify(navTiming);
    
    // TLS fingerprinting resistance
    requestOptions.headers['X-TLS-Fingerprint'] = generateJA3Fingerprint();
  },
  
  /**
   * Neural Network Based WAF Bypass
   * Simulate patterns that ML-based WAF systems are trained to consider as legitimate
   */
  neuralNetworkWafBypass: (requestOptions) => {
    // Add natural browsing rhythm patterns
    const timeOnSite = Math.floor(Math.random() * 600) + 60; // 1-10 minutes in seconds
    const pagesViewed = Math.floor(Math.random() * 5) + 1;
    const avgTimePerPage = Math.floor(timeOnSite / pagesViewed);
    
    requestOptions.headers['X-Session-Depth'] = pagesViewed.toString();
    requestOptions.headers['X-Session-Duration'] = timeOnSite.toString();
    
    // Add realistic browser storage signatures
    const storageSignature = {
      localStorage: Math.floor(Math.random() * 30) + 5,
      sessionStorage: Math.floor(Math.random() * 10) + 2,
      cookies: Math.floor(Math.random() * 15) + 10
    };
    requestOptions.headers['X-Browser-Storage'] = JSON.stringify(storageSignature);
    
    // Add human-like input patterns
    const inputPatterns = {
      typingSpeed: Math.floor(Math.random() * 300) + 150, // ms between keystrokes
      correctionRate: Math.floor(Math.random() * 10), // percentage
      formCompletionTime: Math.floor(Math.random() * 30) + 15 // seconds
    };
    requestOptions.headers['X-Input-Metrics'] = JSON.stringify(inputPatterns);
    
    // Add spatial pointer movement signatures
    const pointerSignature = {
      speed: Math.floor(Math.random() * 100) + 50,
      acceleration: Math.floor(Math.random() * 20) + 5,
      direction_changes: Math.floor(Math.random() * 50) + 20
    };
    requestOptions.headers['X-Pointer-Metrics'] = JSON.stringify(pointerSignature);
  },
  
  /**
   * Akamai Bot Manager Bypass
   * Specifically targeting Akamai's sensor data and browser verification
   */
  akamaiBotManagerBypass: (requestOptions) => {
    // Generate fake Akamai sensor data
    const fakeSensorLength = Math.floor(Math.random() * 1000) + 3000; // Realistic length
    const fakeSensorData = crypto.randomBytes(fakeSensorLength).toString('base64');
    
    requestOptions.headers['Akamai-BM-TELEMETRY'] = fakeSensorData.substring(0, fakeSensorLength / 2);
    
    // Add fingerprint data that Akamai collects
    const bmData = {
      font_list: ["Arial", "Courier", "Georgia", "Helvetica", "Times", "Verdana"],
      plugin_count: Math.floor(Math.random() * 5) + 1,
      screen_info: `${[1920, 1366, 1440, 2560][Math.floor(Math.random() * 4)]}x${[1080, 768, 900, 1440][Math.floor(Math.random() * 4)]}x${[16, 24, 32][Math.floor(Math.random() * 3)]}`
    };
    
    // Set necessary cookies for Akamai systems
    requestOptions.headers['Cookie'] = (requestOptions.headers['Cookie'] || '') + 
                                     `; _abck=${randomString(20)}~${Math.floor(Math.random() * 10)}~${randomString(80)}~${randomString(40)}`;
    
    // Add sensor data as properly encoded parameter
    if (requestOptions.path.includes('?')) {
      requestOptions.path += `&_abck=${encodeURIComponent(randomString(40))}`;
    } else {
      requestOptions.path += `?_abck=${encodeURIComponent(randomString(40))}`;
    }
  },
  
  /**
   * Imperva/Incapsula Advanced Bypass
   * Specifically targeting Imperva's bot detection systems
   */
  impervaAdvancedBypass: (requestOptions) => {
    // Generate Incapsula cookies and fingerprints
    const visid_incap = randomString(8) + "-" + randomString(4) + "-" + randomString(4) + "-" + randomString(4) + "-" + randomString(12);
    const incap_ses = randomString(32);
    
    // Add proper Imperva/Incapsula cookies
    requestOptions.headers['Cookie'] = (requestOptions.headers['Cookie'] || '') + 
                                     `; visid_incap_${randomString(6)}=${visid_incap}; incap_ses_${randomString(6)}=${incap_ses}`;
    
    // Add indications of JavaScript execution to defeat their JS challenges
    requestOptions.headers['X-Incapsula-JavaScript'] = '1';
    requestOptions.headers['X-Imperva-Activity'] = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 60);
    
    // Add expected headers that Imperva checks
    requestOptions.headers['X-Forwarded-For'] = randomIP();
    requestOptions.headers['X-Forwarded-Host'] = new URL(requestOptions.path.startsWith('http') ? requestOptions.path : `http://${requestOptions.hostname}`).hostname;
    
    // Add special URL parameter that would typically be set by their JS challenge
    if (requestOptions.path.includes('?')) {
      requestOptions.path += `&___g_c_ver=${Math.floor(Math.random() * 5) + 1}`;
    } else {
      requestOptions.path += `?___g_c_ver=${Math.floor(Math.random() * 5) + 1}`;
    }
  },
  
  /**
   * AWS WAF + Shield Advanced Bypass
   * Focused on behavior patterns that AWS WAF typically allows
   */
  awsWafShieldBypass: (requestOptions) => {
    // Add signals of legitimate browsing
    requestOptions.headers['X-Forwarded-For'] = randomIP();
    requestOptions.headers['X-Amz-Cf-Id'] = crypto.randomBytes(11).toString('base64');
    
    // AWS Shield analyzes request patterns, so we need to shape ours to look legitimate
    const legitimateSequence = {
      "previous_pages": Math.floor(Math.random() * 5),
      "session_duration": Math.floor(Math.random() * 600) + 300,
      "user_idle_time": Math.floor(Math.random() * 30) + 5,
      "natural_flow": true
    };
    
    requestOptions.headers['X-Origin-Request-Sequence'] = JSON.stringify(legitimateSequence);
    
    // Add AWS geolocation headers with consistent values
    const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-northeast-1', 'ap-southeast-2'];
    const region = regions[Math.floor(Math.random() * regions.length)];
    
    requestOptions.headers['X-Amz-Cf-Route'] = region;
    
    // Add proper range of HTTP/2 requests & browser capabilities to appear like a real browser
    requestOptions.headers['X-Request-Mixin'] = Buffer.from(JSON.stringify({
      h2: true,
      tls_version: '1.3',
      ciphers: 'ECDHE-RSA-AES128-GCM-SHA256',
      webp_support: true,
      avif_support: Math.random() > 0.5
    })).toString('base64');
  }
};

module.exports = wafBypassTechniques; 