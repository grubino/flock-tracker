#!/bin/bash
set -e

echo "🚀 Generating API code from OpenAPI spec..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Generate OpenAPI spec from FastAPI app
echo -e "${BLUE}📋 Generating OpenAPI spec from FastAPI app...${NC}"
cd backend
python -c "from app.main import app; import json; print(json.dumps(app.openapi(), indent=2))" > openapi.json
echo -e "${GREEN}✅ OpenAPI spec generated at backend/openapi.json${NC}"

# Step 2: Generate backend models with fastapi-codegen
echo -e "${BLUE}🐍 Generating backend models...${NC}"
fastapi-codegen --input openapi.json --output generated/
echo -e "${GREEN}✅ Backend models generated in backend/generated/${NC}"

# Step 3: Copy OpenAPI spec to frontend
echo -e "${BLUE}📁 Copying OpenAPI spec to frontend...${NC}"
cp openapi.json ../frontend/
cd ../frontend

# Step 4: Generate TypeScript types
echo -e "${BLUE}📝 Generating TypeScript types...${NC}"
npx openapi-typescript openapi.json --output src/generated/types.ts
echo -e "${GREEN}✅ TypeScript types generated at frontend/src/generated/types.ts${NC}"

# Step 5: Generate React Query hooks with orval
echo -e "${BLUE}⚛️  Generating React Query hooks...${NC}"
npx orval
echo -e "${GREEN}✅ React Query hooks generated in frontend/src/generated/${NC}"

echo -e "${GREEN}🎉 All API code generated successfully!${NC}"
echo ""
echo "Generated files:"
echo "  📦 Backend: backend/generated/main.py, backend/generated/models.py"
echo "  📦 Frontend: frontend/src/generated/types.ts, frontend/src/generated/api.ts"
echo "  📦 Frontend: frontend/src/generated/models/ (individual model files)"