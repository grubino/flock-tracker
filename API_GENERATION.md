# API Code Generation Setup

This project uses OpenAPI specifications to generate type-safe API clients for both frontend and backend from a single source of truth.

## Tools Used

- **Backend**: `fastapi-code-generator` - Generates FastAPI models and routes
- **Frontend**: `openapi-typescript` + `orval` - Generates TypeScript types and React Query hooks

## Project Structure

```
flock-tracker/
├── backend/
│   ├── openapi.json               # Generated OpenAPI spec
│   ├── generated/                 # Generated backend code
│   │   ├── main.py               # Generated FastAPI routes
│   │   └── models.py             # Generated Pydantic models
│   └── requirements.txt          # Includes fastapi-code-generator
├── frontend/
│   ├── openapi.json              # Copy of OpenAPI spec
│   ├── orval.config.ts           # Orval configuration
│   ├── src/
│   │   ├── generated/            # Generated frontend code
│   │   │   ├── types.ts          # TypeScript types
│   │   │   ├── api.ts            # React Query hooks
│   │   │   └── models/           # Individual model files
│   │   └── services/
│   │       └── api-client.ts     # Axios client configuration
│   └── package.json              # Includes generation scripts
└── generate-api.sh               # Main generation script
```

## Usage

### Quick Start

Run the main generation script to regenerate all API code:

```bash
./generate-api.sh
```

### Step by Step

1. **Generate OpenAPI spec** (from backend directory):
```bash
cd backend
python -c "from app.main import app; import json; print(json.dumps(app.openapi(), indent=2))" > openapi.json
```

2. **Generate backend code**:
```bash
cd backend
fastapi-codegen --input openapi.json --output generated/
```

3. **Generate frontend code**:
```bash
cd frontend
npm run generate
# Or separately:
npm run generate:types  # TypeScript types only
npm run generate:api    # React Query hooks only
```

## Generated Code Usage

### Frontend

The generated code provides type-safe React Query hooks:

```typescript
import { useGetAllAnimals, useCreateAnimal } from './generated/api';
import { Animal, AnimalCreateRequest } from './generated/types';

// Use in React components
function AnimalsList() {
  const { data: animals, isLoading } = useGetAllAnimals();
  const createAnimalMutation = useCreateAnimal();

  const handleCreate = (animal: AnimalCreateRequest) => {
    createAnimalMutation.mutate(animal);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {animals?.map(animal => (
        <div key={animal.id}>{animal.name}</div>
      ))}
    </div>
  );
}
```

### Backend

The generated backend code includes models and route handlers that you can use as reference or integrate into your existing FastAPI app.

## Configuration

### Frontend (orval.config.ts)

```typescript
import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: './openapi.json',
    output: {
      mode: 'split',
      target: './src/generated/api.ts',
      schemas: './src/generated/models',
      client: 'react-query',
      mock: false,
      prettier: true,
      override: {
        mutator: {
          path: './src/services/api-client.ts',
          name: 'apiClient',
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
  },
});
```

### API Client (api-client.ts)

```typescript
import axios, { AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Custom mutator for orval
export const apiClient = <T>(config: AxiosRequestConfig): Promise<T> => {
  return axiosInstance(config).then((response) => response.data);
};
```

## Development Workflow

1. **Modify your FastAPI app** (routes, models, etc.)
2. **Regenerate API code**: `./generate-api.sh`
3. **Update frontend components** to use new types/hooks
4. **Type safety across the stack!** 🎉

## Benefits

- ✅ **Single source of truth** - API contract defined once
- ✅ **Type safety** - Full TypeScript support across frontend/backend
- ✅ **Auto-completion** - IDE support for all API calls
- ✅ **Automatic React Query hooks** - Built-in caching, loading states
- ✅ **Error handling** - Type-safe error responses
- ✅ **Development speed** - No manual API client code
- ✅ **Consistency** - Frontend always matches backend API

## Troubleshooting

### Common Issues

1. **"apiClient exported function" error**: Make sure `api-client.ts` exports the `apiClient` function correctly
2. **Import.meta warnings**: These are warnings only and don't affect functionality
3. **Type errors after regeneration**: Restart your TypeScript server in your IDE

### Regeneration

After making changes to your FastAPI app, always regenerate:
```bash
./generate-api.sh
```

This ensures your frontend types stay in sync with your backend API.