# 🏠 Lodger Management System

A comprehensive, production-ready property management system for UK landlords and lodgers with flexible payment cycles, automated PDF agreements, and complete tenant/landlord portals.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![React](https://img.shields.io/badge/react-18.2.0-blue)
![Docker](https://img.shields.io/badge/docker-ready-blue)

---

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Payment System](#payment-system)
- [API Documentation](#api-documentation)
- [Usage Guide](#usage-guide)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Maintenance](#maintenance)

---

## ✨ Features

### For Landlords
- ✅ **Complete Dashboard** - Analytics, statistics, and overview
- ✅ **4-Step Onboarding Wizard** - Streamlined tenant creation
- ✅ **28-Day Payment Cycles** - UK standard lodger payment tracking
- ✅ **Payment Confirmation System** - Review and confirm tenant payments
- ✅ **Multiple Notice Types** - Termination, breach, extension with automatic calculations
- ✅ **Maintenance Management** - Track repair requests with photos
- ✅ **Damage Reports** - Document property damage with evidence
- ✅ **Rent-a-Room Tax Tracking** - £7,500 allowance monitoring
- ✅ **PDF Agreement Generation** - Legally compliant UK lodger agreements
- ✅ **Profile Management** - Update address, phone, and contact details
- ✅ **Rooms Management** - Configure property rooms for tenancy assignment
- ✅ **Lodger Information Editing** - Update tenant contact information
- ✅ **Backup & Restore** - Database management tools
- ✅ **Factory Reset** - Complete system reset for development/testing

### For Lodgers/Tenants
- ✅ **Payment Schedule View** - See all upcoming and past payments
- ✅ **Payment Submission** - Notify landlord when payment sent
- ✅ **Digital Agreement Signing** - Review and accept terms with photo ID upload
- ✅ **Maintenance Requests** - Submit issues with photo uploads
- ✅ **Document Access** - Download signed agreements
- ✅ **Balance Tracking** - Real-time payment status and credit/owed amounts
- ✅ **Payment History** - Complete audit trail
- ✅ **Mobile Responsive** - Access from any device

### Payment System Features
- ✅ **28-Day Cycles** - Exactly 28 days, not calendar months (13 payments/year)
- ✅ **Advance Rent** - First payment = current period + 1 month advance
- ✅ **Balance Formula** - D = C - B (Balance = Paid - Due)
- ✅ **Credit Rollover** - Overpayments automatically carry forward
- ✅ **Pro-Rata Calculations** - Accurate final payments on termination
- ✅ **Two-Step Payment Flow** - Tenant submits → Landlord confirms
- ✅ **Full Audit Trail** - Track submission and confirmation dates
- ✅ **Payment Status** - Pending, Submitted, Paid, Overdue

### Technical Features
- ✅ **RESTful API** - 40+ endpoints
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Role-Based Access** - Landlord, Lodger, Admin roles
- ✅ **PostgreSQL Database** - 20+ tables with full relationships
- ✅ **Automated Backups** - Scheduled database dumps
- ✅ **Rate Limiting** - Protection against abuse
- ✅ **File Upload Handling** - Secure photo ID and maintenance photos
- ✅ **Audit Logging** - Complete activity tracking
- ✅ **Responsive Design** - Mobile, tablet, and desktop
- ✅ **Docker Containerization** - Easy deployment
- ✅ **Initial Setup Wizard** - Guided first-time installation
- ✅ **Factory Reset** - Complete system reset for development
- ✅ **Rooms Management** - Property room configuration system

---

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** - Installed and running
- **Git** (optional) - For cloning the repository

### 5-Minute Setup

```bash
# 1. Clone or download the project
git clone https://github.com/nowkillkennys/lodger-manger.git
cd lodger-manger

# 2. Start all services with Docker Compose
docker-compose up -d

# 3. Wait for containers to start (about 30 seconds)
docker-compose ps

# 4. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Database: localhost:5432
```

### Initial Setup Process

**First-Time Setup:**
1. **Admin Account**: System creates `admin@example.com` automatically
2. **Password Setup**: Set admin password via setup wizard
3. **Landlord Creation**: Create your first landlord account
4. **Ready to Use**: System is fully configured

**Existing System:**
- Login with your existing landlord credentials
- Access at: http://localhost or http://localhost:3000

⚠️ **Complete the initial setup wizard on first run!**

---

## 📁 Project Structure

```
lodger-manager/
├── docker-compose.yml              # Container orchestration
├── .env                            # Root environment variables
├── README.md                       # This comprehensive guide
├── .gitignore                      # Git ignore rules
│
├── backend/                        # Node.js/Express API Server
│   ├── Dockerfile                  # Backend container config
│   ├── package.json                # Node dependencies
│   ├── .env                        # Backend environment vars
│   ├── server.js                   # Main API server (1200+ lines)
│   ├── paymentCalculator.js        # 28-day cycle logic
│   └── scripts/
│       └── init-database.js        # Database initialization
│
├── frontend/                       # React Application
│   ├── Dockerfile                  # Frontend container config
│   ├── nginx.conf                  # Nginx configuration
│   ├── package.json                # React dependencies
│   ├── .env                        # Frontend environment vars
│   ├── tailwind.config.js          # Tailwind CSS config
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js                # React entry point
│       ├── App.jsx                 # Main app component
│       ├── config.js               # API configuration
│       └── components/
│           ├── Login.jsx           # Login screen
│           ├── LandlordDashboard.jsx  # Landlord portal
│           ├── LodgerDashboard.jsx    # Tenant portal
│           ├── PaymentSchedule.jsx    # Payment management
│           └── StatCard.jsx        # Dashboard widgets
│
└── database/
    └── init.sql                    # PostgreSQL schema & setup
```

---

## 🔧 Installation & Setup

### Option 1: Docker Deployment (Recommended)

This is the fastest and easiest method:

```bash
# 1. Ensure Docker is running
docker --version
docker-compose --version

# 2. Start all services
docker-compose up -d

# 3. Check container status
docker-compose ps

# 4. View logs (optional)
docker-compose logs -f

# 5. Access application
open http://localhost:3000
```

### Option 2: Local Development Setup

For development without Docker:

```bash
# Terminal 1 - Start PostgreSQL
docker run --name lodger-postgres \
  -e POSTGRES_DB=lodger_management \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -p 5432:5432 \
  -d postgres:15-alpine

# Terminal 2 - Start Backend
cd backend
npm install
npm run dev

# Terminal 3 - Start Frontend
cd frontend
npm install
npm start
```

---

## ⚙️ Configuration

### Environment Variables

#### Root `.env`
```env
DB_PASSWORD=your_secure_password_here
JWT_SECRET=your_super_secret_jwt_key_here
```

#### `backend/.env`
```env
NODE_ENV=production
PORT=3001
DB_HOST=postgres
DB_PORT=5432
DB_NAME=lodger_management
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
JWT_SECRET=your_super_secret_jwt_key_here
FRONTEND_URL=http://localhost:3000
```

#### `frontend/.env`
```env
REACT_APP_API_URL=http://localhost:3001
```

### Generate Secure Secrets

```bash
# Generate JWT secret (32+ characters)
openssl rand -base64 32

# Generate password hash for database
node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('YourPassword', 10));"
```

---

## 💰 Payment System

### Understanding 28-Day Cycles

The system uses **28-day payment cycles** instead of calendar months. This is the UK standard for lodger agreements and ensures:
- ✅ Consistent payment periods (always 28 days)
- ✅ Fair calculations (no 28/29/30/31 day discrepancies)
- ✅ 13 payments per year (365 ÷ 28 ≈ 13)

### Example Payment Schedule

**Tenancy Details:**
- Start Date: October 15, 2025
- Monthly Rent: £850

**Generated Schedule:**
```
Payment #1: Oct 15, 2025 → £1,700 (current + advance)
  └─ Covers: Oct 15 - Nov 11 (current period)
  └─ Covers: Nov 12 - Dec 9 (advance period)

Payment #2: Nov 12, 2025 → £850
  └─ Covers: Dec 10 - Jan 6

Payment #3: Dec 10, 2025 → £850
  └─ Covers: Jan 7 - Feb 3

Payment #4: Jan 7, 2026 → £850
  └─ Covers: Feb 4 - Mar 3

... continues every 28 days
```

### Advance Rent Explained

**First Payment Structure:**
- £850 for **current period** (Oct 15 - Nov 11)
- £850 for **next period in ADVANCE** (Nov 12 - Dec 9)
- **Total: £1,700**

**Important:** The advance is **NOT a refundable deposit** - it's rent paid for a period the tenant will live there.

### Balance Calculation

**Formula: D = C - B**
- **D** = Balance (Positive = Credit, Negative = Owed)
- **C** = Rent Paid (Total amount paid)
- **B** = Rent Due (Amount due for period)

**Example:**
```
Rent Due: £850
Rent Paid: £900
Balance: +£50 (credit carries forward to next payment)

Next Payment:
Rent Due: £850
Credit Applied: -£50
Amount Owed: £800
```

### Notice Termination & Final Payments

When a 28-day notice is given, the system automatically:

1. ✅ Calculates the termination date (notice date + 28 days)
2. ✅ Finds the last payment made
3. ✅ Determines what date that payment covered until (last payment + 28 days)
4. ✅ Calculates any pro-rata payment or refund needed

**Scenario: Notice Given Mid-Cycle**

```
Payment Schedule:
  Payment #3: Dec 10 (covers until Jan 6)

Notice Given: December 15
Termination Date: January 12 (28 days later)

Calculation:
  Paid Until: January 6
  Terminating: January 12
  Gap: 6 days (Jan 6-12)
  Pro-Rata Charge: 6 × (£850 ÷ 28) = £182.14

  BUT tenant has £850 advance credit from Payment #1

  Final Settlement: £182.14 - £850 = -£667.86

  Result: REFUND £667.86 TO TENANT
```

The system creates a final payment entry in the schedule showing the exact calculation in the notes field.

### Two-Step Payment Workflow

**Step 1: Tenant Submits Payment**
- Tenant clicks "Submit Payment" on their dashboard
- Enters amount, payment method, reference, and notes
- Status changes to **"Submitted"** (blue badge)
- Landlord receives notification

**Step 2: Landlord Confirms Payment**
- Landlord sees **"Submitted - Review Needed"** status
- Reviews tenant's submission details (pre-filled in form)
- Can adjust amount if needed (e.g., partial payment)
- Confirms receipt
- Status changes to **"Paid"** (green badge)
- Payment date recorded
- Balance updated

---

## 📡 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication Endpoints

```http
POST   /api/auth/login              # User login
POST   /api/auth/register           # Register new landlord
GET    /api/auth/verify             # Verify JWT token
POST   /api/auth/reset-password     # Password reset
```

### Setup & Administration Endpoints

```http
GET    /api/setup/status            # Check if initial setup needed
POST   /api/setup/admin/password    # Set admin password (first setup)
POST   /api/setup/landlord          # Create landlord account (admin only)
POST   /api/factory-reset           # Complete system reset (admin only)
```

**Login Request:**
```json
{
  "email": "admin@example.com",
  "password": "admin123",
  "userType": "landlord"
}
```

**Login Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "uuid",
    "email": "admin@example.com",
    "fullName": "Admin User",
    "userType": "landlord",
    "phone": "07700900000",
    "address": "123 Main Street, London"
  }
}
```

### Tenancy Endpoints

```http
GET    /api/tenancies                   # List all tenancies (landlord)
POST   /api/tenancies                   # Create new tenancy
GET    /api/tenancies/:id               # Get tenancy details
PUT    /api/tenancies/:id               # Update tenancy
POST   /api/tenancies/:id/accept        # Lodger accepts agreement
POST   /api/tenancies/:id/notice        # Give termination notice
GET    /api/tenancies/:id/pdf           # Download agreement PDF
GET    /api/tenancies/:id/payments      # Get payment schedule
GET    /api/tenancies/:id/notices       # Get notice history
```

### Payment Endpoints

```http
GET    /api/tenancies/:id/payments      # Get payment schedule
POST   /api/payments/:id/submit         # Lodger submits payment
POST   /api/payments/:id/confirm        # Landlord confirms payment
```

**Submit Payment Request:**
```json
{
  "amount": 850.00,
  "payment_method": "bank_transfer",
  "payment_reference": "REF123456",
  "notes": "Paid via online banking"
}
```

**Confirm Payment Request:**
```json
{
  "amount": 850.00,
  "payment_method": "bank_transfer",
  "payment_reference": "REF123456",
  "notes": "Confirmed received"
}
```

### User Endpoints

```http
GET    /api/users/profile               # Get current user profile
PUT    /api/users/profile               # Update own profile (landlord)
PUT    /api/users/:id                   # Update lodger info (landlord only)
```

### Dashboard Endpoints

```http
GET    /api/dashboard/landlord          # Landlord statistics
GET    /api/dashboard/lodger            # Lodger overview
```

---

## 📖 Usage Guide

### Creating a Tenancy (Landlord)

1. Login as landlord
2. Navigate to **Tenancies** tab
3. Click **"New Tenancy"** button
4. Follow the 4-step wizard:

**Step 1: Lodger Details**
- Full name
- Email address
- Phone number
- Create lodger account password

**Step 2: Financial Terms**
- Monthly rent amount
- Start date
- Deposit amount (if applicable)
- Payment frequency (28-day default)

**Step 3: Property Details**
- Room description
- Shared areas
- Any special terms

**Step 4: Review & Create**
- Review all details
- System automatically generates:
  - Payment schedule
  - Lodger account
  - PDF agreement

### Managing Payments (Landlord)

1. Go to **Tenancies** tab
2. Click **"Payments"** on any tenancy
3. View complete payment schedule

**To Confirm a Submitted Payment:**
1. Look for **"Submitted - Review Needed"** (blue badge)
2. Click **"Confirm Payment"** button
3. Review tenant's submission details (pre-filled)
4. Adjust amount if needed
5. Click **"Record Payment"**
6. Status updates to **"Paid"** (green badge)

### Submitting Payments (Lodger)

1. Login as lodger
2. Navigate to **Payments** tab
3. Click **"Submit Payment"** on next due payment
4. Fill in details:
   - Amount paid
   - Payment method (Bank Transfer, Cash, etc.)
   - Payment reference (transaction ID)
   - Optional notes
5. Click **"Submit to Landlord"**
6. Status changes to **"Submitted"** (awaiting landlord confirmation)

### Giving Notice (Landlord)

1. Go to **Tenancies** tab
2. Click **"Give Notice"** on active tenancy
3. Select notice reason:
   - Breach of Agreement
   - End of Term
   - Landlord Needs Property
   - Other
4. Select sub-reason (e.g., non-payment, damage, etc.)
5. Choose notice period:
   - 0 days (immediate termination for serious breaches)
   - 3, 7, 14, or 28 days
6. Add additional notes (optional)
7. Submit notice

**What Happens Next:**
- System calculates termination date
- Generates final pro-rata payment
- Accounts for advance rent credit
- Updates tenancy status to "notice_given"
- Creates notice document
- Final payment appears in payment schedule

### Updating Profile (Landlord)

1. Navigate to **Settings** tab
2. Update your information:
   - Full Name
   - Email
   - Phone
   - Address (this auto-fills in new tenancy agreements)
3. Click **"Save Changes"**

### Editing Lodger Information (Landlord)

1. Go to **Lodgers** tab
2. Find the lodger in the table
3. Click **"Edit"** button
4. Update:
   - Full Name
   - Email
   - Phone
5. Click **"Save Changes"**

---

## 🚢 Deployment

### Deployment Options

Choose the deployment method that best fits your infrastructure:

- **🐳 Docker Compose**: Simple single-server deployment (recommended for most users)
- **📊 Portainer Stack**: Container management via Portainer UI
- **☁️ Cloud Platforms**: AWS, DigitalOcean, Google Cloud, etc.
- **🏢 On-Premise**: Traditional server deployment

### Production Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Generate secure JWT_SECRET (32+ characters)
- [ ] Update database password
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up proper domain name
- [ ] Configure firewall (only allow ports 80, 443)
- [ ] Enable database automated backups
- [ ] Set up monitoring/logging
- [ ] Review CORS origins in backend
- [ ] Test disaster recovery procedure
- [ ] Update all dependencies to latest stable versions
- [ ] Configure email notifications (if implemented)
- [ ] Set up rate limiting on API endpoints
- [ ] Review and test all security measures

### Docker Production Deployment

```bash
# Option 1: Build locally and deploy
# 1. Update environment variables for production
vi .env
vi backend/.env
vi frontend/.env

# 2. Build containers
docker-compose build --no-cache

# 3. Start services
docker-compose up -d

# Option 2: Use published Docker Hub images
# 1. Update docker-compose.yml to use published images (see Portainer section)
# 2. Set environment variables
vi .env

# 3. Start services
docker-compose up -d

# 4. Check all containers are running
docker-compose ps

# 5. View logs to ensure no errors
docker-compose logs -f

# 6. The system will automatically create an admin account
# Admin email: admin@example.com
# Complete setup via the web interface at http://your-domain

# 7. Test the application
curl http://localhost:3001/api/health
```

### Publishing to Docker Hub

To publish your own version of the images to Docker Hub:

```bash
# 1. Login to Docker Hub
docker login

# 2. Run the deployment script
./deploy.sh

# Or manually:
# Build backend
docker build -t yourusername/lodger-manager-backend:latest ./backend
docker push yourusername/lodger-manager-backend:latest

# Build frontend
docker build -t yourusername/lodger-manager-frontend:latest ./frontend
docker push yourusername/lodger-manager-frontend:latest

# Update docker-compose.yml to use your images
# Change: image: nowkillkennys/lodger-manager-backend:latest
# To:     image: yourusername/lodger-manager-backend:latest
```

### Portainer Stack Deployment

For easy GUI deployment using Portainer:

```bash
# 1. Copy the production compose file
cp docker-compose.prod.yml docker-compose.yml

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your secure passwords

# 3. In Portainer:
# - Go to Stacks
# - Create new stack
# - Upload docker-compose.prod.yml
# - Add environment variables from .env
# - Deploy the stack

# The stack includes:
# ✅ PostgreSQL database with health checks
# ✅ Backend API with published images
# ✅ Frontend with published images
# ✅ Nginx reverse proxy (optional)
# ✅ Proper networking and volumes
# ✅ Health checks for all services
```

### Portainer Stack Deployment

For Portainer users, use this stack configuration:

```yaml
version: '3.8'

services:
  lodger_db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: lodger_management
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - lodger_postgres_data:/var/lib/postgresql/data
    networks:
      - lodger_network
    restart: unless-stopped

  lodger_backend:
    image: nowkillkennys/lodger-manager-backend:latest
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: lodger_db
      DB_PORT: 5432
      DB_NAME: lodger_management
      DB_USER: postgres
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
    depends_on:
      - lodger_db
    volumes:
      - lodger_uploads:/app/uploads
      - lodger_backups:/app/backups
    networks:
      - lodger_network
    restart: unless-stopped

  lodger_frontend:
    image: nowkillkennys/lodger-manager-frontend:latest
    environment:
      REACT_APP_API_URL: ""
    depends_on:
      - lodger_backend
    networks:
      - lodger_network
    restart: unless-stopped

  lodger_nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"  # For SSL
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro  # For SSL certificates
    depends_on:
      - lodger_frontend
      - lodger_backend
    networks:
      - lodger_network
    restart: unless-stopped

volumes:
  lodger_postgres_data:
  lodger_uploads:
  lodger_backups:

networks:
  lodger_network:
    driver: bridge
```

**Portainer Environment Variables:**
```env
DB_PASSWORD=your_secure_db_password_here
JWT_SECRET=your_32_character_jwt_secret_here
FRONTEND_URL=https://yourdomain.com
```

**Portainer Stack Setup:**
1. Go to **Stacks** → **Add Stack**
2. Name: `lodger-management`
3. Repository URL: `https://github.com/nowkillkennys/lodger-manger.git`
4. Compose path: `docker-compose.yml`
5. Environment variables: Add the variables above
6. Deploy the stack
7. Access at: `http://your-portainer-server`

### Cloud Platform Deployment

#### AWS EC2
```bash
# 1. Launch EC2 instance (t3.medium recommended)
# 2. Install Docker and Docker Compose
# 3. Clone repository and run setup.sh
# 4. Configure security groups (ports 80, 443, 22)
# 5. Set up domain and SSL certificate
```

#### DigitalOcean Droplet
```bash
# 1. Create Ubuntu droplet (2GB RAM minimum)
# 2. SSH into droplet
# 3. Install Docker and Docker Compose
# 4. Clone repository: git clone https://github.com/nowkillkennys/lodger-manger.git
# 5. Run: cd lodger-manger && chmod +x setup.sh && ./setup.sh
```

#### Google Cloud Run
```bash
# Build and push images to GCR
docker build -t gcr.io/YOUR_PROJECT/lodger-backend ./backend
docker build -t gcr.io/YOUR_PROJECT/lodger-frontend ./frontend
docker push gcr.io/YOUR_PROJECT/lodger-backend
docker push gcr.io/YOUR_PROJECT/lodger-frontend

# Deploy using Cloud Run services
```

### Nginx Reverse Proxy (Optional)

For production with SSL:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

### Backup & Restore

**Automated Daily Backups:**
```bash
# Add to crontab
0 2 * * * docker exec lodger_db pg_dump -U postgres lodger_management | gzip > /backups/lodger_$(date +\%Y\%m\%d).sql.gz

# Keep only last 30 days
0 3 * * * find /backups -name "lodger_*.sql.gz" -mtime +30 -delete
```

**Manual Backup:**
```bash
# Backup database
docker exec lodger_db pg_dump -U postgres lodger_management > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup with compression
docker exec lodger_db pg_dump -U postgres lodger_management | gzip > backup.sql.gz
```

**Restore Database:**
```bash
# From SQL file
cat backup.sql | docker exec -i lodger_db psql -U postgres lodger_management

# From compressed file
gunzip -c backup.sql.gz | docker exec -i lodger_db psql -U postgres lodger_management
```

---

## 🧪 Testing

### Manual Testing Workflow

**Complete End-to-End Test:**

1. **Landlord Creates Tenancy**
   - [ ] Login as landlord (admin@example.com)
   - [ ] Create new tenancy via 4-step wizard
   - [ ] Verify payment schedule generated
   - [ ] Verify first payment is double (£1,700)
   - [ ] Download PDF agreement

2. **Lodger Accepts Agreement**
   - [ ] Logout and login as lodger (lodger@example.com)
   - [ ] See tenancy agreement modal
   - [ ] Upload photo ID
   - [ ] Accept agreement
   - [ ] Verify agreement signed

3. **Payment Submission & Confirmation**
   - [ ] Lodger submits Payment #1 (£1,700)
   - [ ] Verify status shows "Submitted"
   - [ ] Login as landlord
   - [ ] See "Submitted - Review Needed" status
   - [ ] Confirm payment
   - [ ] Verify status shows "Paid" for both users
   - [ ] Verify balance updated correctly

4. **Notice Termination**
   - [ ] Landlord gives 28-day notice
   - [ ] Verify termination date calculated
   - [ ] Verify final payment generated
   - [ ] Check notes explain calculation
   - [ ] Verify tenancy status = "notice_given"

5. **Profile Management**
   - [ ] Landlord updates profile (Settings tab)
   - [ ] Landlord edits lodger info (Lodgers tab)
   - [ ] Verify changes saved

### Database Testing

```bash
# Check payment schedule generated correctly
docker exec -it lodger_db psql -U postgres -d lodger_management
SELECT payment_number, due_date, rent_due, rent_paid, balance, payment_status
FROM payment_schedule
WHERE tenancy_id = 'YOUR_TENANCY_ID'
ORDER BY payment_number;

# Check user was created
SELECT id, email, full_name, user_type, created_at
FROM users
WHERE email = 'lodger@example.com';

# Check tenancy details
SELECT id, start_date, monthly_rent, status
FROM tenancies
WHERE id = 'YOUR_TENANCY_ID';
```

---

## 🆕 Recent Updates & Features

### Rooms Management System
**New Feature:** Landlords can now manage their property rooms and assign them to tenancies.

**Landlord Profile (My Profile Tab):**
- Add up to 2 rooms with custom names/descriptions
- Remove rooms as needed
- Room data saved to user profile

**Tenancy Creation:**
- Room Description field now uses a dropdown
- Dropdown populated with landlord's configured rooms
- Ensures consistent room naming across tenancies

**Implementation:**
- Added `rooms` JSONB column to users table
- Updated profile endpoints to handle room data
- Created `AddressDisplay` component for consistent address formatting
- Added comprehensive tests for address utilities

### Initial Setup Flow
**New Feature:** Complete setup wizard for first-time installation.

**Setup Process:**
1. **Admin Account Creation** - `admin@example.com` created automatically
2. **Password Setup** - Admin sets password (minimum 6 characters)
3. **Landlord Account Creation** - Admin creates first landlord account
4. **Normal Operation** - App functions normally after setup

**Setup Components:**
- `SetupWizard.jsx` - Main orchestrator with 2-step progress
- `AdminPasswordSetup.jsx` - Password setup for admin
- `LandlordAccountCreation.jsx` - Create landlord accounts

**Backend Endpoints:**
- `GET /api/setup/status` - Check if setup needed
- `POST /api/setup/admin/password` - Set admin password
- `POST /api/setup/landlord` - Create landlord accounts

### Factory Reset Functionality
**New Feature:** Complete system reset for development/testing.

**Factory Reset Process:**
1. **Admin Authentication** - Requires admin@example.com login
2. **Password Verification** - Enter current admin password
3. **Confirmation** - Type "FACTORY RESET" exactly
4. **Database Wipe** - Drops all tables and recreates schema
5. **Admin Recreation** - Creates new admin account
6. **Setup Trigger** - Redirects to initial setup wizard

**Security Features:**
- Admin-only access
- Password verification
- Confirmation text requirement
- Multiple warning dialogs

### React Error Prevention
**Fix:** Address objects rendering directly in JSX causing "Objects are not valid as a React child" errors.

**Solution:**
- Created shared `formatAddress` utility function
- Added `AddressDisplay` React component
- Updated all address rendering to use the component
- Added TypeScript types for address objects
- Comprehensive test coverage

**Files Updated:**
- `frontend/src/utils/addressUtils.ts` - Address formatting utility
- `frontend/src/components/AddressDisplay.jsx` - Reusable component
- Updated all components using addresses (PaymentSchedule, LandlordDashboard, LodgerDashboard)

### Photo ID Display Fix
- **Issue:** Photo ID images weren't displaying in tenancy details
- **Fix:** Updated file path handling to include `/uploads/general/` subdirectory
- **Changes:**
  - Updated `server.js` line 667 to save correct path
  - Configured Helmet.js for cross-origin image loading
  - Fixed nginx configuration to point to `frontend:80`

### Payment Details Feature
Landlords can now provide bank account details to lodgers for rent payments.

**Landlord Side (Settings Tab):**
- Bank Account Number field
- Sort Code field
- Payment Reference field
- Details saved to user profile

**Lodger Side (Payment Submission):**
- Landlord's bank details displayed in green info box
- Shows account number, sort code, and payment reference
- Appears when submitting rent payments

**Implementation:**
- Added 3 columns to users table: `bank_account_number`, `bank_sort_code`, `payment_reference`
- Updated PUT `/api/users/profile` endpoint to save payment details
- Modified tenancies query to include landlord payment details for lodgers
- Added UI components in [LandlordDashboard.jsx](frontend/src/components/LandlordDashboard.jsx) (lines 1093-1132)
- Added display in [LodgerDashboard.jsx](frontend/src/components/LodgerDashboard.jsx) (lines 1038-1063)

### Legal Agreement Update
Updated PDF generation with complete UK lodger agreement text:
- PART 1 with all property and payment details
- Section 1-10: Complete legal clauses
- Proper termination clauses (Section 9)
- Behaviour breach clause (9.3)
- Right to Rent compliance (Immigration Act 2014)
- Payment day auto-filled: "The 28th day of each month"
- All sections match official lodger agreement template

**Updated in:** [server.js](backend/server.js) lines 749-895

### Remote Access Configuration
Fixed login issues when accessing from iPad or other devices via IP address.

**Before:** `frontend/src/config.js` had `API_URL = 'http://localhost:3001'`
**After:** `API_URL = ''` (empty string for relative URLs)

**Benefits:**
- Works from any device on local network
- Access via `http://192.168.x.x:80`
- All API calls route through nginx proxy
- No need to update config for each device

### Agreement Modal UX Improvements
**Added Features:**
- Close button (X) in agreement modal header
- "Action Required" alert banner on Overview tab when unsigned
- "Review & Sign Agreement" button on Agreement tab
- Ability to close and return to complete agreement later

**Implementation:**
- Added close button in [LodgerDashboard.jsx](frontend/src/components/LodgerDashboard.jsx) (lines 697-711)
- Added alert banner with AlertTriangle icon (lines 287-305)
- Added review button on Agreement tab (lines 608-614)

### Name Auto-Fill in Agreements
Fixed issue where landlord and lodger names weren't appearing in generated agreements.

**Changes:**
- Updated tenancies query to JOIN users table for `landlord_name` and `lodger_name`
- Modified frontend to use `tenancy.landlord_name` instead of placeholder
- Updated PDF generation to use proper lodger name from database
- Agreement now shows: "HOUSEHOLDER (Landlord): John Smith" and "LODGER: Jane Doe"

**Files Updated:**
- [server.js](backend/server.js) - Added JOINs to tenancies query (lines 513-529, 704-716)
- [LodgerDashboard.jsx](frontend/src/components/LodgerDashboard.jsx) - Updated name display (line 800)

### Missing API Endpoints Added
Created three new endpoints to resolve console errors:

**GET /api/payments** ([server.js](backend/server.js) lines 987-1020)
- Returns all payments for landlord or lodger
- Includes property address and lodger name
- Filtered by user role

**GET /api/notifications** ([server.js](backend/server.js) lines 1027-1035)
- Placeholder for future notifications feature
- Returns empty array for now

**GET /api/dashboard/landlord** ([server.js](backend/server.js) lines 1042-1094)
- Total properties count
- Total lodgers count
- Total rent collected this month
- Pending payments count
- Active tenancies count
- Notice period tenancies count

### Database Schema Changes

**Payment Details & Rooms:**
```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS bank_sort_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS rooms JSONB;
```

**Payment Submission Fields:**
```sql
ALTER TABLE payment_schedule
ADD COLUMN IF NOT EXISTS lodger_submitted_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS lodger_submitted_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS lodger_payment_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS lodger_payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS lodger_notes TEXT;
```

**Status Updates:**
```sql
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE tenancy_status ADD VALUE IF NOT EXISTS 'notice_given';
```

### Configuration Files Updated

**nginx.conf:**
- Fixed upstream frontend port from 3000 to 80
- Resolves 502 Bad Gateway error

**frontend/src/config.js:**
- Changed API_URL from localhost to empty string
- Enables access from any device via IP address

### Testing & Quality Assurance
- Reset test accounts for clean onboarding testing
- Verified photo ID upload and display
- Tested payment submission and confirmation workflow
- Validated notice termination calculations
- Confirmed all features work on iPad via IP access

---

## 🔧 Troubleshooting

### Frontend Can't Connect to Backend

**Symptoms:** "Network Error" or "Failed to fetch"

**Solutions:**
```bash
# 1. Check backend is running
docker-compose ps backend

# 2. Check backend logs for errors
docker-compose logs backend --tail=50

# 3. Verify API URL in frontend config
cat frontend/.env
# Should show: REACT_APP_API_URL=http://localhost:3001

# 4. Test API directly
curl http://localhost:3001/api/health

# 5. Restart backend
docker-compose restart backend
```

### Database Connection Failed

**Symptoms:** "ECONNREFUSED" or "Connection refused"

**Solutions:**
```bash
# 1. Check PostgreSQL is running
docker-compose ps postgres

# 2. Check database logs
docker-compose logs postgres --tail=50

# 3. Verify connection parameters
docker exec -it lodger_db psql -U postgres -d lodger_management

# 4. Check environment variables match
cat backend/.env | grep DB_
# Verify DB_PASSWORD, DB_HOST, DB_NAME match docker-compose.yml

# 5. Restart PostgreSQL
docker-compose restart postgres

# 6. If still failing, recreate database
docker-compose down
docker volume rm lodger-manager_postgres_data
docker-compose up -d
```

### Login Fails with "Invalid Credentials"

**Solutions:**
```bash
# 1. Verify user exists in database
docker exec -it lodger_db psql -U postgres -d lodger_management
SELECT email, user_type FROM users WHERE email = 'admin@example.com';

# 2. Check JWT_SECRET matches in backend/.env and .env

# 3. Generate new password hash
node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('admin123', 10));"

# 4. Update user password
UPDATE users SET password_hash = '$2b$10$NEW_HASH' WHERE email = 'admin@example.com';
```

### Payment Schedule Not Generating

**Solutions:**
```bash
# Check if tenancy was created properly
docker exec -it lodger_db psql -U postgres -d lodger_management
SELECT * FROM tenancies WHERE id = 'TENANCY_ID';

# Check if payment_schedule entries exist
SELECT COUNT(*) FROM payment_schedule WHERE tenancy_id = 'TENANCY_ID';

# If no payments, check backend logs when creating tenancy
docker-compose logs backend | grep -i payment

# Payments are generated during tenancy creation
# May need to recreate the tenancy if schedule is missing
```

### Port Already in Use

**Solutions:**
```bash
# Find process using port 3000 (frontend)
lsof -i :3000

# Find process using port 3001 (backend)
lsof -i :3001

# Kill process (replace PID)
kill -9 PID

# Or change ports in docker-compose.yml
# Then restart: docker-compose down && docker-compose up -d
```

### Docker Containers Won't Start

**Solutions:**
```bash
# Check Docker is running
docker info

# View container errors
docker-compose logs --tail=100

# Remove and recreate containers
docker-compose down -v
docker-compose up -d

# Check disk space
docker system df

# Clean up unused resources
docker system prune -a
```

### PDF Generation Fails

**Solutions:**
```bash
# Check PDFKit is installed
docker exec lodger_backend npm list pdfkit

# Check uploads directory exists and has permissions
docker exec lodger_backend ls -la /app/uploads

# Create directory if missing
docker exec lodger_backend mkdir -p /app/uploads
docker exec lodger_backend chmod 755 /app/uploads

# Check backend logs for PDF errors
docker-compose logs backend | grep -i pdf
```

---

## 🔒 Security

### Authentication & Authorization

- **JWT Tokens:** Secure token-based authentication
- **bcrypt Password Hashing:** 10 salt rounds
- **Role-Based Access Control:** Landlord, Lodger, Admin roles
- **Protected Routes:** Middleware checks on all sensitive endpoints
- **Token Expiry:** 24-hour session timeout

### Security Features Implemented

✅ **Input Validation** - All user inputs sanitized
✅ **SQL Injection Protection** - Parameterized queries throughout
✅ **XSS Protection** - React's built-in escaping + Helmet.js
✅ **CORS Configuration** - Restricted origins
✅ **Rate Limiting** - 100 requests per 15 minutes per IP
✅ **Secure Headers** - Helmet.js security headers
✅ **Environment Secrets** - No credentials in code
✅ **File Upload Validation** - Type, size, and virus checking
✅ **Password Strength** - Minimum requirements enforced
✅ **Audit Logging** - All actions tracked with timestamps

### Security Best Practices

**1. Strong Passwords**
```bash
# Generate secure random password
openssl rand -base64 24

# Check password strength (minimum requirements):
- At least 12 characters
- Mixed case (A-Z, a-z)
- Numbers (0-9)
- Special characters (!@#$%^&*)
```

**2. SSL/TLS in Production**
- Use Let's Encrypt for free certificates
- Force HTTPS (redirect all HTTP to HTTPS)
- Enable HSTS headers

**3. Regular Updates**
```bash
# Update dependencies
cd backend && npm audit fix
cd frontend && npm audit fix

# Check for vulnerabilities
npm audit
```

**4. Backup Strategy**
- Daily automated database backups
- Keep backups for 30 days minimum
- Store backups off-site or in cloud
- Test restore procedure monthly

**5. Monitoring**
- Log all authentication attempts
- Alert on failed login attempts (5+ in 10 minutes)
- Monitor disk space and memory usage
- Review audit logs weekly

**6. Additional Recommendations**
- [ ] Implement 2FA for landlord accounts
- [ ] Set up intrusion detection (fail2ban)
- [ ] Use a Web Application Firewall (WAF)
- [ ] Enable database connection encryption
- [ ] Implement API key rotation
- [ ] Set up automated security scanning
- [ ] Regular penetration testing
- [ ] GDPR compliance review

---

## 🛠️ Maintenance

### Regular Tasks

**Daily:**
```bash
# Check all containers running
docker-compose ps

# Monitor disk usage
docker system df

# Check logs for errors
docker-compose logs --tail=100 | grep -i error
```

**Weekly:**
```bash
# Review audit logs
docker exec -it lodger_db psql -U postgres -d lodger_management
SELECT * FROM audit_log WHERE created_at > NOW() - INTERVAL '7 days' ORDER BY created_at DESC LIMIT 100;

# Check for failed login attempts
SELECT * FROM audit_log WHERE action = 'login_failed' AND created_at > NOW() - INTERVAL '7 days';

# Backup database
docker exec lodger_db pg_dump -U postgres lodger_management > weekly_backup_$(date +%Y%m%d).sql
```

**Monthly:**
```bash
# Update dependencies
cd backend && npm update
cd frontend && npm update

# Optimize database
docker exec -it lodger_db psql -U postgres -d lodger_management -c "VACUUM ANALYZE;"

# Review disk usage and clean old backups
find /backups -name "*.sql" -mtime +30 -delete

# Test backup restore procedure
```

### Monitoring

**Health Check:**
```bash
# Check API health
curl http://localhost:3001/api/health

# Check database connectivity
docker exec lodger_db pg_isready -U postgres

# Check all services
docker-compose ps
```

**View Logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Search logs
docker-compose logs backend | grep ERROR
docker-compose logs backend | grep -i payment

# Export logs
docker-compose logs > application.log
```

**Resource Usage:**
```bash
# Container stats (CPU, Memory)
docker stats

# Disk usage
docker system df -v

# Database size
docker exec -it lodger_db psql -U postgres -d lodger_management
SELECT pg_database_size('lodger_management');
SELECT pg_size_pretty(pg_database_size('lodger_management'));
```

---

## 📚 Database Schema

### Core Tables

**users** - Landlords, lodgers, and admins
```sql
id, email, password_hash, full_name, user_type, phone, address, rooms, bank_account_number,
bank_sort_code, payment_reference, is_active, created_at, updated_at
```

**tenancies** - Lodger agreements
```sql
id, landlord_id, lodger_id, property_address, start_date, end_date, monthly_rent,
payment_day, deposit_amount, deposit_applicable, status, lodger_signature, signature_date,
photo_id_path, created_at, updated_at
```

**payment_schedule** - 28-day payment tracking
```sql
id, tenancy_id, payment_number, due_date, rent_due, rent_paid, balance,
payment_status, payment_date, payment_method, payment_reference,
lodger_submitted_amount, lodger_submitted_date, lodger_payment_reference,
lodger_payment_method, lodger_notes, notes, created_at, updated_at
```

**notices** - Termination and extension notices
```sql
id, tenancy_id, notice_type, given_by, given_to, notice_date, effective_date,
reason, breach_clause, extension_months, extension_status, notice_letter_path,
status, created_at, updated_at
```

### Payment Status Values
- `pending` - Not yet paid or submitted
- `submitted` - Lodger has submitted notification
- `paid` - Landlord has confirmed payment
- `partial` - Partially paid
- `overdue` - Past due date and not paid
- `waived` - Waived by landlord

### Tenancy Status Values
- `draft` - Being created
- `active` - Currently active
- `notice_given` - Notice period in effect
- `terminated` - Ended
- `expired` - Past end date

---

## 📱 Mobile & Browser Support

### Supported Browsers

✅ **Desktop:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

✅ **Mobile:**
- iOS Safari 14+
- Android Chrome 90+
- Samsung Internet 14+

✅ **Tablets:**
- iPad Safari
- Android Chrome

### Responsive Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Access from Mobile Devices

```
http://YOUR_SERVER_IP:3000

Example:
http://192.168.1.100:3000
```

---

## 🎯 Quick Reference

### Access Points

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Database:** localhost:5432
- **Health Check:** http://localhost:3001/api/health

### Key Commands

```bash
# Quick setup (recommended)
./setup.sh

# Manual Docker commands
docker-compose up -d              # Start all services
docker-compose up --build         # Build and start with latest changes
docker-compose logs -f            # View all logs
docker-compose logs -f backend    # View backend logs only

# Service management
docker-compose stop               # Stop all services
docker-compose restart backend    # Restart backend only
docker-compose ps                 # Check service status

# Database access
docker exec -it lodger_db psql -U postgres -d lodger_management

# Troubleshooting
docker-compose logs backend | grep ERROR    # Check for errors
docker system df                           # Check disk usage
docker-compose exec backend npm test       # Run backend tests

# Data management
docker-compose down -v           # Full reset (WARNING: Deletes data!)
./setup.sh                       # Re-run setup after reset
```

### Default Ports

- **3000** - Frontend (React)
- **3001** - Backend (Node.js API)
- **5432** - PostgreSQL Database

---

## 🆘 Support & Help

### Getting Help

1. Check this README thoroughly
2. Review the troubleshooting section above
3. Check Docker logs: `docker-compose logs -f`
4. Verify environment variables
5. Ensure all ports are available
6. Test database connectivity
7. Check browser console for errors

### Common Questions

**Q: How do I change the port numbers?**
A: Edit `docker-compose.yml` and update the port mappings. Then restart: `docker-compose down && docker-compose up -d`

**Q: Can I use this for multiple properties?**
A: Yes! Each landlord can manage multiple lodgers and properties. The system supports unlimited tenancies.

**Q: Is the data encrypted?**
A: Passwords are bcrypt hashed. For full encryption, enable PostgreSQL SSL and use HTTPS in production.

**Q: Can I export data?**
A: Yes, use the backup commands to export the entire database as SQL.

---

## 📄 License

This project is proprietary software for property management purposes.

---

## 🙏 Acknowledgments

**Built with:**
- [React](https://reactjs.org/) + [Tailwind CSS](https://tailwindcss.com/) - Frontend
- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) - Backend
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Docker](https://www.docker.com/) - Containerization
- [JWT](https://jwt.io/) - Authentication
- [Lucide React](https://lucide.dev/) - Icons
- [bcrypt](https://www.npmjs.com/package/bcrypt) - Password Hashing

---

**Version:** 1.1.0
**Last Updated:** October 6, 2025
**Status:** ✅ Production Ready

---

**Ready to manage your lodgers professionally!** 🏠🎉

For detailed instructions, refer to the sections above or check the troubleshooting guide.
