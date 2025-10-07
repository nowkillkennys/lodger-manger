#!/bin/bash

# Lodger Management System - Quick Setup Script
# This script automates the initial setup process with rooms management,
# initial setup wizard, factory reset, and enhanced lodger filtering

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to production mode
MODE="prod"
COMPOSE_FILE="docker-compose.prod.yml"
HTTP_PORT=${HTTP_PORT:-80}
HTTPS_PORT=${HTTPS_PORT:-443}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dev)
      MODE="dev"
      COMPOSE_FILE="docker-compose.yml"
      shift
      ;;
    --prod)
      MODE="prod"
      COMPOSE_FILE="docker-compose.prod.yml"
      shift
      ;;
    --http_port)
      HTTP_PORT="$2"
      shift 2
      ;;
    --https_port)
      HTTPS_PORT="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --dev              Development mode: builds images locally using docker-compose.yml"
      echo "  --prod             Production mode: pulls images from GitHub Container Registry using docker-compose.prod.yml (default)"
      echo "  --http_port PORT   HTTP port for nginx (default: 80)"
      echo "  --https_port PORT  HTTPS port for nginx (default: 443)"
      echo "  --help, -h         Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0 --dev                              # Development mode on default ports"
      echo "  $0 --prod --http_port 8080            # Production mode on port 8080"
      echo "  $0 --dev --http_port 8080 --https_port 8443  # Dev mode with custom ports"
      exit 0
      ;;
    *)
      echo -e "${RED}❌ Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Export ports for docker-compose
export HTTP_PORT
export HTTPS_PORT

echo "🏠 Lodger Management System - Quick Setup"
echo "=========================================="
echo -e "${YELLOW}Mode: ${MODE}${NC}"
echo -e "${YELLOW}Using: ${COMPOSE_FILE}${NC}"
echo -e "${YELLOW}HTTP Port: ${HTTP_PORT}${NC}"
echo -e "${YELLOW}HTTPS Port: ${HTTPS_PORT}${NC}"
echo ""

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

# Generate secure secrets or use existing ones
echo "📝 Checking environment files..."

# Check if .env exists and load existing secrets
if [ -f .env ]; then
    echo "ℹ️  Found existing .env file, preserving secrets..."
    # Source existing values
    export $(grep -v '^#' .env | xargs)
    DB_PASSWORD=${DB_PASSWORD}
    JWT_SECRET=${JWT_SECRET}
else
    echo "🔐 Generating new secure secrets..."
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 32)

    # Root .env
    cat > .env << EOF
# Database
DB_PASSWORD=${DB_PASSWORD}

# JWT Secret
JWT_SECRET=${JWT_SECRET}
EOF
    echo -e "${GREEN}✅ Created .env file${NC}"
fi

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

echo -e "${GREEN}✅ Environment files configured${NC}"
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
if [ "$MODE" = "dev" ]; then
    echo "Development mode: rebuilding images to pick up source code changes..."
else
    echo "This may take a few minutes on first run..."
fi

if [ "$MODE" = "dev" ]; then
    docker-compose -f ${COMPOSE_FILE} up -d --build
else
    docker-compose -f ${COMPOSE_FILE} up -d
fi

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is ready
until docker-compose -f ${COMPOSE_FILE} exec -T postgres pg_isready -U postgres -p 5433 > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
echo ""

# Initialize database
echo "🗄️  Initializing database..."
echo "Creating database tables..."

# Run database initialization script
docker-compose -f ${COMPOSE_FILE} exec -T backend node scripts/init-database.js

# Run migrations
echo "🔄 Running database migrations..."
docker-compose -f ${COMPOSE_FILE} exec -T backend node scripts/add-landlord-id-to-users-migration.js || true

echo -e "${GREEN}✅ Database tables created${NC}"
echo ""

# Wait for backend to be ready
echo "⏳ Waiting for backend initialization..."
sleep 15

# Check if setup is needed (through nginx)
if [ "$HTTP_PORT" = "80" ]; then
    SETUP_URL="http://localhost/api/setup/status"
else
    SETUP_URL="http://localhost:${HTTP_PORT}/api/setup/status"
fi
SETUP_STATUS=$(curl -s ${SETUP_URL} | grep -o '"needs_setup":[^,]*' | cut -d: -f2 | tr -d '"')

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
docker-compose -f ${COMPOSE_FILE} ps
echo ""

# Display access information
# Build URLs based on port
if [ "$HTTP_PORT" = "80" ]; then
    APP_URL="http://localhost"
else
    APP_URL="http://localhost:${HTTP_PORT}"
fi

echo "✨ Setup Complete!"
echo "===================="
echo ""
echo "🌐 Access your application:"
echo "   Main Application: ${APP_URL} (via nginx proxy)"
echo "   Backend API: ${APP_URL}/api (via nginx proxy)"
echo "   Database: localhost:5433"
echo ""

if [ "$SETUP_STATUS" = "true" ]; then
    echo "🚀 Initial Setup Required:"
    echo "   1. Open ${APP_URL} in your browser"
    echo "   2. Complete the setup wizard:"
    echo "      - Set admin password (email: admin@example.com)"
    echo "      - Create your first landlord account"
    echo "   3. Login with your new landlord credentials"
    echo ""
else
    echo "✅ System Ready:"
    echo "   1. Open ${APP_URL} in your browser"
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
echo "   View logs:     docker-compose -f ${COMPOSE_FILE} logs -f"
echo "   Stop system:   docker-compose -f ${COMPOSE_FILE} stop"
echo "   Restart:       docker-compose -f ${COMPOSE_FILE} restart"
echo "   Full reset:    docker-compose -f ${COMPOSE_FILE} down -v"
echo ""
echo "🔧 Troubleshooting:"
echo "   If frontend shows connection error:"
echo "     - Wait 30 seconds for backend to fully start"
echo "     - Check backend logs: docker-compose -f ${COMPOSE_FILE} logs backend"
echo ""
echo "   If database issues:"
echo "     - Check PostgreSQL: docker-compose -f ${COMPOSE_FILE} logs postgres"
echo "     - Restart: docker-compose -f ${COMPOSE_FILE} restart postgres"
echo ""
if [ "$MODE" = "prod" ]; then
  echo "   For Portainer deployment:"
  echo "     - Use docker-compose.prod.yml"
  echo "     - Images pulled from GitHub Container Registry"
  echo "     - No volume mounts required - config is embedded"
  echo "     - Database accessible on port 5433"
else
  echo "   Development mode active:"
  echo "     - Images built locally from Dockerfiles"
  echo "     - For production, run: ./setup.sh --prod"
fi
echo ""
echo -e "${GREEN}🎉 Happy lodger managing!${NC}"
