#!/bin/bash

# Lodger Management System - Quick Setup Script
# This script automates the initial setup process with rooms management,
# initial setup wizard, factory reset, and enhanced lodger filtering

set -e  # Exit on error

echo "🏠 Lodger Management System - Quick Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Generate secure secrets
echo "🔐 Generating secure secrets..."

DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 32)

echo -e "${GREEN}✅ Secrets generated${NC}"
echo ""

# Create environment files
echo "📝 Creating environment files..."

# Root .env
cat > .env << EOF
# Database
DB_PASSWORD=${DB_PASSWORD}

# JWT Secret
JWT_SECRET=${JWT_SECRET}
EOF

# Backend .env (for production)
mkdir -p backend
cat > backend/.env << EOF
NODE_ENV=production
PORT=3003
DB_HOST=postgres
DB_PORT=5433
DB_NAME=lodger_management
DB_USER=postgres
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
FRONTEND_URL=http://localhost:3000
EOF

# Frontend .env
mkdir -p frontend
cat > frontend/.env << EOF
REACT_APP_API_URL=
EOF

echo -e "${GREEN}✅ Environment files created${NC}"
echo ""

# Create necessary directories
echo "📁 Creating directory structure..."
mkdir -p backend/scripts
mkdir -p backend/uploads
mkdir -p backend/backups
mkdir -p frontend/src/components
mkdir -p frontend/src/utils
mkdir -p frontend/public
mkdir -p database

echo -e "${GREEN}✅ Directories created${NC}"
echo ""

# Start Docker containers (production setup)
echo "🐳 Starting Docker containers..."
echo "This may take a few minutes on first run..."

docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is ready
until docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U postgres -p 5433 > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
echo ""

# Initialize database
echo "🗄️  Initializing database..."
echo "Creating database tables..."

# Run database initialization script
docker-compose -f docker-compose.prod.yml exec -T backend node scripts/init-database.js

echo -e "${GREEN}✅ Database tables created${NC}"
echo ""

# Wait for backend to initialize and create admin account
echo "👤 Initializing admin account..."
echo "The system will automatically create an admin account on first run"
echo "Admin email: admin@example.com"
echo "Admin password: admin123"
echo ""

# Wait for backend to be ready
echo "⏳ Waiting for backend initialization..."
sleep 15

# Check if setup is needed (through nginx)
SETUP_STATUS=$(curl -s http://localhost/api/setup/status | grep -o '"needs_setup":[^,]*' | cut -d: -f2 | tr -d '"')

if [ "$SETUP_STATUS" = "true" ]; then
    echo -e "${YELLOW}ℹ️  Initial setup required${NC}"
    echo "The application will guide you through:"
    echo "  1. Setting admin password"
    echo "  2. Creating your first landlord account"
    echo ""
else
    echo -e "${GREEN}✅ System already configured${NC}"
    echo "Admin account exists and system is ready"
    echo ""
fi

# Display status
echo "📊 System Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""

# Display access information
echo "✨ Setup Complete!"
echo "===================="
echo ""
echo "🌐 Access your application:"
echo "   Main Application: http://localhost (via nginx proxy)"
echo "   Backend API: http://localhost/api (via nginx proxy)"
echo "   Database: localhost:5433"
echo ""

if [ "$SETUP_STATUS" = "true" ]; then
    echo "🚀 Initial Setup Required:"
    echo "   1. Open http://localhost in your browser"
    echo "   2. Complete the setup wizard:"
    echo "      - Set admin password"
    echo "      - Create your first landlord account"
    echo "   3. Login with your new landlord credentials"
    echo ""
    echo "🔐 Default Admin Account:"
    echo "   Email: admin@example.com"
    echo "   Password: admin123"
    echo "   ⚠️  Please change the default password after first login"
    echo ""
else
    echo "✅ System Ready:"
    echo "   1. Open http://localhost in your browser"
    echo "   2. Login with your existing credentials"
    echo ""
fi

echo "📝 Key Features Available:"
echo "   🏠 Rooms Management: Configure property rooms in your profile"
echo "   📊 Lodger Filtering: Filter lodgers by tenancy status"
echo "   🔄 Factory Reset: Complete system reset (admin only)"
echo "   📱 Mobile Responsive: Works on all devices"
echo ""

echo "💾 Backup & Restore:"
echo "   - Backup your data: Settings tab > Download Backup"
echo "   - Restore profile: Settings tab > Upload Backup File"
echo "   - Factory Reset (Admin): Settings tab > Danger Zone"
echo ""
echo "📚 Useful Commands:"
echo "   View logs:     docker-compose -f docker-compose.prod.yml logs -f"
echo "   Stop system:   docker-compose -f docker-compose.prod.yml stop"
echo "   Restart:       docker-compose -f docker-compose.prod.yml restart"
echo "   Full reset:    docker-compose -f docker-compose.prod.yml down -v"
echo ""
echo "🔧 Troubleshooting:"
echo "   If frontend shows connection error:"
echo "     - Wait 30 seconds for backend to fully start"
echo "     - Check backend logs: docker-compose -f docker-compose.prod.yml logs backend"
echo ""
echo "   If database issues:"
echo "     - Check PostgreSQL: docker-compose -f docker-compose.prod.yml logs postgres"
echo "     - Restart: docker-compose -f docker-compose.prod.yml restart postgres"
echo ""
echo "   For Portainer deployment:"
echo "     - Use docker-compose.prod.yml (not docker-compose.yml)"
echo "     - No volume mounts required - config is embedded"
echo "     - Database accessible on port 5433"
echo ""
echo -e "${GREEN}🎉 Happy lodger managing!${NC}"
