# Advanced Website Load Tester

A powerful and sophisticated Node.js based load testing tool designed for security testing professionals. This tool simulates realistic browser behavior while performing load tests with advanced security bypass techniques.

## ⚠️ IMPORTANT DISCLAIMER

This tool is provided for **EDUCATIONAL AND LEGITIMATE SECURITY TESTING PURPOSES ONLY**. Use of this tool against any website or web application without explicit permission from the owner is illegal and unethical. The authors of this tool accept no liability for misuse.

* Only use on systems you own
* Only use on systems you have explicit permission to test
* Document your testing authorization
* Respect legal and ethical boundaries

## Features

* Cluster-based architecture utilizing all CPU cores for maximum performance
* Comprehensive statistics reporting (requests/second, status codes, etc.)
* Advanced security bypass techniques including:
  * Header randomization and manipulation
  * Dynamic IP forwarding/spoofing simulation
  * Browser fingerprint randomization
  * Timing attack protection
  * WAF (Web Application Firewall) evasion techniques
  * Protection system-specific bypasses:
    * Cloudflare (standard and UAM/Under Attack Mode)
    * DDoSGuard
    * Akamai Bot Manager
    * Vercel protection
    * Imperva Incapsula
  * Auto-detection of protection systems
* Realistic browser simulation
* Customizable request rates and concurrency
* Support for multiple HTTP methods (GET, POST, etc.)
* Custom header and payload support
* Proxy support with rotation (single proxy or proxy list file)
* Detailed bandwidth and data transfer statistics
* Follow redirects capability
* Request timeout control

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/advanced-load-tester.git
cd advanced-load-tester

# Install dependencies
npm install

# Make executable
chmod +x loadtester.js

# Optional: Install globally
npm install -g .
```

## Usage

```bash
node loadtester.js -t https://your-target-website.com [options]
```

### Command Line Options

```
Options:
  -V, --version                   output the version number
  -t, --target <url>              Target URL
  -c, --connections <number>      Number of concurrent connections (default: 200)
  -d, --duration <seconds>        Test duration in seconds (default: 30)
  -m, --method <method>           HTTP method to use (GET, POST, etc.) (default: "GET")
  -p, --payload <file>            Payload file for POST/PUT requests
  -r, --rate <number>             Requests per second per worker (default: 50)
  -b, --bypass <techniques>       Comma-separated list of bypass techniques (default: "all")
  --headers <headers>             Custom headers in JSON format
  --no-verbose                    Disable verbose output
  --delay <ms>                    Delay between requests in ms (default: 0)
  --proxy <proxy>                 Use proxy (format: host:port)
  --proxy-file <file>             Load proxies from file (format: host:port per line)
  --log <file>                    Log results to file
  --keep-alive                    Use HTTP keep-alive
  --randomize-path                Add random path segments to URL
  --auto-detect                   Auto-detect best bypass techniques for target
  --timeout <ms>                  Request timeout in milliseconds (default: 10000)
  --follow-redirects              Follow HTTP redirects
  --max-redirects <number>        Maximum number of redirects to follow (default: 5)
  -h, --help                      display help for command
```

### Examples

#### Basic Load Test
```bash
node loadtester.js -t https://example.com -d 60 -c 100
```

#### Auto-detect Protection Systems
```bash
node loadtester.js -t https://example.com --auto-detect
```

#### With Custom Headers
```bash
node loadtester.js -t https://api.example.com -m POST -p payload.json --headers '{"Authorization":"Bearer token123"}'
```

#### Using Multiple Proxies from File
```bash
node loadtester.js -t https://example.com --proxy-file proxies.txt
```

#### With Specific Cloudflare UAM Bypass
```bash
node loadtester.js -t https://example.com -b cloudflareUAMBypass,clientHints,browserCapabilities
```

#### Advanced Options with Redirects and Timeouts
```bash
node loadtester.js -t https://example.com --follow-redirects --max-redirects 3 --timeout 5000
```

## Available Bypass Techniques

### Basic Techniques
* `randomizeHeaderOrder` - Randomize the order of HTTP headers to bypass pattern matching
* `randomizeHeaderCase` - Randomize the case of HTTP header names
* `randomForwardedIP` - Add X-Forwarded-For headers with random IPs
* `believableReferrer` - Add realistic referrer headers from search engines and social sites
* `cacheBypass` - Add cache-busting query parameters
* `clientHints` - Add modern browser client hint headers
* `browserCapabilities` - Simulate browser capabilities with appropriate headers
* `securityTokenEmulation` - Add fake security tokens and cookies
* `timingObfuscation` - Add timing attack protection
* `tlsFingerprintScrambling` - Add headers to help evade TLS fingerprinting
* `navigationBehavior` - Simulate realistic site navigation patterns
* `antiMeasurementEvasion` - Add headers to evade bot detection systems
* `contentTypeSpecificBehavior` - Set appropriate headers based on content type
* `combinedTechniques` - Apply multiple random techniques in combination
* `wafEvasion` - Generic WAF evasion techniques
* `rateLimitBypass` - Techniques to bypass rate limiting

### Protection-Specific Techniques
* `cloudflareBypass` - Bypass techniques for Cloudflare-protected sites
* `cloudflareUAMBypass` - Advanced bypasses for Cloudflare Under Attack Mode
* `ddosGuardBypass` - Specific techniques for DDoSGuard protection
* `akamaiBypass` - Techniques for bypassing Akamai Bot Manager
* `vercelBypass` - Bypasses for Vercel's protection methods
* `incapsulaBypass` - Methods for Imperva Incapsula-protected sites

## Auto-Detection Feature

The tool can automatically detect protection systems used by the target website and apply the most effective bypass techniques specifically designed for those systems.

To use this feature:

```bash
node loadtester.js -t https://example.com --auto-detect
```

Currently detected protection systems:
* Cloudflare (Standard)
* Cloudflare UAM (Under Attack Mode)
* DDoSGuard
* Akamai
* Imperva Incapsula
* Vercel
* Sucuri
* ModSecurity
* AWS WAF

## Using Proxies

The tool supports using proxies in two ways:

### Single Proxy
```bash
node loadtester.js -t https://example.com --proxy 127.0.0.1:8080
```

### Multiple Proxies from File
Create a text file with one proxy per line in the format `ip:port`:
```
192.168.1.1:8080
10.0.0.1:3128
proxy.example.com:80
```

Then use:
```bash
node loadtester.js -t https://example.com --proxy-file proxies.txt
```

The tool will automatically rotate through the proxies for each request, distributing the load and making detection more difficult.

## Performance Considerations

The tool is designed to efficiently utilize your machine's resources. The actual performance will depend on:

1. Your network connection
2. Available system resources
3. Target website's capacity and defenses
4. Bypass techniques used (some are more resource-intensive)

For maximum performance:
* Use a machine with many CPU cores
* Ensure good network connectivity
* Use proxies to distribute requests across different IP addresses
* Tune the `--rate` and `--connections` parameters based on your system capabilities

## License

MIT License

## Contributing

Contributions are welcome for educational purposes only. Please ensure all contributions adhere to ethical security testing practices. 