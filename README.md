# 🏠 Lodger Management System

A complete, production-ready web application for managing lodger tenancies with 28-day payment cycles, PDF agreement generation, and comprehensive landlord/tenant portals.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![React](https://img.shields.io/badge/react-18.2.0-blue)

---

## ✨ Features

### For Landlords
- ✅ Complete dashboard with analytics and statistics
- ✅ 4-step onboarding wizard for new lodgers
- ✅ 28-day payment cycle tracking (not calendar months)
- ✅ Payment confirmation system
- ✅ Multiple notice types (termination, breach, extension)
- ✅ Maintenance request management
- ✅ Damage report creation with photos
- ✅ Rent-a-Room tax allowance tracking (£7,500)
- ✅ PDF agreement generation
- ✅ Backup and restore functionality

### For Lodgers
- ✅ Simple dashboard with payment overview
- ✅ Payment submission with balance tracking
- ✅ View and download signed agreement
- ✅ Create maintenance requests with photos
- ✅ Payment history and upcoming dates
- ✅ Calendar with reminders

### Payment System
- ✅ 28-day payment cycles (365/28 = 13 payments per year)
- ✅ Balance formula: **D = C - B** (Balance = Paid - Due)
- ✅ Automatic credit rollover
- ✅ Pro-rata calculations on termination
- ✅ Initial payment (current + advance period)

### Technical Features
- ✅ RESTful API with 40+ endpoints
- ✅ JWT authentication & authorization
- ✅ PostgreSQL database with 20+ tables
- ✅ Automated backups
- ✅ Rate limiting & security middleware
- ✅ File upload handling
- ✅ Audit logging
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Docker containerization

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites

- Docker Desktop installed and running
- Git (optional, for cloning)

### Option 1: Automated Setup (Recommended)

```bash
# 1. Download or clone the project
git clone <your-repo-url>
cd lodger-manager

# 2. Make setup script executable
chmod +x setup.sh

# 3. Run automated setup
./setup.sh

# 4. Access the application
# Open http://localhost:3000 in your browser
```

The setup script will:
- ✅ Check prerequisites
- ✅ Generate secure passwords
- ✅ Create environment files
- ✅ Start Docker containers
- ✅ Initialize database
- ✅ Create admin user

### Option 2: Manual Setup

```bash
# 1. Create project structure
mkdir -p lodger-manager/{backend,frontend,database}
cd lodger-manager

# 2. Copy all files from artifacts

# 3. Generate secrets
openssl rand -base64 32  # For DB_PASSWORD
openssl rand -base64 32  # For JWT_SECRET

# 4. Create .env files (see DEPLOYMENT_GUIDE.md)

# 5. Start services
docker-compose up -d

# 6. Wait for PostgreSQL
sleep 10

# 7. Create admin user (see guide)

# 8. Access http://localhost:3000
```

---

## 📁 Project Structure

```
lodger-manager/
├── docker-compose.yml          # Container orchestration
├── setup.sh                    # Automated setup script
├── README.md                   # This file
├── .env                        # Root environment variables
│
├── backend/                    # Node.js/Express API
│   ├── package.json
│   ├── Dockerfile
│   ├── .env
│   ├── server.js              # Main API server
│   ├── paymentCalculator.js   # 28-day cycle logic
│   ├── pdfGenerator.js        # PDF generation
│   └── scripts/
│       └── init-database.js   # DB initialization
│
├── frontend/                   # React application
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .env
│   ├── tailwind.config.js
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js
│       ├── index.css
│       ├── App.jsx            # Main app component
│       ├── components/        # React components
│       │   ├── Login.jsx
│       │   ├── LandlordDashboard.jsx
│       │   ├── LodgerDashboard.jsx
│       │   └── OnboardingWizard.jsx
│       └── utils/
│           └── api.js         # API utilities
│
└── database/
    └── schema.sql             # PostgreSQL schema
```

---

## 🗄️ Database Schema

The system uses **PostgreSQL 15+** with 20+ tables:

### Core Tables
- `users` - Landlords, lodgers, admins
- `properties` - Property details
- `tenancies` - Tenancy agreements
- `payment_schedule` - 28-day payment tracking
- `payment_transactions` - Detailed payment log

### Additional Tables
- `landlord_payment_details` - Bank account info
- `tax_year_summary` - Rent-a-Room tracking
- `notices` - Termination & extensions
- `maintenance_requests` - Repair requests
- `maintenance_photos` - Request images
- `damage_reports` - Landlord damage reports
- `damage_photos` - Damage images
- `documents` - File storage
- `notifications` - In-app notifications
- `calendar_events` - Reminders
- `system_settings` - Configuration
- `audit_log` - Activity tracking

See `database/schema.sql` for complete details.

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register landlord
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/reset-password` - Password reset

### Tenancies
- `GET /api/tenancies` - List all (landlord)
- `POST /api/tenancies/create` - Create tenancy
- `GET /api/tenancies/:id` - Get details
- `PUT /api/tenancies/:id` - Update tenancy
- `GET /api/tenancies/:id/agreement-pdf` - Download agreement
- `GET /api/tenancies/my-tenancy` - Get lodger's tenancy

### Payments
- `GET /api/payments/schedule/:tenancyId` - Payment schedule
- `POST /api/payments/submit` - Submit payment
- `POST /api/payments/confirm/:id` - Confirm payment
- `GET /api/payments/history/:tenancyId` - Payment history
- `GET /api/payments/my-payments` - Lodger payments

### Maintenance
- `GET /api/maintenance` - List requests
- `POST /api/maintenance` - Create request
- `PUT /api/maintenance/:id` - Update status
- `POST /api/maintenance/:id/photos` - Upload photos

### Notices
- `POST /api/notices/termination` - Give notice
- `POST /api/notices/extension` - Offer extension
- `GET /api/notices/:id/pdf` - Download notice

### Dashboard
- `GET /api/dashboard/landlord` - Landlord stats
- `GET /api/dashboard/lodger` - Lodger overview

### Admin
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `POST /api/backup/create` - Create backup
- `POST /api/backup/restore` - Restore backup

---

## 💰 Payment Cycle Logic

### How 28-Day Cycles Work

```
Traditional Calendar Months:
Jan: 31 days, Feb: 28/29 days, Mar: 31 days
= Inconsistent payment dates

28-Day Cycles:
Every period is exactly 28 days
= Consistent, fair payment schedule
```

### Example Schedule

```
Start Date: February 7, 2025
Monthly Rent: £650

Payment #1: Feb 7  - £1,300 (current + advance)
Payment #2: Mar 7  - £650   (28 days later)
Payment #3: Apr 4  - £650   (28 days later)
Payment #4: May 2  - £650   (28 days later)
Payment #5: May 30 - £650   (28 days later)
...continues every 28 days
```

### Balance Formula

**D = C - B**

- **D** = Balance (positive = credit, negative = owed)
- **C** = Rent Paid
- **B** = Rent Due

Example:
```
Rent Due (B): £650
Rent Paid (C): £700
Balance (D): +£50 (credit rolls over to next payment)

Next Payment:
Rent Due: £650
Less Credit: -£50
Amount Owed: £600
```

---

## 🔐 Security Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Bcrypt Password Hashing** - 10 rounds
- ✅ **Role-Based Access Control** - Landlord/Lodger/Admin
- ✅ **Rate Limiting** - 100 requests per 15 minutes
- ✅ **Helmet.js** - Security headers
- ✅ **CORS Protection** - Configured origins
- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **File Upload Validation** - Type and size limits
- ✅ **Audit Logging** - All actions tracked
- ✅ **Session Timeout** - 24-hour JWT expiry

---

## 📱 User Interface

### Landlord Dashboard Tabs

1. **Overview**
   - Active tenancies count
   - Monthly income summary
   - Upcoming payments
   - Recent notifications

2. **Tenancies**
   - List all lodgers
   - Create new tenancy (4-step wizard)
   - View agreement details
   - Download PDFs

3. **Payments**
   - Payment schedule table
   - Confirm lodger submissions
   - Payment history
   - Balance tracking

4. **Maintenance**
   - View all requests
   - Update status
   - Add notes
   - Track completion

5. **Calendar**
   - Payment due dates
   - Notice deadlines
   - Custom reminders

6. **Settings**
   - Bank account details
   - Tax year tracking
   - Backup/restore
   - User management

### Lodger Dashboard Tabs

1. **Overview**
   - Current balance (credit/owed)
   - Next payment date
   - Quick actions

2. **Payments**
   - Payment history
   - Submit payment notification
   - Download receipts

3. **Agreement**
   - View tenancy details
   - Download signed PDF
   - Photo ID on file

4. **Maintenance**
   - Create requests
   - Upload photos
   - Track status

---

## 🛠️ Development

### Local Development (Without Docker)

```bash
# Terminal 1 - PostgreSQL
docker run --name lodger-postgres \
  -e POSTGRES_DB=lodger_management \
  -e POSTGRES_USER=lodger_admin \
  -e POSTGRES_PASSWORD=yourpassword \
  -p 5432:5432 \
  -d postgres:15-alpine

# Terminal 2 - Backend
cd backend
npm install
npm run dev

# Terminal 3 - Frontend
cd frontend
npm install
npm start
```

### Environment Variables

**Backend (.env)**
```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lodger_management
DB_USER=lodger_admin
DB_PASSWORD=yourpassword
JWT_SECRET=your-super-secret-key
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env)**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🐳 Docker Commands

### Basic Operations

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend

# Check status
docker-compose ps

# Restart services
docker-compose restart
docker-compose restart backend

# Stop services
docker-compose stop

# Remove containers (keeps data)
docker-compose down

# Remove everything including data
docker-compose down -v
```

### Database Operations

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U lodger_admin lodger_management

# Backup database
docker-compose exec postgres pg_dump -U lodger_admin lodger_management > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U lodger_admin lodger_management

# View database logs
docker-compose logs postgres
```

---

## 🧪 Testing

### Test User Creation

```bash
# Create test landlord
docker-compose exec -T postgres psql -U lodger_admin lodger_management << EOF
INSERT INTO users (email, password_hash, full_name, user_type)
VALUES ('landlord@test.com', '\$2b\$10\$YourHashHere', 'Test Landlord', 'landlord');
EOF

# Create test lodger
docker-compose exec -T postgres psql -U lodger_admin lodger_management << EOF
INSERT INTO users (email, password_hash, full_name, user_type)
VALUES ('lodger@test.com', '\$2b\$10\$YourHashHere', 'Test Lodger', 'lodger');
EOF
```

### Test Workflow

1. ✅ Login as landlord
2. ✅ Create new tenancy via wizard
3. ✅ Verify payment schedule generated
4. ✅ Login as lodger
5. ✅ Submit payment
6. ✅ Login as landlord, confirm payment
7. ✅ Create maintenance request as lodger
8. ✅ Respond to request as landlord

---

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Check API health
curl http://localhost:5000/api/health

# Check database connection
docker-compose exec postgres pg_isready -U lodger_admin
```

### Regular Maintenance

```bash
# Weekly backup
docker-compose exec postgres pg_dump -U lodger_admin lodger_management > backup_$(date +%Y%m%d).sql

# Monthly vacuum (optimize database)
docker-compose exec postgres psql -U lodger_admin lodger_management -c "VACUUM ANALYZE;"

# Check disk usage
docker system df
```

### Logs

```bash
# View all logs
docker-compose logs --tail=100 -f

# Search logs
docker-compose logs backend | grep ERROR

# Export logs
docker-compose logs > application.log
```

---

## 🚨 Troubleshooting

### Frontend Can't Connect to Backend

```bash
# 1. Check backend is running
docker-compose ps backend

# 2. Check backend logs
docker-compose logs backend

# 3. Verify environment variables
cat frontend/.env

# 4. Restart backend
docker-compose restart backend
```

### Database Connection Failed

```bash
# 1. Check PostgreSQL is running
docker-compose ps postgres

# 2. Check database logs
docker-compose logs postgres

# 3. Test connection
docker-compose exec postgres psql -U lodger_admin lodger_management

# 4. Restart PostgreSQL
docker-compose restart postgres
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000
# or
netstat -ano | findstr :3000  # Windows

# Kill process or change port in docker-compose.yml
```

### Reset Everything

```bash
# Complete reset (WARNING: Deletes all data)
docker-compose down -v
rm -rf backend/uploads backend/backups
docker-compose up -d
```

---

## 📚 Additional Documentation

- **[COMPLETE_DEPLOYMENT_GUIDE.md](COMPLETE_DEPLOYMENT_GUIDE.md)** - Detailed deployment instructions
- **[EXTRACT_COMPONENTS_GUIDE.md](EXTRACT_COMPONENTS_GUIDE.md)** - Converting demo to production
- **[Complete System Summary.md](Complete System Summary.md)** - Full feature list
- **[database/schema.sql](database/schema.sql)** - Complete database schema

---

## 🤝 Support

### Common Issues

1. **Login fails** - Check JWT_SECRET matches in backend/.env
2. **PDF won't generate** - Ensure PDFKit is installed
3. **File upload fails** - Check uploads directory permissions
4. **Payment calculation wrong** - Verify paymentCalculator.js logic

### Getting Help

1. Check the troubleshooting section above
2. Review Docker logs: `docker-compose logs -f`
3. Verify environment variables are set correctly
4. Ensure all ports are available (3000, 5000, 5432)

---

## 📈 Future Enhancements

Possible additions:
- Email notifications (SMTP)
- SMS reminders (Twilio)
- Mobile app (React Native)
- Automated rent collection (Stripe)
- Tenant referencing
- Inventory management
- Multi-language support
- Advanced analytics
- Accounting software integration

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- Built with React, Node.js, Express, PostgreSQL
- UI components from Lucide React
- Styled with Tailwind CSS
- PDF generation with PDFKit
- Containerized with Docker

---

## 📞 Quick Reference

**Access Points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: localhost:5432

**Default Credentials:**
- Email: admin@example.com
- Password: (set during setup)

**Key Commands:**
```bash
docker-compose up -d        # Start
docker-compose logs -f      # View logs
docker-compose stop         # Stop
docker-compose down -v      # Reset
```

---

**Ready to manage your lodgers professionally!** 🎉

For questions or issues, check the documentation or troubleshooting section above.# lodger-manager
# lodger-manger
