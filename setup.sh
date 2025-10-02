#!/bin/bash

# Lodger Management System - Quick Setup Script
# This script automates the initial setup process

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

# Backend .env
mkdir -p backend
cat > backend/.env << EOF
NODE_ENV=production
PORT=5000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=lodger_management
DB_USER=lodger_admin
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
FRONTEND_URL=http://localhost:3000
EOF

# Frontend .env
mkdir -p frontend
cat > frontend/.env << EOF
REACT_APP_API_URL=http://localhost:5000/api
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

# Start Docker containers
echo "🐳 Starting Docker containers..."
echo "This may take a few minutes on first run..."

docker-compose up -d

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is ready
until docker-compose exec -T postgres pg_isready -U lodger_admin > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
echo ""

# Initialize database
echo "🗄️  Initializing database..."
echo "Database schema will be automatically loaded on first start"
echo ""

# Create admin user
echo "👤 Creating admin user..."
echo "Enter admin email (default: admin@example.com):"
read -r ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}

echo "Enter admin password (default: admin123):"
read -rs ADMIN_PASSWORD
ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin123}
echo ""

# Hash password and create user
HASHED_PASSWORD=$(docker-compose exec -T backend node -e "console.log(require('bcrypt').hashSync('${ADMIN_PASSWORD}', 10))")

docker-compose exec -T postgres psql -U lodger_admin lodger_management << EOF
INSERT INTO users (email, password_hash, full_name, user_type)
VALUES ('${ADMIN_EMAIL}', '${HASHED_PASSWORD}', 'System Administrator', 'landlord')
ON CONFLICT (email) DO NOTHING;
EOF

echo -e "${GREEN}✅ Admin user created${NC}"
echo ""

# Display status
echo "📊 System Status:"
docker-compose ps
echo ""

# Display access information
echo "✨ Setup Complete!"
echo "===================="
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo ""
echo "🔐 Admin Credentials:"
echo "   Email: ${ADMIN_EMAIL}"
echo "   Password: ${ADMIN_PASSWORD}"
echo ""
echo "📝 Next Steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Login with your admin credentials"
echo "   3. Click 'New Tenancy' to create your first lodger"
echo ""
echo "📚 Useful Commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop system:   docker-compose stop"
echo "   Restart:       docker-compose restart"
echo "   Full reset:    docker-compose down -v"
echo ""
echo "🔧 Troubleshooting:"
echo "   If frontend shows connection error:"
echo "     - Wait 30 seconds for backend to fully start"
echo "     - Check backend logs: docker-compose logs backend"
echo ""
echo "   If database issues:"
echo "     - Check PostgreSQL: docker-compose logs postgres"
echo "     - Restart: docker-compose restart postgres"
echo ""
echo -e "${GREEN}🎉 Happy lodger managing!${NC}"