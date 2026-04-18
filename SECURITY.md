# Security Policy

## Supported Versions

Only the latest version of each package receives security updates. Please ensure you are using the most recent release before reporting an issue.

| Package                     | Version |
| --------------------------- | ------- |
| `@kitsunekode/yt-ddp` (CLI) | Latest  |
| Browser Extension           | Latest  |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly:

1. **Go to the [Security tab](../../security/advisories/new)** of this repository and create a private advisory using GitHub Security Advisories.
2. Include a description of the vulnerability, steps to reproduce, and potential impact.
3. We will acknowledge your report within 48 hours and provide a timeline for resolution.

### What to report

- Credential exposure (OAuth tokens, API keys, secrets)
- Data leakage or unauthorized access
- Supply chain or dependency vulnerabilities
- Any other security concern

### What NOT to report

- Bugs that have no security implications
- Issues with the YouTube Data API itself (report to Google)
- Vulnerabilities in dependencies that are not directly used by this project

## Response Process

1. **Acknowledgment** — within 48 hours
2. **Assessment** — within 7 days
3. **Fix** — within 30 days (or sooner for critical issues)
4. **Disclosure** — coordinated public disclosure after fix is released

## Security Best Practices for Users

- Never commit `.env` files or `client_secret*.json` files to the repository
- Store OAuth credentials outside the project directory (e.g., `~/.config/yt-ddp/`)
- Use the `yt-ddp setup` command to securely store credentials
- Rotate OAuth secrets if you suspect they have been exposed
