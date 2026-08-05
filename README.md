# NZBDESK

A polished local Usenet dashboard inspired by the clear, dense workflow of Radarr. This first build is a functional frontend prototype with queue search, filtering, job detail expansion, pause/resume controls, and an Add NZB flow.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173`.

## Validation

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

## Next integration step

Connect the queue, history, provider, and indexer surfaces to the selected Usenet downloader API (for example SABnzbd or NZBGet) and indexer/search service.
