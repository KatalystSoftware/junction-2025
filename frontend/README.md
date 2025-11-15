# Elämäpeli 2025 - Frontend

React 19 + Vite 7 + Tailwind v4 chat interface for the financial literacy game.

## Tech Stack

- **React 19** - Latest React with improved performance
- **Vite 7** - Lightning-fast dev server and build tool
- **Tailwind CSS v4** - Latest Tailwind with Vite plugin
- **TypeScript** - Type-safe code

## Development

```bash
# Install dependencies (from root)
pnpm install

# Run frontend dev server (from root - runs both backend and frontend)
pnpm dev

# Or run just frontend (make sure backend is running separately)
cd frontend
pnpm dev
```

Frontend runs on **http://localhost:5173**
Backend API runs on **http://localhost:4111**

## Features

- 💬 Real-time chat interface
- 📊 Live player stats (savings, debt, personality profile)
- 🎯 Scenario-based messaging
- ⚡ Typing indicators
- 📱 Responsive design
- 🎨 Modern UI with Tailwind v4

## API Integration

Frontend proxies `/game/*` requests to the Mastra backend:

- `POST /game/start` - Initialize new game
- `POST /game/message` - Send player message and get AI response

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ChatMessage.tsx     # Message bubble component
│   │   ├── PlayerStats.tsx     # Financial & personality stats
│   │   └── MessageInput.tsx    # Message input with typing indicator
│   ├── App.tsx                 # Main app component
│   ├── types.ts                # TypeScript interfaces
│   └── index.css               # Tailwind imports
├── vite.config.ts              # Vite configuration
└── package.json
```

## Building for Production

```bash
pnpm build
```

Outputs to `dist/` folder.
