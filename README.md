# React SPA – AEM Asset Explorer

A single-page application with a React frontend and Node.js/Express backend that calls the Adobe AEM Assets Search API and displays results as tiles.

## Project structure

```
react-spa-app/
├── server/            # Express backend (API proxy)
│   └── index.js
├── client/            # React frontend (Create React App)
│   └── src/
│       ├── components/  # Shared components (Header)
│       └── pages/       # PageOne, PageTwo
├── package.json       # Root – backend deps & scripts
└── README.md
```

## Prerequisites

- **Node.js** ≥ 16
- **npm** ≥ 8

## Quick start

```bash
# 1. Install all dependencies (root + client)
npm run install:all

# 2. Start both servers (backend on :4000, frontend on :3000)
npm run dev
```

## Configuration

### Configurable authentication link (Page 1)

Open `client/src/pages/PageOne.js` and change the `CONFIGURABLE_LINK` constant at the top of the file.

### Bearer token (Page 2)

Open `client/src/pages/PageTwo.js` and replace the `BEARER_TOKEN` constant with a valid token.

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Run backend + frontend concurrently |
| `npm run start:backend` | Run only the Express server (port 4000) |
| `npm run start:frontend` | Run only the React dev server (port 3000) |
| `npm run install:all` | Install dependencies for both root and client |
