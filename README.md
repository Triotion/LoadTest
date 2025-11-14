# Advanced Website Load Testing Tool

A powerful and feature-rich load testing tool designed for security testing and performance evaluation purposes.

## Features

- **Advanced Load Testing**: Generate high-volume traffic with customizable request rates, connections, and durations.
- **HTTP/2 Rapid Reset Attack**: Integrated implementation of the CVE-2023-44487 (HTTP/2 Rapid Reset) attack for stress testing.
- **Advanced WAF Evasion**: A comprehensive suite of modern bypass techniques for popular protection systems like Cloudflare, Akamai, Imperva, and AWS WAF. Includes behavioral biometric evasion, header and protocol abuse, and payload padding.
- **Protocol Support**: Full support for HTTP/1.1 and HTTP/2, including low-level control for specialized attacks.
- **Proxy Support**: Rotate through proxies from a file or use a single proxy for all connections.
- **Protection Detection**: Auto-detects WAFs and other protection systems to recommend the most effective bypass techniques.
- **Detailed Statistics**: Real-time and final statistics on requests, success rates, bandwidth usage, and more.
- **Customizable Options**: Extensive command-line options for fine-tuning your testing parameters and attack vectors.

## Installation

```bash
# Clone the repository
git clone https://github.com/Triotion/LoadTest.git

# Install dependencies
cd LoadTest
npm install
```

## Usage

```bash
node loadtester.js -t https://example.com [options]
```

### Basic Options

- `-t, --target <url>`: Target URL (required)
- `-d, --duration <seconds>`: Test duration in seconds (default: 30)
- `-c, --connections <number>`: Number of concurrent connections (default: 10)
- `-r, --rate <number>`: Requests per second per worker (default: 50)
- `-m, --method <method>`: HTTP method to use (GET, POST, etc.) (default: GET)
- `-p, --payload <file>`: Payload file for POST/PUT requests
- `-b, --bypass <techniques>`: Comma-separated list of bypass techniques (default: all)

### Advanced Options

- `--rapid-reset`: Enable HTTP/2 Rapid Reset (CVE-2023-44487) attack mode.
- `--protocol <protocol>`: HTTP protocol to use (`http1.0`, `http1.1`, `http2`).
- `--headers <headers>`: Custom headers in JSON format (e.g., '{"My-Header": "Value"}').
- `--proxy <proxy>`: Use a single proxy (format: `host:port`).
- `--proxy-file <file>`: Load proxies from a file (one `host:port` per line).
- `--auto-detect`: Auto-detect WAF and apply recommended bypass techniques.
- `--follow-redirects`: Automatically follow HTTP redirects.
- `--timeout <ms>`: Request timeout in milliseconds (default: 10000).
- `--delay <ms>`: Delay between requests in milliseconds.
- `--verbose`: Enable verbose output for debugging.

For more options, run:

```bash
node loadtester.js --help
```

## Example Commands

Basic load test:
```bash
node loadtester.js -t https://example.com -d 60 -c 100
```

With Cloudflare bypass:
```bash
node loadtester.js -t https://example.com -b cloudflareUAMBypass,advancedCloudflareBypass -d 60 -c 50
```

With proxies:
```bash
node loadtester.js -t https://example.com --proxy-file ./proxies.txt -d 120 -c 200
```

HTTP/2 Rapid Reset attack:
```bash
node loadtester.js -t https://example.com --rapid-reset -d 120 -c 50 -r 100 --proxy-file ./proxies.txt
```

## Bypass Techniques

The tool includes a wide array of advanced bypass techniques designed to evade detection by modern WAFs and bot management systems. These can be combined for maximum effect.

### Key Bypass Categories:

- **Behavioral Evasion**: Simulates realistic human behavior, including mouse movements, keyboard dynamics, and session patterns to defeat ML-based bot detection (`behavioralBiometricsEvasion`, `neuralNetworkWafBypass`).
- **Fingerprint Camouflage**: Manipulates TLS, HTTP/2, and browser fingerprints to mimic legitimate clients and avoid common bot signatures (`tlsFingerprintScrambling`, `http2Bypass`, `advancedCloudflareBypass`).
- **Protocol & Header Abuse**: Uses non-standard headers, ambiguous syntax, and protocol-level tricks to confuse WAF parsers (`protocolHeaderAbuse`, `randomizeHeaderCase`, `randomizeHeaderOrder`).
- **Payload Obfuscation**: Pads and obfuscates request paths and queries to bypass signature-based rules (`wafPayloadPadding`).
- **WAF-Specific Techniques**: Includes specialized modules to target the defenses of major providers like Cloudflare, Akamai, Imperva, and AWS (`cloudflareUAMBypass`, `akamaiBotManagerBypass`, `impervaAdvancedBypass`, `awsWafShieldBypass`).
- **Generic Evasion**: A collection of general-purpose techniques like referer spoofing, cache-busting, and IP rotation (`believableReferrer`, `cacheBypass`, `randomForwardedIP`).

## Important Disclaimer

This tool is provided for **EDUCATIONAL and LEGITIMATE SECURITY TESTING purposes only**. Only use on systems you own or have explicit permission to test. Unauthorized testing is illegal and unethical.

## Support Development

If you find this tool valuable, consider donating to support ongoing development:

- BTC: bc1qtkm7dzjp76gx8t9c02pshfd8rzarj6gj9yzglu
- ETH: 0x88Aa0E09a5A62919321f38Fb4782A17f4dc91A9B
- XMR: 0x6730c52B3369fD22E3ACc6090a3Ee7d5C617aBE0

## Author

Developed By Triotion - [Telegram Channel](https://t.me/+9aG_4k6j7xNkYzY1(group))

## License

This project is licensed under the MIT License - see the LICENSE file for details.