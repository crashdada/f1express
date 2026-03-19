# F1 Express

[![Version](https://img.shields.io/badge/version-1.2.2-blue.svg)](https://github.com/crashdada/f1express)
[![Integrity](https://img.shields.io/badge/integrity-62--point%20pass-green.svg)](https://github.com/crashdada/f1express)

F1 Express is a full-stack F1 data application that combines a historical SQLite knowledge base with live 2026 season JSON overlays. The frontend runs on React + Vite, while a lightweight Express server serves runtime assets, health checks, and container update APIs.

## Highlights

- Historical F1 coverage built from an offline pipeline into `f1.db`
- Live 2026 season overlay from JSON data sources
- In-browser SQL.js querying with IndexedDB cache
- Self-host friendly deployment with Docker health checks and update endpoints
- Separate CI verification and Docker publish workflows

## Quick Start

Requirements:

- Node.js 20+
