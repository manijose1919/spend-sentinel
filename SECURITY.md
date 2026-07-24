# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅        |

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Instead, use GitHub's private vulnerability reporting:
**[Report a vulnerability](https://github.com/manijose1919/spend-sentinel/security/advisories/new)**

We aim to acknowledge reports within 72 hours and provide a remediation timeline
after triage. Please include:

- A description of the vulnerability and its impact
- Steps to reproduce (a minimal proof-of-concept if possible)
- Affected version(s)

## Scope & design notes

Spend Sentinel (free) is a **local-first** tool: data is stored on the user's own
machine and the web dashboard binds to `localhost`. The most relevant classes of
issue are therefore:

- Injection via imported CSV data (e.g. stored XSS in the dashboard) — inputs are
  validated at the boundary and all dashboard output is HTML-escaped.
- Denial of service via malformed input — the web API enforces a request
  body-size limit and imports report per-row errors rather than crashing.

If you expose the local web server beyond `localhost`, treat it as untrusted and
place it behind your own authentication and TLS.
