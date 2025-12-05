# 🚖 Seryvo - Modern Ride-Sharing Platform

<div align="center">

![Seryvo](https://img.shields.io/badge/Seryvo-Ride%20Sharing-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.11+-green?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-teal?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18+-blue?style=for-the-badge&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker)

**A production-ready, multi-role transportation booking platform**

[Features](#-features) • [Quick Start](#-quick-start) • [Production Deploy](#-production-deployment) • [API Docs](#-api-documentation)

</div>

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose v2+
- Git
- (Optional) Domain with DNS for production

### 1. Clone the Repository

```bash
git clone https://github.com/svidal-nlive/seryvo.git
cd seryvo
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Generate a secure secret key
SECRET_KEY=$(openssl rand -hex 32)
echo "Generated SECRET_KEY: $SECRET_KEY"

# Edit .env with your settings
nano .env
# OR
vim .env
```

**Required changes in `.env`:**
```bash
DB_PASSWORD=your_secure_password_here
SECRET_KEY=<paste the generated key>
```

### 3. Start the Stack

```bash
# Build and start all services
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health**: http://localhost:8000/health

---

## 🏭 Production Deployment

For production with Traefik reverse proxy and TLS:

### 1. Configure for Production

```bash
# Edit .env for production
nano .env
```

Update these values:
```bash
DOMAIN=seryvo.yourdomain.com
DEBUG=false
DEMO_MODE=false  # or true for demo
```

### 2. Start with Production Profile

```bash
# Make sure proxy network exists
docker network create proxy 2>/dev/null || true

# Start with production profile
docker compose --profile production up -d --build
```

### 3. Verify Deployment

```bash
# Check all services are healthy
docker compose --profile production ps

# Test the endpoints
curl -k https://seryvo.yourdomain.com/health
curl -k https://seryvo.yourdomain.com/api/v1/
```

---

## 📁 Project Structure

```
seryvo/
├── backend/                 # FastAPI backend
│   ├── app/                 # Application code
│   │   ├── api/             # API routes
│   │   ├── core/            # Core config, security
│   │   ├── models/          # SQLAlchemy models
│   │   └── schemas/         # Pydantic schemas
│   ├── alembic/             # Database migrations
│   └── requirements.txt     # Python dependencies
├── frontend/                # React + Vite frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── views/           # Page views
│   │   ├── services/        # API services
│   │   └── hooks/           # Custom hooks
│   └── package.json
├── docker/                  # Docker configuration
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
├── docs/                    # Documentation
├── docker-compose.yml       # Main compose file
├── .env.example             # Environment template
└── README.md
```

---

## ✨ Features

### Core Platform
- **Multi-Role System** - Client, Driver, Support Agent, Admin dashboards
- **Real-time Tracking** - Live driver location and trip progress
- **Booking Engine** - ASAP and scheduled rides with fare estimation
- **Payment Processing** - Stripe integration (Test + Production ready)
- **Notifications** - Email (Resend) + Push (WebPush) notifications
- **OTP Authentication** - Email-based verification codes

### For Clients
- 📍 Book rides (ASAP or scheduled)
- 🗺️ Real-time driver tracking
- 💳 Multiple payment methods
- ⭐ Rate drivers and provide feedback

### For Drivers
- 🟢 Toggle availability (Online/Offline)
- 📋 Accept/decline ride requests
- 💰 Earnings dashboard and payout tracking
- 📊 Performance metrics

### For Administrators
- 👥 Complete user management
- ✅ Driver document verification
- 📈 Platform analytics
- 🔍 Audit logs

---

## 🔧 Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_PASSWORD` | ✅ | - | PostgreSQL password |
| `SECRET_KEY` | ✅ | - | JWT signing key (min 32 chars) |
| `DOMAIN` | Production | seryvo.vectorhost.net | Your domain name |
| `DEBUG` | No | false | Enable debug mode |
| `DEMO_MODE` | No | true | Enable demo features |
| `STRIPE_SECRET_KEY` | No | - | Stripe API key |
| `RESEND_API_KEY` | No | - | Resend email API key |

### Docker Profiles

- **Default (no profile)**: Local development with exposed ports
- **`production`**: Traefik integration with TLS

---

## 🛠️ Development

### Running Locally Without Docker

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Database Migrations

```bash
# Create a new migration
docker compose exec seryvo-backend alembic revision --autogenerate -m "description"

# Apply migrations
docker compose exec seryvo-backend alembic upgrade head

# Rollback
docker compose exec seryvo-backend alembic downgrade -1
```

---

## 📚 API Documentation

When running, access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

---

## 🔒 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- CORS protection
- Rate limiting (coming soon)

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
