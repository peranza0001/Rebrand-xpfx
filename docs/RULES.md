# XpressPro FX — Development Rules & Conventions

**Version**: 1.0.0  
**Last Updated**: 2026-08-13  
**Audience**: All developers

---

## ABSOLUTE RULES (MUST FOLLOW)

### Business Logic (CRITICAL)
- **🚫 NEVER** change core business logic without explicit approval
- **🚫 NEVER** modify admin approval workflows
- **🚫 NEVER** change wallet encryption or OTP logic
- **🚫 NEVER** alter KYC/compliance requirements
- **✅ ONLY** fix infrastructure, build, deployment, and dependency issues
- **✅ ONLY** add new features that don't break existing logic

### Repository Structure
- **Use npm workspaces** (NOT pnpm, NOT yarn)
- **Remove pnpm-lock.yaml** if present (breaks Railway)
- **Keep structure**: `artifacts/` and `lib/` at root level
- **Don't number folders**: NO `/app-1/`, `/api-v2/`, etc.

### Secrets & Environment
- **🚫 NEVER** commit `.env` files to git
- **🚫 NEVER** log secrets or sensitive data
- **🚫 NEVER** hardcode API keys
- **✅ Use GitHub Secrets** for CI/CD
- **✅ Use platform secrets** (Railway, Render, Vault) for runtime
- **✅ Use environment variable templates** (`.env.example`)

### Database & Migrations
- **All schema changes** via Prisma migrations
- **Version control migrations** in `prisma/migrations/`
- **Never delete migration files**
- **Always test migrations** locally before deploying
- **Command**: `DATABASE_URL="..." npx prisma migrate dev`

### Dependencies
- **Node >=20.0.0** (strict requirement)
- **npm >=10.0.0** (strict requirement)
- **TypeScript strict mode** (non-negotiable)
- **No peer dependency warnings** after install
- **Run `npm audit --audit-level=high`** in CI/CD

### Code Quality
- **All code must pass**:
  - TypeScript compilation (`tsc --noEmit`)
  - ESLint (`eslint . --config eslint.config.cjs`)
  - Tests (`npm test`)
  - Production checks (`npm run predeploy`)
- **No console.log in production code** (use logger.info/warn/error)
- **No unhandled promise rejections**
- **All async/await wrapped in try/catch**

### Security
- **Helmet must be enabled** (security headers)
- **CORS must be configured** (whitelist origins in prod)
- **CSRF protection required** on all state-changing routes
- **Rate limiting on auth endpoints** (5 req/15 min per IP)
- **Password hashing** via bcryptjs (salt rounds: 12)
- **Session secrets** must be 32+ characters (prod)
- **Wallet encryption** via AES-256 (not optional)

### API Design
- **All routes must validate input** via Zod schemas
- **Return consistent error format**:
  ```json
  {
    "error": "Human-readable message",
    "code": "ERROR_CODE",
    "details": {}
  }
  ```
- **HTTP status codes must be correct**:
  - 200: Success
  - 201: Created
  - 400: Bad request (validation)
  - 401: Unauthorized (no session)
  - 403: Forbidden (insufficient permission)
  - 404: Not found
  - 409: Conflict (duplicate email, etc.)
  - 429: Rate limited
  - 500: Server error
  - 503: Service unavailable (DB down)

### Deployment
- **Production builds only**:
  - `npm run build` (all workspaces)
  - `npm run predeploy` (validation)
  - `NODE_ENV=production npm start`
- **Never deploy uncommitted changes**
- **Always tag releases** with semantic versioning (v1.0.0)
- **Create pull requests** for all changes (no direct main commits)
- **Require CI/CD pass** before merging

---

## File & Folder Conventions

### Naming Conventions
| Type | Pattern | Example |
|------|---------|---------|
| **Files** | `kebab-case.ts` | `user-auth.ts`, `db-client.ts` |
| **Folders** | `kebab-case/` | `src/lib/`, `artifacts/api-server/` |
| **Components** | `PascalCase.tsx` | `UserProfile.tsx`, `TradeForm.tsx` |
| **Functions** | `camelCase` | `getUserById()`, `validateEmail()` |
| **Constants** | `UPPER_SNAKE_CASE` | `DEFAULT_PORT`, `MAX_RETRIES` |
| **Types** | `PascalCase` | `User`, `TradeOrder`, `ApiResponse` |
| **Enums** | `PascalCase` | `AccountTier`, `OrderStatus` |

### Folder Organization

```
artifacts/api-server/src/
├── routes/           # API endpoint handlers
│   └── *.ts         # Each file = one resource endpoint
├── lib/             # Internal utilities & services
│   ├── auth-*.ts    # Auth-related
│   ├── db-*.ts      # Database utilities
│   ├── *-client.ts  # External service clients
│   └── *.ts         # General services
├── types/           # TypeScript types & interfaces
│   └── *.ts         # Organized by domain
└── middlewares/     # Express middleware (empty, for future)

artifacts/nextrade/src/
├── pages/           # Full-page components (route-level)
├── components/      # Reusable UI components
├── hooks/           # Custom React hooks
├── styles/          # CSS & Tailwind
└── utils/           # Helper functions
```

### Import Path Conventions
```typescript
// ✅ CORRECT
import { User } from '@workspace/api-zod';
import { getDb } from './lib/db-client';
import { TradeForm } from '../components/TradeForm';

// ❌ WRONG
import User from '@workspace/api-zod/dist/types';
import getDb from '../../lib/db-client.ts';
import { default as TradeForm } from '../../components/TradeForm/index.ts';
```

---

## TypeScript Standards

### Configuration
```jsonc
{
  "compilerOptions": {
    "strict": true,           // Non-negotiable
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,      // Generate .d.ts
    "declarationMap": true,   // Source maps for .d.ts
    "sourceMap": true,
    "lib": ["ES2020", "DOM"],
    "target": "ES2020",
    "module": "ESNext"
  }
}
```

### Type Annotations
```typescript
// ✅ CORRECT - Explicit types
function getUserById(id: string): Promise<User | null> {
  return db.users.findUnique({ where: { id } });
}

// ✅ CORRECT - Use interfaces for objects
interface TradeRequest {
  symbol: string;
  quantity: number;
  side: 'buy' | 'sell';
}

// ❌ WRONG - Implicit any
function getUserById(id) {  // id: any
  return db.users.findUnique({ where: { id } });
}

// ❌ WRONG - Object without interface
function submitTrade(trade: { symbol: string; qty: number }) {
  // Fragile and hard to refactor
}
```

### Avoiding Common Pitfalls
```typescript
// ✅ CORRECT - Use type guards
if (typeof user === 'object' && user !== null && 'id' in user) {
  console.log(user.id);
}

// ✅ CORRECT - Use const for immutable types
const API_BASE = 'https://api.example.com';
const userRoles = ['admin', 'user', 'guest'] as const;

// ❌ WRONG - No null checking
function getName(user: User) {
  return user.name.toUpperCase();  // Crash if user.name is null
}

// ❌ WRONG - Mutating const
const config = { port: 3000 };
config.port = 8080;  // Allowed (object is mutable)
```

---

## Code Style Guide

### Formatting
- **Indentation**: 2 spaces (not tabs)
- **Line length**: 120 characters (soft limit)
- **Quotes**: Single quotes for strings (unless JSON)
- **Semicolons**: Always use them
- **Trailing commas**: Yes (ES5+ compatible)

```typescript
// ✅ CORRECT
const config = {
  port: 3000,
  host: 'localhost',
};

const users = ['alice', 'bob', 'charlie'];

// ❌ WRONG
const config = { port: 3000, host: 'localhost' }
const users = [ 'alice', 'bob', 'charlie' ]
```

### Function Definitions
```typescript
// ✅ CORRECT - Arrow function with explicit type
const getUserById = async (id: string): Promise<User | null> => {
  return db.users.findUnique({ where: { id } });
};

// ✅ CORRECT - Regular function with type
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ❌ WRONG - No type annotation
const getUserById = (id) => {
  return db.users.findUnique({ where: { id } });
};

// ❌ WRONG - Implicit return type
async function submitTrade(trade: Trade) {
  const result = await market.execute(trade);
  return result;  // Type is unknown
}
```

### Error Handling
```typescript
// ✅ CORRECT - Proper error handling
try {
  const user = await db.users.findUnique({ where: { id } });
  if (!user) {
    throw new Error('User not found');
  }
  return user;
} catch (error) {
  logger.error({ err: error }, 'Failed to fetch user');
  throw new AppError('DATABASE_ERROR', 'User lookup failed');
}

// ❌ WRONG - No error handling
const user = await db.users.findUnique({ where: { id } });
return user;  // Crashes if id doesn't exist

// ❌ WRONG - Swallowing errors
try {
  await db.users.update({ where: { id }, data });
} catch (e) {
  // Silent failure - user never knows
}
```

### Comments & Documentation
```typescript
// ✅ CORRECT - Explain WHY, not WHAT
// We use bcryptjs instead of native crypto because it provides
// a simpler API and better salt generation for passwords
const hashedPassword = await bcryptjs.hash(password, 12);

// ✅ CORRECT - JSDoc for public functions
/**
 * Validates a user's email against common patterns.
 * @param email - The email address to validate
 * @returns true if email format is valid, false otherwise
 * @example
 * validateEmail('user@example.com') // true
 * validateEmail('invalid') // false
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ❌ WRONG - Comment states the obvious
const hashedPassword = await bcryptjs.hash(password, 12); // Hash the password
const user = await db.users.findUnique({ where: { id } }); // Find user by id
```

---

## React Component Conventions (Frontend)

### Component Structure
```typescript
// ✅ CORRECT
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from './Button';

interface TradeFormProps {
  onSubmit: (trade: Trade) => Promise<void>;
}

export const TradeForm: React.FC<TradeFormProps> = ({ onSubmit }) => {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ symbol });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
};

export default TradeForm;
```

### Hooks Usage
```typescript
// ✅ CORRECT - Use React Query for API calls
const useGetUser = (userId: string) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
  });
};

// ✅ CORRECT - Custom hooks for logic reuse
const useTradeForm = () => {
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState(0);

  return { symbol, setSymbol, quantity, setQuantity };
};

// ❌ WRONG - Direct fetch in component
export const UserProfile = ({ userId }: Props) => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(setUser);
  }, [userId]);  // Missing dependency array discipline
};
```

---

## Express Route Conventions

### Route Handler Pattern
```typescript
// ✅ CORRECT
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth';

const router = Router();

const CreateTradeSchema = z.object({
  symbol: z.string().min(1),
  quantity: z.number().positive(),
  side: z.enum(['buy', 'sell']),
});

type CreateTradeRequest = z.infer<typeof CreateTradeSchema>;

router.post('/api/trades', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate input
    const body = CreateTradeSchema.parse(req.body);

    // Check authorization
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Execute business logic
    const trade = await db.trades.create({
      data: {
        userId: req.user.id,
        ...body,
      },
    });

    // Emit real-time update
    io.to(`user-${req.user.id}`).emit('trade:created', trade);

    // Return response
    return res.status(201).json(trade);
  } catch (error) {
    logger.error({ err: error }, 'Failed to create trade');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### Error Handling in Routes
```typescript
// ✅ CORRECT - Zod validation error
router.post('/api/trades', async (req, res) => {
  try {
    const body = CreateTradeSchema.parse(req.body);
    // Process...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      });
    }
    // Handle other errors...
  }
});

// ✅ CORRECT - Authorization error
if (req.user?.accountTier !== 'pro') {
  return res.status(403).json({
    error: 'Feature not available for your tier',
    code: 'TIER_RESTRICTION',
  });
}

// ✅ CORRECT - Rate limiting error
if (tooManyRequests) {
  return res.status(429).json({
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMITED',
    retryAfter: 60,
  });
}
```

---

## Testing Conventions

### Test Organization
```typescript
// ✅ CORRECT - Clear describe blocks
describe('User Authentication', () => {
  describe('POST /api/auth/login', () => {
    it('should return user and session on valid credentials', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'ValidPassword123!';

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 on invalid credentials', async () => {
      // ...
    });
  });
});
```

---

## Git & Version Control

### Commit Message Format
```
[TYPE] Brief description (50 chars max)

Detailed explanation of changes (72 chars per line).
Explain the WHY, not just the WHAT.

Fixes #123
Related: #456
```

**Types**:
- `[feat]` - New feature
- `[fix]` - Bug fix
- `[refactor]` - Code refactor (no behavior change)
- `[docs]` - Documentation only
- `[test]` - Tests only
- `[chore]` - Build, deps, CI/CD
- `[perf]` - Performance improvement

### Branch Naming
```
feature/trading-engine
fix/otp-expiration-bug
docs/api-documentation
chore/upgrade-dependencies
```

### Pull Request Process
1. Create branch from `main`
2. Make changes locally
3. Push to origin
4. Create PR with clear title
5. Link to related issues
6. Wait for CI/CD pass
7. Get review approval
8. Squash and merge

---

## Logging Standards

### Log Levels
| Level | Use Case | Example |
|-------|----------|---------|
| `debug` | Development details | Variable values, intermediate states |
| `info` | General information | User logged in, trade executed |
| `warn` | Unexpected but recoverable | Retry attempt 2/5, cache miss |
| `error` | Recoverable errors | Database connection failed, retry |
| `fatal` | Unrecoverable errors | Startup failed, exit process |

### Logging Examples
```typescript
// ✅ CORRECT - Structured logging
logger.info({ userId, action: 'login' }, 'User logged in');
logger.warn({ attempt: 2, delayMs: 3000, err }, 'Retry connection');
logger.error({ err, sql }, 'Database query failed');

// ❌ WRONG - Loose logging
console.log('User logged in with ID:', userId);  // Unstructured
logger.info('User logged in with ID: ' + userId);  // String concatenation
logger.error('Error:', err);  // Missing context
```

---

## Performance Standards

### Backend
- **API response time**: <200ms p95
- **Database queries**: Indexed, <50ms per query
- **Memory**: <300MB at idle
- **Connection pool**: 20-30 connections per instance

### Frontend
- **Initial load**: <3 seconds
- **Interactive**: <5 seconds (TTI)
- **Bundle size**: <200KB gzipped
- **React Query cache**: 1 hour default

### Database
- **Connections**: Pooled (20-30 per instance)
- **Indexes**: On high-cardinality columns
- **Migrations**: <5 seconds downtime max
- **Backups**: Daily (14-day retention)

---

## Documentation Standards

### Code Documentation
- Every public function must have JSDoc
- Every interface/type must explain its purpose
- Complex business logic should explain WHY
- Deprecation notices if applicable

### README Files
- Explain what the module/service does
- How to run/build it
- How to test it
- Links to related documentation

### Commit Messages
- Link to issues/PRs
- Explain the impact
- Note any breaking changes

---

## Security Checklists

### Before Merging PR
- [ ] No secrets in code
- [ ] TypeScript strict mode passes
- [ ] Tests pass
- [ ] ESLint passes
- [ ] No `console.log` in production paths
- [ ] Validation schema added for new endpoints
- [ ] Error messages don't leak info

### Before Deploying
- [ ] All tests pass
- [ ] CI/CD pipeline passes
- [ ] Code reviewed
- [ ] PR merged to main
- [ ] Database backups taken
- [ ] Rollback plan documented
- [ ] Health checks passing

### On Security Issues
- Do NOT commit sensitive data
- Report to security@company.com (if applicable)
- Create private security advisory
- Coordinate disclosure timeline
- Deploy fix
- Public announcement after fix deployed

---

## Common Mistakes to Avoid

| Mistake | Reason | Fix |
|---------|--------|-----|
| Committing `.env` | Exposes secrets | Use `.env.example` |
| Direct database query in route | Slow, no caching | Use service layer |
| No input validation | SQL injection, XSS | Use Zod schema |
| Swallowing errors | Silent failures | Log & throw |
| Mutable globals | Race conditions | Use immutable constants |
| Missing error handling | Unhandled crashes | Always try/catch async |
| Hard-coded values | Brittle, not configurable | Use env variables |
| No type annotations | Bugs, refactoring hard | Use TypeScript types |
| Duplicate code | Maintenance nightmare | Extract to shared function |
| Inefficient queries | Slow database, high load | Use indexes, optimize joins |

---

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [OWASP Secure Coding](https://owasp.org/www-community/attacks/injection)
- [React Best Practices](https://react.dev/learn)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)
- [SQL Performance](https://use-the-index-luke.com/)
