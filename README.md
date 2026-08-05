# NZBDESK

A polished local Usenet dashboard inspired by the clear, dense workflow of Radarr. This first build is a functional frontend prototype with queue search, filtering, job detail expansion, pause/resume controls, and an Add NZB flow.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173`.

## Connect SABnzbd

1. In SABnzbd, open **Config → General** and copy the full **API Key**.
2. Create `env.txt` in the project root and place only the API key on its first line.
3. Build and start NZBDESK:

```powershell
npm.cmd run build
npm.cmd start
```

NZBDESK binds only to `127.0.0.1`, reads the key on the server, and exposes only the queue actions used by the interface. `env.txt` is excluded from Git.

## Validation

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

## Current integration

SABnzbd queue, history, categories, refresh, queue pause/resume, per-job pause/resume, and Add NZB by URL are connected. Indexer search is a future integration.
