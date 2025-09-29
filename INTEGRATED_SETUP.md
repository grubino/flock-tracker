# Integrated React + FastAPI Setup

The Flock Tracker application is now configured to serve the React frontend directly from the FastAPI backend as a single integrated application.

## ✅ What's Been Configured

### **Frontend Build Configuration**
- **Vite config** updated to output build files to `backend/static/`
- **Build command** now creates production build in the backend directory

### **Backend Static File Serving**
- **Static files** mounted at `/static` and `/assets` routes
- **React app** served from root URL (`/`)
- **SPA routing** supported (all non-API routes serve React app)
- **API routes** preserved under `/api/` prefix

### **Route Structure**
```
http://localhost:8000/              → React App (index.html)
http://localhost:8000/animals       → React App (SPA routing)
http://localhost:8000/locations     → React App (SPA routing)
http://localhost:8000/api/animals   → FastAPI API
http://localhost:8000/api/events    → FastAPI API
http://localhost:8000/docs          → FastAPI docs
http://localhost:8000/health        → FastAPI health check
```

## 🚀 How to Use

### **Option 1: Automated Build & Serve**
```bash
# Build React app and start integrated server
python build_and_serve.py
```

### **Option 2: Manual Steps**
```bash
# 1. Build React app
cd frontend
npm run build

# 2. Start backend (serves React app + API)
cd ../backend
python run.py
```

### **Option 3: Development Mode**
For development, you can still run them separately:
```bash
# Terminal 1: Backend API only
cd backend
python run.py

# Terminal 2: Frontend dev server with proxy
cd frontend
npm run dev
```

## 📁 File Structure

```
flock-tracker/
├── frontend/
│   ├── src/                    # React source code
│   ├── vite.config.ts         # Updated: outputs to ../backend/static/
│   └── package.json
├── backend/
│   ├── app/
│   │   └── main.py            # Updated: serves static files & SPA routing
│   ├── static/                # Generated: React build output
│   │   ├── index.html
│   │   ├── assets/
│   │   │   ├── index-*.js
│   │   │   └── index-*.css
│   │   └── vite.svg
│   └── run.py
├── build_and_serve.py         # Helper script
└── INTEGRATED_SETUP.md        # This file
```

## 🔧 Technical Details

### **Vite Configuration Changes**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, '../backend/static'),
    emptyOutDir: true,
  },
  // ... rest of config
})
```

### **FastAPI Static Serving**
```python
# main.py additions
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

# Serve React app from root
@app.get("/", response_class=FileResponse)
async def serve_frontend():
    return FileResponse("static/index.html")

# SPA routing catch-all
@app.get("/{full_path:path}", response_class=FileResponse)
async def serve_spa(full_path: str):
    # Serve index.html for all non-API routes
    return FileResponse("static/index.html")
```

## 🎯 Benefits

✅ **Single Server** - One port for both frontend and API
✅ **No CORS Issues** - Frontend and API on same origin
✅ **Production Ready** - Optimized static file serving
✅ **SPA Routing** - React Router works correctly
✅ **API Preserved** - All existing API functionality maintained
✅ **Easy Deployment** - Deploy as single application

## 🔄 Rebuilding Frontend

Whenever you make changes to the React app:

```bash
# Quick rebuild and restart
cd frontend && npm run build && cd ../backend && python run.py
```

Or use the helper script:
```bash
python build_and_serve.py
```

## 🌐 Accessing the Application

Once started, visit:
- **Frontend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

The React app will load and handle all frontend routing, while API calls go to `/api/*` endpoints.