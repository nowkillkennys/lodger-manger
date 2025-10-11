#!/bin/bash

# Lodger Management System - GitHub Container Registry Deployment Script
# This script builds and pushes Docker images to GitHub Container Registry

set -e  # Exit on error

# Load deployment configuration if it exists
if [ -f "deploy.env" ]; then
    echo "📋 Loading deployment configuration from deploy.env"
    source deploy.env
fi

echo "🐳 Lodger Management System - Docker Hub Deployment"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GIT_REPO=$(git remote get-url origin | sed -n 's/.*github.com\/\([^\/]*\)\/\([^\/]*\)\.git/\1\/\2/p')
BACKEND_IMAGE="ghcr.io/${GIT_REPO}-backend"
FRONTEND_IMAGE="ghcr.io/${GIT_REPO}-frontend"
VERSION="v1.1.0"
LATEST="latest"
AMD64="amd64"
PLATFORM="linux/amd64"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Backend Image: $BACKEND_IMAGE"
echo "  Frontend Image: $FRONTEND_IMAGE"
echo "  Version: $VERSION"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed${NC}"

# Check if logged into GitHub Container Registry
if ! docker system info | grep -q "ghcr.io"; then
    if [ -n "$GITHUB_USERNAME" ] && [ -n "$GITHUB_TOKEN" ]; then
        echo "🔐 Logging into GitHub Container Registry..."
        echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Logged into GitHub Container Registry${NC}"
        else
            echo -e "${RED}❌ Failed to login to GitHub Container Registry${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  Not logged into GitHub Container Registry${NC}"
        echo "Please set GITHUB_USERNAME and GITHUB_TOKEN environment variables and login first:"
        echo "  export GITHUB_USERNAME='your-github-username'"
        echo "  export GITHUB_TOKEN='your-token'"
        echo "  echo \$GITHUB_TOKEN | docker login ghcr.io -u \$GITHUB_USERNAME --password-stdin"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Logged into GitHub Container Registry${NC}"
fi
echo ""

# Build backend image
echo -e "${BLUE}🔨 Building backend image...${NC}"
docker build --platform $PLATFORM -t $BACKEND_IMAGE:$LATEST ./backend
docker build --platform $PLATFORM -t $BACKEND_IMAGE:$VERSION ./backend
docker build --platform $PLATFORM -t $BACKEND_IMAGE:$AMD64 ./backend
echo -e "${GREEN}✅ Backend image built${NC}"

# Build frontend image
echo -e "${BLUE}🔨 Building frontend image...${NC}"
docker build --platform $PLATFORM -t $FRONTEND_IMAGE:$LATEST ./frontend
docker build --platform $PLATFORM -t $FRONTEND_IMAGE:$VERSION ./frontend
docker build --platform $PLATFORM -t $FRONTEND_IMAGE:$AMD64 ./frontend
echo -e "${GREEN}✅ Frontend image built${NC}"
echo ""

# Push images
echo -e "${BLUE}📤 Pushing images to Docker Hub...${NC}"

echo "Pushing backend images..."
docker push $BACKEND_IMAGE:$LATEST
docker push $BACKEND_IMAGE:$VERSION
docker push $BACKEND_IMAGE:$AMD64

echo "Pushing frontend images..."
docker push $FRONTEND_IMAGE:$LATEST
docker push $FRONTEND_IMAGE:$VERSION
docker push $FRONTEND_IMAGE:$AMD64

echo -e "${GREEN}✅ All images pushed successfully${NC}"
echo ""

# Verify images
echo -e "${BLUE}🔍 Verifying published images...${NC}"
echo "Backend images:"
curl -s "https://ghcr.io/v2/nowkillkennys/lodger-manger-backend/tags/list" | head -5
echo ""
echo "Frontend images:"
curl -s "https://ghcr.io/v2/nowkillkennys/lodger-manger-frontend/tags/list" | head -5
echo ""

# Display usage instructions
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "===================="
echo ""
echo -e "${BLUE}📚 Usage Instructions:${NC}"
echo ""
echo "1. ${YELLOW}For local deployment:${NC}"
echo "   docker-compose up -d"
echo ""
echo "2. ${YELLOW}For production deployment:${NC}"
echo "   # Update your docker-compose.yml to use published images"
echo "   # Or use the Portainer stack configuration from README.md"
echo ""
echo "3. ${YELLOW}For cloud deployment:${NC}"
echo "   # Use the published images in your cloud platform"
echo "   # Images: $BACKEND_IMAGE:$VERSION and $FRONTEND_IMAGE:$VERSION"
echo ""
echo -e "${BLUE}🔗 Image URLs:${NC}"
echo "  Backend:  https://github.com/nowkillkennys/lodger-manger/pkgs/container/lodger-manger-backend"
echo "  Frontend: https://github.com/nowkillkennys/lodger-manger/pkgs/container/lodger-manger-frontend"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"