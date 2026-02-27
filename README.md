# NipponGo

An offline-first Progressive Web App (PWA) for Japan travel, optimized for iOS Safari.

## Features

- 🗺️ **Interactive Map** - View your location, hotels, and activities on OpenStreetMap
- 🏨 **Hotel Management** - Track past, current, and future hotel stays
- 🎯 **Activities** - Plan activities sorted by proximity to your location
- 💱 **Currency Converter** - EUR ⇄ JPY with offline cache
- 👥 **Real-time Location** - See other logged-in users on the map
- 📱 **iOS PWA** - Add to Home Screen for native-like experience
- 🔒 **Simple Auth** - Username/password authentication
- 📴 **Offline First** - Works without internet using cached data

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS (iOS aesthetics)
- **Database**: SQLite (better-sqlite3)
- **State**: Zustand + TanStack Query
- **Real-time**: Socket.io
- **Maps**: React-Leaflet (OpenStreetMap)

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication
│   │   ├── hotels/        # Hotels CRUD
│   │   ├── activities/    # Activities CRUD
│   │   ├── currency/      # Currency rates
│   │   └── users/         # User location
│   ├── globals.css        # Global styles
│   ├── layout.jsx         # Root layout
│   └── page.jsx           # Main page
├── components/            # React components
├── lib/                   # Database & utilities
├── store/                 # Zustand stores
├── public/               # Static assets
│   ├── manifest.json     # PWA manifest
│   ├── sw.js             # Service worker
│   └── icons/            # App icons
├── server.js             # Custom server (Socket.io)
├── Dockerfile
└── docker-compose.yml
```

## iOS Installation

1. Open the app in Safari on iOS
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will run in standalone mode

## API Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth` | GET, POST, PUT, DELETE | Authentication |
| `/api/hotels` | GET, POST, PUT, DELETE | Hotels CRUD |
| `/api/activities` | GET, POST, PUT, DELETE | Activities CRUD |
| `/api/currency` | GET | EUR/JPY exchange rate |
| `/api/users` | PUT | Update user location |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PATH` | `./data/japan-travel.db` | SQLite database path |
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment |

## License

MIT
