#!/bin/bash

# Local Development Environment Setup Script
# This script sets up your local development environment for the Junction 2025 project

set -e  # Exit on error

echo "🚀 Setting up local development environment for Junction 2025..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js >= 22.13.0${NC}"
    exit 1
fi

NODE_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
NODE_MINOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f2)

if [ "$NODE_MAJOR" -lt 22 ] || ([ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 13 ]); then
    echo -e "${RED}❌ Node.js version $(node -v) is too old. Please install Node.js >= 22.13.0${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  pnpm is not installed. Installing pnpm...${NC}"
    npm install -g pnpm
fi

echo -e "${GREEN}✅ pnpm $(pnpm -v)${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker is not installed. You'll need Docker to run PostgreSQL.${NC}"
    echo -e "${YELLOW}   You can install Docker from: https://www.docker.com/get-started${NC}"
    echo ""
    read -p "Continue without Docker? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    DOCKER_AVAILABLE=false
else
    echo -e "${GREEN}✅ Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1)${NC}"
    DOCKER_AVAILABLE=true
fi

echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🔧 Setting up environment variables..."

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file already exists.${NC}"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        CREATE_ENV=true
    else
        CREATE_ENV=false
    fi
else
    CREATE_ENV=true
fi

if [ "$CREATE_ENV" = true ]; then
    echo "Creating .env file..."
    
    # Get API keys from user
    echo ""
    echo "Please provide your API keys (you can get them later and update .env):"
    echo ""
    
    read -p "Google Gemini API Key (required): " GEMINI_KEY
    read -p "ElevenLabs API Key (optional, press Enter to skip): " ELEVENLABS_KEY
    
    # Create .env file
    cat > .env << EOF
# API Keys
GOOGLE_GENERATIVE_AI_API_KEY=${GEMINI_KEY:-your_gemini_api_key_here}
ELEVENLABS_API_KEY=${ELEVENLABS_KEY:-}

# Server Configuration
PORT=4111
NODE_ENV=development

# Database Configuration (for Docker)
POSTGRES_DB=junction2025
POSTGRES_USER=junction_user
POSTGRES_PASSWORD=junction_dev_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://junction_user:junction_dev_password@localhost:5432/junction2025

# Optional: OpenAI API Key for knowledge base embeddings
# OPENAI_API_KEY=your_openai_key_here
EOF
    
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${YELLOW}⚠️  Keeping existing .env file${NC}"
fi

echo ""
echo "🗄️  Setting up PostgreSQL database..."

if [ "$DOCKER_AVAILABLE" = true ]; then
    # Check if docker-compose is available
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        echo "Starting PostgreSQL with Docker..."
        
        # Check if containers are already running
        if docker compose ps | grep -q "postgres.*Up"; then
            echo -e "${YELLOW}⚠️  PostgreSQL container is already running${NC}"
        else
            docker compose up -d postgres
            echo "Waiting for PostgreSQL to be ready..."
            sleep 5
            echo -e "${GREEN}✅ PostgreSQL is running${NC}"
        fi
    else
        echo -e "${RED}❌ docker-compose is not available${NC}"
        DOCKER_AVAILABLE=false
    fi
else
    echo -e "${YELLOW}⚠️  Skipping Docker setup. Make sure PostgreSQL is running on localhost:5432${NC}"
fi

echo ""
echo "📚 Knowledge Base Setup"
echo "The knowledge base needs to be initialized for the RAG system to work."
read -p "Do you want to initialize the knowledge base now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f .env ] && grep -q "OPENAI_API_KEY" .env && ! grep -q "OPENAI_API_KEY=$" .env && ! grep -q "OPENAI_API_KEY=your_openai" .env; then
        echo "Initializing knowledge base..."
        pnpm init:knowledge-base
        echo -e "${GREEN}✅ Knowledge base initialized${NC}"
    else
        echo -e "${YELLOW}⚠️  OPENAI_API_KEY not found in .env. Skipping knowledge base initialization.${NC}"
        echo -e "${YELLOW}   You can run 'pnpm init:knowledge-base' later after adding your OpenAI API key.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping knowledge base initialization${NC}"
    echo -e "${YELLOW}   You can run 'pnpm init:knowledge-base' later${NC}"
fi

echo ""
echo -e "${GREEN}✨ Setup complete!${NC}"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Start the development servers:"
echo "   ${GREEN}pnpm dev${NC}"
echo "   This will start:"
echo "   - Backend API on http://localhost:4111"
echo "   - Frontend on http://localhost:3000"
echo ""
echo "2. Or start them separately:"
echo "   ${GREEN}pnpm dev:api${NC}     # Backend only"
echo "   ${GREEN}pnpm dev:frontend${NC} # Frontend only"
echo ""
echo "3. Access the application:"
echo "   Open http://localhost:3000 in your browser"
echo ""
echo "4. Other useful commands:"
echo "   ${GREEN}pnpm play${NC}              # Interactive CLI game"
echo "   ${GREEN}pnpm test${NC}              # Run tests"
echo "   ${GREEN}pnpm check${NC}             # TypeScript type checking"
echo "   ${GREEN}docker compose ps${NC}      # Check database status"
echo ""
echo "📚 For more information, see README.md"
echo ""

