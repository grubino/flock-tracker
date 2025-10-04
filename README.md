# Flock Tracker

[![Backend Tests](https://github.com/grubino/flock-tracker/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/grubino/flock-tracker/actions/workflows/backend-tests.yml)
[![codecov](https://codecov.io/gh/grubino/flock-tracker/branch/main/graph/badge.svg)](https://codecov.io/gh/grubino/flock-tracker)

A comprehensive web application for tracking farm animals (sheep, chickens, bees), their events, and locations.

## Features

- **Animal Management**: Track animals with unique tag numbers, names, lineage (sire/dam), and birth dates
- **Event Tracking**: Record health events, treatments, breeding, and more with detailed information
- **Location Management**: Manage paddocks and locations with capacity tracking and animal movement
- **Search & Filter**: Powerful search capabilities across all entities
- **Responsive UI**: Modern React interface that works on desktop, tablet, and mobile

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Database ORM with PostgreSQL/SQLite support
- **Pydantic** - Data validation and settings management
- **Uvicorn** - ASGI server

### Frontend
- **React 18** - UI library with hooks
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **TanStack Query** - Server state management
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling

## Quick Start

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment (optional):
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. Run the server:
   ```bash
   python run.py
   # Or: uvicorn app.main:app --reload
   ```

6. Access API documentation:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment (optional):
   ```bash
   cp .env.example .env
   # Edit .env with your API URL
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=sqlite:///./flock_tracker.db
HOST=0.0.0.0
PORT=8000
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
```

## Database

The application uses SQLite by default for development. For production, configure PostgreSQL:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/flock_tracker
```

Database tables are created automatically on startup.

## API Endpoints

### Animals
- `GET /api/animals` - List animals with filtering
- `POST /api/animals` - Create new animal
- `GET /api/animals/{id}` - Get animal details
- `PUT /api/animals/{id}` - Update animal
- `DELETE /api/animals/{id}` - Delete animal
- `GET /api/animals/search?q=term` - Search animals

### Events
- `GET /api/events` - List events with filtering
- `POST /api/events` - Create new event
- `GET /api/events/{id}` - Get event details
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event
- `GET /api/events/animal/{animal_id}` - Get animal events

### Locations
- `GET /api/locations` - List locations
- `POST /api/locations` - Create new location
- `GET /api/locations/{id}` - Get location details
- `PUT /api/locations/{id}` - Update location
- `DELETE /api/locations/{id}` - Delete location
- `GET /api/locations/{id}/animals` - Get animals at location

## Development

### Backend Development
```bash
cd backend
python run.py  # Runs with auto-reload in debug mode
```

### Frontend Development
```bash
cd frontend
npm run dev  # Runs with hot module replacement
```

### Building for Production

Frontend:
```bash
cd frontend
npm run build
```

Backend:
```bash
cd backend
# Use production WSGI server like gunicorn
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.