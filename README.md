# Netflix AI Watch Spaces 🎬🍿

> An AI-orchestrated social co-watching platform with authoritative synchronized playback, timeline-grounded anti-spoiler AI Co-Pilot, and live audience interaction.

---

## Part 1: Project Foundation & Architecture

This repository contains the production-grade foundation for the **Netflix AI Watch Spaces** internship project built on the **MERN** stack (React, Node.js, Express.js, MongoDB, Mongoose, Socket.IO, JavaScript, JWT).

---

## 📁 Project Folder Structure

```text
Netflix-Ai/
├── client/                             # Frontend application (React + Vite)
│   ├── public/                         # Static assets served directly
│   ├── src/
│   │   ├── assets/                     # UI media, icons, branding assets
│   │   ├── components/                 # Reusable layout & UI components
│   │   │   ├── ConnectionStatus.jsx    # Real-time visual health indicator (REST + Socket)
│   │   │   ├── Footer.jsx              # Application footer
│   │   │   ├── Layout.jsx              # Master application wrapper
│   │   │   └── Navbar.jsx              # Netflix-themed navigation bar
│   │   ├── pages/                      # Application route views (Placeholders for Part 1)
│   │   │   ├── Admin.jsx               # Timeline metadata CMS & ingestion view
│   │   │   ├── Dashboard.jsx           # Catalog browsing & space launch hub
│   │   │   ├── Login.jsx               # User authentication sign-in
│   │   │   ├── NotFound.jsx            # 404 error page
│   │   │   ├── Register.jsx            # User registration
│   │   │   └── WatchSpace.jsx          # Synchronized co-watching room
│   │   ├── services/                   # Network and real-time clients
│   │   │   ├── api.js                  # Axios client with interceptors & baseURL
│   │   │   └── socket.js               # Singleton Socket.IO client instance
│   │   ├── App.jsx                     # Route definitions & router provider
│   │   ├── index.css                   # Netflix dark theme design system & tokens
│   │   └── main.jsx                    # React virtual DOM entry point
│   ├── .env.example                    # Frontend environment template
│   ├── index.html                      # HTML5 root with Google Fonts (Inter, Montserrat)
│   ├── package.json                    # Frontend dependencies & scripts
│   └── vite.config.js                  # Vite bundler configuration
│
├── server/                             # Backend application (Node.js + Express)
│   ├── config/
│   │   └── db.js                       # Mongoose database connection with auto-reconnect
│   ├── middleware/
│   │   ├── errorHandler.js             # Centralized global error handling middleware
│   │   └── notFoundHandler.js          # 404 Route not found handler
│   ├── routes/
│   │   ├── healthRoutes.js             # GET /api/health endpoint
│   │   └── index.js                    # Master API router mounting sub-routers
│   ├── sockets/
│   │   └── socketHandler.js            # Socket.IO connection handling & events
│   ├── utils/
│   │   └── apiResponse.js              # Standardized API response format helpers
│   ├── .env.example                    # Backend environment template
│   ├── package.json                    # Backend dependencies & scripts
│   └── server.js                       # Express HTTP server + Socket.IO lifecycle
│
├── .gitignore                          # Root Git ignore rules
└── README.md                           # Documentation, architecture, & setup guide
```

---

## 📦 Dependencies & Packages Explained

### Backend Dependencies (`server/package.json`)

| Package | Purpose |
| :--- | :--- |
| `express` | Minimalist web framework for building HTTP REST endpoints. |
| `cors` | Cross-Origin Resource Sharing middleware enabling secure requests from the React client. |
| `dotenv` | Loads environment variables from `.env` files into `process.env`. |
| `mongoose` | Object Data Modeling (ODM) library for MongoDB providing schema validation and queries. |
| `socket.io` | Real-time bidirectional event-based communication engine for synchronized playback and chat. |
| `jsonwebtoken` | Issues and verifies cryptographically signed JWT tokens for user authentication. |
| `nodemon` *(dev)* | Automatically restarts the Node server upon file changes during development. |

### Frontend Dependencies (`client/package.json`)

| Package | Purpose |
| :--- | :--- |
| `react` & `react-dom` | Core UI library using declarative components and virtual DOM. |
| `react-router-dom` | Client-side routing enabling SPA navigation without full page reloads. |
| `axios` | Promise-based HTTP client for calling backend REST APIs with request/response interceptors. |
| `socket.io-client` | Client library for connecting to the Socket.IO WebSocket server. |
| `lucide-react` | Modern, consistent SVG icon set tailored for the UI. |
| `vite` & `@vitejs/plugin-react` *(dev)* | Lightning-fast development server with Hot Module Replacement (HMR). |

---

## 🔄 How System Components Communicate

```text
       [ Browser / React Client ]
                   │
         ┌─────────┴─────────┐
         │                   │
  HTTP REST (Axios)    WebSocket (Socket.IO)
         │                   │
         ▼                   ▼
  [ Express Routes ]   [ Socket.IO Server ]
         │                   │
         ├───────────────────┘
         │
         ▼
  [ Mongoose ODM ]
         │
         ▼
  [ MongoDB Database ]
```

1. **Client $\leftrightarrow$ Backend (REST API):**
   - The React client sends HTTP requests via the pre-configured Axios instance (`src/services/api.js`).
   - The Express backend parses incoming JSON, executes controllers/middleware, and responds using the standard JSON format `{ success, message, data, timestamp }`.

2. **Client $\leftrightarrow$ Backend (Real-Time WebSockets):**
   - The React client initializes a persistent WebSocket connection via `socket.io-client` (`src/services/socket.js`).
   - The backend attaches `socket.io` directly to the Node `http.Server` (`server.js`), allowing instant bidirectional event emission (`socket.emit()`, `socket.on()`).
   - In Part 1, the client automatically receives a `connection:ack` event upon connecting.

3. **Backend $\leftrightarrow$ MongoDB:**
   - The backend initializes a singleton connection via `server/config/db.js` using Mongoose.
   - When MongoDB is running, Mongoose manages connection pooling, schema enforcement, and queries. If MongoDB is temporarily offline during foundation setup, the server logs a clean warning and continues running HTTP/Socket services without crashing.

---

## 🚀 Commands to Run the Project

### Prerequisites
- Node.js (v18+ recommended, verified on v22.16.0)
- npm (v9+ recommended, verified on v10.9.2)
- MongoDB (optional for health check; required for persistence in Part 2)

### 1. Backend Server Setup
Open a terminal in the root directory:
```bash
cd server
npm install
npm run dev
```
- Server will listen on **`http://localhost:5000`**
- Health check available at: **`http://localhost:5000/api/health`**

### 2. Frontend Client Setup
Open a second terminal in the root directory:
```bash
cd client
npm install
npm run dev
```
- Client will run on **`http://localhost:5173`**

---

## ✅ Part 1 Verification Checklist

- [x] **Project Structure:** Clean separation of `client/` and `server/`.
- [x] **Express Backend:** Starts without errors on port 5000 with CORS and JSON parsing.
- [x] **Health Check Endpoint:** `GET /api/health` returns `200 OK` with JSON `{ success: true, status: 'healthy', ... }`.
- [x] **MongoDB Integration:** Mongoose connection logic configured in `server/config/db.js` with graceful fallback handling.
- [x] **Socket.IO Real-time Connection:** Backend logs client connections; frontend connects and logs acknowledgement.
- [x] **Centralized Error Handling:** `notFoundHandler` catches undefined routes and `errorHandler` catches unhandled exceptions.
- [x] **Standardized Response Utility:** `apiResponse.js` formats all outgoing JSON payloads uniformly.
- [x] **Environment Variables:** `.env.example` and `.env` configured for both client and server.
- [x] **React Frontend Routing:** Routes configured for `/login`, `/register`, `/dashboard`, `/space`, and `/admin`.
- [x] **Netflix-Themed Aesthetic:** Custom dark styling with brand red accent and typography.
- [x] **Live Connectivity Badges:** Navbar displays real-time health indicator for REST API and Socket.IO.
- [x] **Git Repository:** Initialized with clean `.gitignore` and structured commits.
