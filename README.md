# 🚖 Seryvo - Modern Ride-Sharing Platform

<div align="center">

![Seryvo](https://img.shields.io/badge/Seryvo-Ride%20Sharing-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.11+-green?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-teal?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**A production-ready, multi-role transportation booking platform**

[Live Demo](https://seryvo.vectorhost.net) • [API Docs](https://seryvo.vectorhost.net/docs) • [Features](#-features) • [Quick Start](#-quick-start)

[![GitHub](https://img.shields.io/badge/GitHub-svidal--nlive%2Fseryvo-black?style=flat-square&logo=github)](https://github.com/svidal-nlive/seryvo)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [User Guides](#-user-guides)
  - [Client Guide](#-client-guide)
  - [Driver Guide](#-driver-guide)
  - [Support Agent Guide](#-support-agent-guide)
  - [Admin Guide](#-admin-guide)
- [API Documentation](#-api-documentation)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

Seryvo is a comprehensive ride-sharing platform that connects **clients**, **drivers**, **support agents**, and **administrators** through a unified web application. Built with modern technologies and designed for scalability, it provides real-time tracking, secure payments, and seamless communication between all parties.

### Why Seryvo?

- **🚀 Production Ready** - Deployed and running in production
- **💰 Cost Effective** - Uses free-tier services (Stripe Test, Resend, WebPush)
- **🔐 Secure** - JWT auth, RBAC, rate limiting, security headers (CSP, XSS, HSTS)
- **📱 Real-time** - WebSocket support for live updates
- **🌍 Scalable** - Docker-based microservices architecture
- **🏢 Multi-tenant Ready** - Organization support for SaaS deployment

---

## ✨ Features

### Core Platform
| Feature | Description |
|---------|-------------|
| **Multi-Role System** | Client, Driver, Support Agent, Admin dashboards |
| **Real-time Tracking** | Live driver location and trip progress |
| **Booking Engine** | ASAP and scheduled rides with fare estimation |
| **Payment Processing** | Stripe integration (Test + Production ready) |
| **Notifications** | Email (Resend) + Push (WebPush) notifications |
| **OTP Authentication** | Email-based verification codes |
| **Rate Limiting** | Per-endpoint limits with Redis backend |
| **Security Headers** | CSP, XSS protection, clickjacking prevention |
| **Organizations** | Multi-tenant support for SaaS deployment |

### For Clients
- 📍 Book rides (ASAP or scheduled)
- 🗺️ Real-time driver tracking
- 💳 Multiple payment methods
- 📜 Trip history and receipts
- ⭐ Rate drivers and provide feedback
- 📍 Saved locations (Home, Work)

### For Drivers
- 🟢 Toggle availability (Online/Offline)
- 📋 Accept/decline ride requests
- 🧭 Turn-by-turn navigation
- 💰 Earnings dashboard and payout tracking
- 📊 Performance metrics and ratings
- 📄 Document management

### For Support Agents
- 🎫 Ticket management system
- 💬 Access to trip and chat logs
- 💵 Issue credits/refunds (with limits)
- 📝 Internal notes and escalation
- 📞 Direct communication with users

### For Administrators
- 👥 Complete user management
- ✅ Driver document verification
- 💲 Pricing and surge configuration
- 📈 Platform analytics and KPIs
- 🔍 Audit logs and compliance
- 🌍 Region and zone management

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SERYVO PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Frontend   │  │   Mobile     │  │   External   │          │
│  │   (React)    │  │   (Future)   │  │   Services   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                  │
│         └─────────────────┼──────────────────┘                  │
│                           │                                      │
│                    ┌──────▼──────┐                              │
│                    │   Traefik   │  (Reverse Proxy + TLS)       │
│                    └──────┬──────┘                              │
│                           │                                      │
│         ┌─────────────────┼─────────────────┐                   │
│         │                 │                 │                   │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌──────▼──────┐           │
│  │  REST API   │  │  WebSocket   │  │   Static    │           │
│  │  /api/v1/*  │  │   /ws/*      │  │   Files     │           │
│  └──────┬──────┘  └───────┬──────┘  └─────────────┘           │
│         │                 │                                      │
│         └─────────┬───────┘                                     │
│                   │                                              │
│            ┌──────▼──────┐                                      │
│            │   FastAPI   │  (Backend Application)               │
│            └──────┬──────┘                                      │
│                   │                                              │
│     ┌─────────────┼─────────────┐                              │
│     │             │             │                              │
│ ┌───▼───┐   ┌─────▼─────┐  ┌───▼───┐                          │
│ │ PostgreSQL│ │   Redis   │  │ Stripe │                          │
│ │ (Database)│ │  (Cache)  │  │ Resend │                          │
│ └───────────┘ └───────────┘  └────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic |
| **Database** | PostgreSQL 15, Redis 7 |
| **Auth** | JWT tokens, bcrypt, OTP verification |
| **Payments** | Stripe (Test + Production) |
| **Email** | Resend (3,000 free/month) |
| **Push** | WebPush (W3C Standard, free) |
| **Deployment** | Docker, Docker Compose, Traefik |

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Git
- (Optional) Domain with DNS access for production

### 1. Clone the Repository

```bash
git clone https://github.com/svidal-nlive/seryvo.git
cd seryvo
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your settings
nano .env
```

**Required Settings:**
```env
# Database
DB_USER=seryvo
DB_PASSWORD=your-strong-password-here
DB_NAME=seryvo

# Security
SECRET_KEY=your-super-secret-key-min-32-chars  # Generate: openssl rand -hex 32
DEBUG=false
DEMO_MODE=true

# Stripe (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Resend (get from https://resend.com/api-keys)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=YourApp <noreply@yourdomain.com>

# WebPush (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_MAILTO=mailto:admin@yourdomain.com
```

### 3. Start Services

```bash
# Development (with hot-reload)
docker compose up -d

# Production
docker compose -f docker-compose.prod.yml up -d
```

### 4. Access the Platform

| Service | URL |
|---------|-----|
| **Web App** | http://localhost:5173 |
| **API Docs** | http://localhost:8000/docs |
| **ReDoc** | http://localhost:8000/redoc |
| **Health Check** | http://localhost:8000/health |

### 5. First-Time Setup (Admin Creation)

On first launch, the platform requires admin setup. No demo accounts are seeded by default.

**Option A: Web Setup Wizard**
1. Visit the web app at http://localhost:5173
2. You'll see the "First-Time Setup" screen
3. Enter your admin email, password, and name
4. Click "Create Admin Account"

**Option B: API Setup**
```bash
curl -X POST http://localhost:8000/api/v1/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "password": "YourSecurePassword123!",
    "full_name": "Admin User"
  }'
```

> **Note**: The first user to register automatically becomes the platform admin. This endpoint is disabled after the first admin is created.

**Optional: Seed Demo Data**
```bash
docker compose exec seryvo-backend python seed.py
```
This creates demo users:
| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@seryvo.demo | demo123 |
| **Driver** | driver@seryvo.demo | demo123 |
| **Client** | client@seryvo.demo | demo123 |

---

## 📖 User Guides

### 🚗 Client Guide

The Client Dashboard is your gateway to booking and managing rides.

#### Getting Started

1. **Register/Login**
   - Visit the platform and click "Sign Up"
   - Enter your email and create a password
   - Verify your email with the OTP code sent to you

2. **Complete Your Profile**
   - Add your name and phone number
   - Upload a profile picture (optional)
   - Save frequently used addresses (Home, Work)

#### Booking a Ride

1. **New Booking**
   - Click "Book a Ride" on the dashboard
   - Enter pickup location (or use current location)
   - Enter destination
   - Select ride type (Economy, Comfort, Premium)
   - Choose booking time (ASAP or Scheduled)
   - Review fare estimate
   - Confirm booking

2. **During the Ride**
   - Track driver location in real-time on the map
   - View driver details (name, photo, vehicle, rating)
   - Contact driver via in-app chat
   - Share trip status with trusted contacts

3. **After the Ride**
   - Rate your driver (1-5 stars)
   - Add optional feedback
   - View receipt (sent to email)
   - Report any issues to support

#### Managing Your Account

| Feature | How to Access |
|---------|---------------|
| **Payment Methods** | Profile → Payments → Add Card |
| **Trip History** | Dashboard → My Trips |
| **Saved Locations** | Profile → Saved Places |
| **Support** | Menu → Help & Support |

---

### 🚖 Driver Guide

The Driver Dashboard is your operational cockpit for managing rides and earnings.

#### Getting Started

1. **Apply as a Driver**
   - Sign up and select "Become a Driver"
   - Upload required documents:
     - Driver's License (valid, not expired)
     - Vehicle Registration
     - Insurance Certificate
     - Vehicle Photos
   - Wait for admin verification (usually 24-48 hours)

2. **Once Approved**
   - Complete your driver profile
   - Set up payout method (bank account)
   - Review the driver handbook

#### Daily Operations

1. **Going Online**
   ```
   Dashboard → Toggle "Online" → Start receiving ride requests
   ```

2. **Accepting Rides**
   - When a request comes in, you'll see:
     - Pickup and dropoff locations
     - Estimated distance and time
     - Estimated earnings
   - You have 15 seconds to Accept or Decline
   - Declining too many rides affects your acceptance rate

3. **Completing a Ride**
   ```
   Accept → Navigate to Pickup → Mark "Arrived" → 
   Passenger Boards → Start Trip → Navigate to Destination → 
   Mark "Completed" → Collect Payment
   ```

4. **Going Offline**
   - Toggle "Offline" when done for the day
   - Complete any active ride before going offline

#### Earnings & Performance

| Metric | Description | Target |
|--------|-------------|--------|
| **Acceptance Rate** | % of offers accepted | >85% |
| **Completion Rate** | % of rides completed | >95% |
| **Rating** | Average customer rating | >4.5 ★ |
| **On-Time Arrival** | % arriving within ETA | >90% |

**Earnings Breakdown:**
- Base fare (per ride type)
- Distance rate (per km/mile)
- Time rate (per minute)
- Surge pricing (during high demand)
- Tips (100% goes to driver)
- Bonuses (incentive programs)

---

### 📞 Support Agent Guide

Support agents handle customer issues and maintain service quality.

#### Accessing Support Dashboard

1. Login with your support agent credentials
2. Navigate to Support Dashboard
3. View open tickets in your queue

#### Handling Tickets

1. **Ticket Types**
   | Type | Priority | SLA |
   |------|----------|-----|
   | Safety Issue | Critical | 15 min |
   | Payment Dispute | High | 1 hour |
   | Driver Complaint | Medium | 4 hours |
   | General Inquiry | Low | 24 hours |

2. **Ticket Workflow**
   ```
   New → Assigned → In Progress → Resolved → Closed
   ```

3. **Available Actions**
   - View trip details and chat logs
   - Contact client or driver
   - Issue refund (up to $25 limit)
   - Apply account credit
   - Add internal notes
   - Escalate to admin (for complex issues)

#### Common Scenarios

| Scenario | Action |
|----------|--------|
| Driver was rude | Review trip, note driver file, offer credit |
| Wrong fare charged | Check trip data, issue refund if valid |
| Driver no-show | Verify location data, full refund + credit |
| Lost item | Connect client with driver, track resolution |
| Safety concern | Escalate immediately to admin |

---

### 👑 Admin Guide

Administrators have full platform oversight and control.

#### Admin Dashboard Overview

```
┌─────────────────────────────────────────────────┐
│              ADMIN DASHBOARD                    │
├────────────┬──────────────┬────────────────────┤
│ Active     │ Online       │ Revenue            │
│ Trips: 47  │ Drivers: 23  │ Today: $4,521      │
├────────────┴──────────────┴────────────────────┤
│ Quick Actions                                   │
│ [Verify Drivers] [View Reports] [Manage Zones] │
└─────────────────────────────────────────────────┘
```

#### Key Responsibilities

1. **User Management**
   - Approve/reject driver applications
   - Suspend/ban problematic users
   - Reset passwords and unlock accounts
   - Manage support agent permissions

2. **Driver Verification**
   ```
   Drivers → Pending Verification → Review Documents → 
   Approve/Request Resubmission/Reject
   ```

3. **Pricing Configuration**
   | Setting | Description |
   |---------|-------------|
   | Base Fare | Starting fare per ride type |
   | Per KM Rate | Distance-based pricing |
   | Per Minute Rate | Time-based pricing |
   | Surge Multiplier | High-demand pricing |
   | Commission | Platform fee (%) |

4. **Zone Management**
   - Define service areas
   - Set zone-specific pricing
   - Configure airport/special zones
   - Manage driver allocation

5. **Analytics & Reports**
   - Daily/weekly/monthly revenue
   - Trip volume trends
   - Driver performance metrics
   - Customer satisfaction scores
   - Payout reports

6. **Safety & Compliance**
   - Review flagged trips
   - Access audit logs
   - Manage safety protocols
   - Handle escalated issues

---

## 📚 API Documentation

### Authentication

All protected endpoints require a JWT token:

```bash
# Login
curl -X POST https://api.seryvo.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Response
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": { "id": 1, "email": "user@example.com", "role": "client" }
}

# Use token in subsequent requests
curl -X GET https://api.seryvo.com/api/v1/users/me \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
```

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/setup` | POST | First-time admin setup |
| `/api/v1/auth/setup-status` | GET | Check if setup is complete |
| `/api/v1/auth/register` | POST | Register new user |
| `/api/v1/auth/login` | POST | User login |
| `/api/v1/auth/password-reset` | POST | Request password reset OTP |
| `/api/v1/auth/password-reset/verify` | POST | Verify reset OTP |
| `/api/v1/bookings` | POST | Create booking |
| `/api/v1/bookings/{id}` | GET | Get booking details |
| `/api/v1/drivers/toggle-availability` | POST | Toggle driver status |
| `/api/v1/drivers/accept-job/{id}` | POST | Accept ride request |
| `/api/v1/payments/stripe/payment-intent` | POST | Create payment |
| `/ws/bookings/{booking_id}` | WS | Real-time booking updates |

### Full API Reference

Interactive API documentation available at:
- **Swagger UI**: `/docs`
- **ReDoc**: `/redoc`
- **OpenAPI JSON**: `/openapi.json`

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SECRET_KEY` | ✅ | JWT signing key (min 32 chars) |
| `DEBUG` | ❌ | Enable debug mode (default: false) |
| `DEMO_MODE` | ❌ | Enable demo mode (default: true) |
| `STRIPE_SECRET_KEY` | ✅ | Stripe API key |
| `STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe public key |
| `RESEND_API_KEY` | ✅ | Resend email API key |
| `RESEND_FROM_EMAIL` | ✅ | From email address |
| `VAPID_PUBLIC_KEY` | ❌ | WebPush public key |
| `VAPID_PRIVATE_KEY` | ❌ | WebPush private key |
| `VAPID_MAILTO` | ❌ | WebPush contact email |
| `REDIS_URL` | ❌ | Redis connection (default: redis://seryvo-redis:6379) |
| `RATE_LIMIT_ENABLED` | ❌ | Enable rate limiting (default: true) |
| `RATE_LIMIT_DEFAULT` | ❌ | Default rate limit (default: 100/minute) |
| `RATE_LIMIT_AUTH` | ❌ | Auth endpoint limit (default: 20/minute) |

### Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

---

## 🐳 Deployment

### Docker Compose (Recommended)

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: seryvo
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: seryvo
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql+asyncpg://seryvo:${DB_PASSWORD}@db:5432/seryvo
      - SECRET_KEY=${SECRET_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - RESEND_API_KEY=${RESEND_API_KEY}
    depends_on:
      - db
      - redis
    ports:
      - "8000:8000"

volumes:
  postgres_data:
  redis_data:
```

### Production Checklist

**Security**
- [ ] Set `DEBUG=false`
- [ ] Use strong `SECRET_KEY` (generate with `openssl rand -hex 32`)
- [ ] Configure SSL/TLS (via Traefik or nginx)
- [ ] Verify rate limiting is enabled (`RATE_LIMIT_ENABLED=true`)
- [ ] Review security headers in responses (CSP, XSS, HSTS)

**Infrastructure**
- [ ] Set up database backups
- [ ] Configure monitoring (health checks at `/health`)
- [ ] Set up Redis for rate limiting and caching
- [ ] Configure log aggregation (logs are JSON-formatted in production)

**Services**
- [ ] Switch Stripe to production keys
- [ ] Verify domain in Resend for email delivery
- [ ] Generate production VAPID keys for push notifications

**First Launch**
- [ ] Create admin account via `/api/v1/auth/setup` or web wizard
- [ ] Configure pricing rules in admin dashboard
- [ ] Set up service regions and zones

---

## 💻 Development

### Local Setup

```bash
# Clone repo
git clone https://github.com/svidal-nlive/seryvo.git
cd seryvo

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\activate   # Windows

# Install dependencies
cd backend
pip install -r requirements.txt

# Set up database
alembic upgrade head

# Seed demo data
python seed.py

# Run development server
uvicorn app.main:app --reload
```

### Project Structure

```
seryvo/
├── backend/
│   ├── app/
│   │   ├── api/           # API endpoints (auth, bookings, drivers, etc.)
│   │   ├── core/          # Config, security, rate limiting, errors
│   │   ├── models/        # SQLAlchemy models
│   │   └── schemas/       # Pydantic schemas
│   ├── alembic/           # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # Auth, theme contexts
│   │   ├── services/      # API clients
│   │   ├── types/         # TypeScript types
│   │   └── views/         # Page components
│   └── package.json
├── docker/                 # Dockerfiles
├── docs/                   # Documentation
├── docker-compose.yml
├── overview-revision.md    # Architecture reference
└── README.md
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_bookings.py -v
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [Stripe](https://stripe.com/) - Payment processing
- [Resend](https://resend.com/) - Email delivery
- [WebPush](https://web.dev/push-notifications/) - Push notifications

---

<div align="center">

**Built with ❤️ by the Seryvo Team**

[Report Bug](https://github.com/svidal-nlive/seryvo/issues) • [Request Feature](https://github.com/svidal-nlive/seryvo/issues)

</div>
