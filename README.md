# Google Email Service

A powerful email management tool that integrates with Gmail to provide AI-powered email drafting, threading, and management.

## Tech Stack

### Backend
- **Framework**: Django, Django REST Framework
- **Real-time**: Django Channels, Redis
- **AI Integration**: Mistral AI, Hugging Face
- **Database**: PostgreSQL

### Frontend
- **Framework**: Next.js 16
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Lucide React

### Infrastructure
- **Containerization**: Docker (for PostgreSQL and Redis)

## Prerequisites

- Python 3.8+
- Node.js 18+
- Docker & Docker Compose

## Environment Setup

### Backend
Create a `.env` file in the `backend/` directory with the following variables:

```env
SECRET_KEY=your_secret_key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
MISTRAL_API_KEY=your_mistral_api_key
HF_API_KEY=your_hf_api_key
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

### Frontend
Create a `.env` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
```

## Installation & Running

### 1. Storage Services
Start the PostgreSQL and Redis containers:

```bash
cd storage
mkdir -p ~/Documents/Projects/Google_email_service/storage/postgres_data
docker compose up -d
```

### 2. Backend
Set up and run the Django backend:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
uvicorn google_email_service.asgi:application --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend
Install dependencies and start the Next.js development server:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

## API Documentation
Once the backend is running, you can access the API documentation at:
`http://localhost:8000/api/schema/swagger-ui/`