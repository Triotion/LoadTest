# Advanced Website Load Testing Tool

A powerful and feature-rich load testing tool designed for security testing and performance evaluation purposes.

## Features

- **Advanced Load Testing**: Generate high-volume traffic with customizable request rates, connections, and durations
- **Security Bypass Techniques**: Modern bypass techniques for popular protection systems like Cloudflare, Akamai, Imperva, and AWS WAF
- **Protocol Support**: HTTP/1.1 and HTTP/2 support
- **Proxy Support**: Rotate through proxies or use a single proxy
- **Protection Detection**: Auto-detect protection systems and apply appropriate bypass techniques
- **Detailed Statistics**: Real-time and final statistics on requests, success rates, bandwidth usage, and more
- **Customizable Options**: Extensive command-line options for fine-tuning your testing

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/load-tester.git

# Install dependencies
cd load-tester
npm install
```

## Usage

```bash
node loadtester.js -t https://your-target-url.com [options]
```

### Basic Options

- `-t, --target <url>`: Target URL (required)
- `-c, --connections <number>`: Number of concurrent connections (default: 10)
- `-d, --duration <seconds>`: Test duration in seconds (default: 30)
- `-m, --method <method>`: HTTP method to use (GET, POST, etc.) (default: GET)
- `-r, --rate <number>`: Requests per second per worker (default: 50)
- `-b, --bypass <techniques>`: Comma-separated list of bypass techniques (default: all)

### Advanced Options

- `--headers <headers>`: Custom headers in JSON format
- `--verbose`: Enable verbose output
- `--delay <ms>`: Delay between requests in ms
- `--proxy <proxy>`: Use proxy (format: host:port)
- `--proxy-file <file>`: Load proxies from file (format: host:port per line)
- `--auto-detect`: Auto-detect best bypass techniques for target
- `--protocol <protocol>`: HTTP protocol to use (http1, http2)

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
node loadtester.js -t https://example.com -b cloudflareUAMBypass,cloudflareTurnstileBypass -d 60 -c 50
```

With proxies:
```bash
node loadtester.js -t https://example.com --proxy-file ./proxies.txt -d 120 -c 200
```

Auto-detect protection:
```bash
node loadtester.js -t https://example.com --auto-detect -d 60 -c 100
```

## Bypass Techniques

The tool includes numerous bypass techniques for different protection systems:

- **Cloudflare**: UAM bypass, Turnstile bypass, Managed Challenge bypass, and more
- **Akamai**: Bot Manager bypass, fingerprint scrambling
- **Imperva/Incapsula**: Advanced bypass techniques
- **AWS WAF/Shield**: Specialized bypass methods
- **Generic**: Header randomization, browser capabilities simulation, and more

## Important Disclaimer

This tool is provided for **EDUCATIONAL and LEGITIMATE SECURITY TESTING purposes only**. Only use on systems you own or have explicit permission to test. Unauthorized testing is illegal and unethical.

## Support Development

If you find this tool valuable, consider donating to support ongoing development:

- BTC: bc1qtkm7dzjp76gx8t9c02pshfd8rzarj6gj9yzglu
- ETH: 0x88Aa0E09a5A62919321f38Fb4782A17f4dc91A9B
- XMR: 0x6730c52B3369fD22E3ACc6090a3Ee7d5C617aBE0

## Author

Developed By Triotion - [Telegram Channel](https://t.me/Triotion)

## License

This project is licensed under the MIT License - see the LICENSE file for details. 