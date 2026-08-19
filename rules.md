# rules.md — Development Standards & Conventions

**→ Full documentation is in [/docs/RULES.md](/docs/RULES.md)**

This is a quick reference. For complete development rules, see the main file above.

---

## ABSOLUTE RULES (CRITICAL - MUST FOLLOW)

### 🚫 Business Logic (Non-Negotiable)
- **NEVER** change admin approval workflows
- **NEVER** modify wallet encryption
- **NEVER** alter KYC/compliance logic
- **NEVER** change OTP generation/validation
- **ONLY** fix infrastructure, dependencies, and deployment

### 🚫 Secrets Management
- **NEVER** commit `.env` to git
- **NEVER** log passwords, tokens, or API keys
- **NEVER** hardcode secrets in code
- **✅ USE**: Environment variables, platform vaults, GitHub Secrets
- **✅ BOOTSTRAP SAFE DEFAULTS**: build secure fallback secrets for missing local or first-build deployments, but replace them with real deployment secrets before public launch

### ✅ Production-Ready Deployment Rules
- Use `ENABLE_DEMO_AUTH=false` by default in production.
- Keep `ALLOWED_ORIGINS` aligned to the live host plus local and preview hosts used by the deployment platform.
- Prefer request-host-based reset links for custom domains and multi-origin hosting.
- Validate local/VPS/Railway/Vercel readiness with startup checks before public launch.

### 🚫 Database Changes
- **ALL schema changes** via Prisma migrations
- **NEVER** modify database manually
- **Command**: `npx prisma migrate dev --name description`
- **Version control** all migrations in `prisma/migrations/`

### 🚫 Repository Structure
- **Use npm workspaces** (NOT pnpm)
- **Remove pnpm-lock.yaml** if found
- **Keep**: `/artifacts/` and `/lib/` structure
- **No**: Version suffixes like `/api-v2/`, `/app-1/`

### ✅ Code Quality Standards
- TypeScript strict mode (no `any` types)
- All routes validate input with Zod
- Try/catch on all async functions
- Structured logging (Pino), no console.log
- Pass: TypeScript, ESLint, Tests, Production checks
- HTTP status codes correct (200, 400, 401, 403, 500, etc.)

### ✅ Security Requirements
- Helmet security headers enabled
- CSRF protection on state-changing routes
- Rate limiting on auth (5 req/15 min)
- Password hashing: bcryptjs (salt: 12)
- Session secrets: 32+ characters
- Wallet encryption: AES-256
- CORS: Whitelist, never `*`
- HTTPS: Mandatory in production

---

## TypeScript Standards

### Files
```
✅ /artifacts/api-server/src/**/*.ts
✅ /lib/api-zod/src/**/*.ts
✅ /artifacts/nextrade/src/**/*.tsx
✅ /tests/**/*.test.ts
```

### Strict Mode (Required)
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Type Safety
```typescript
// ❌ AVOID
function getUser(id) { }              // Missing types
const data: any = response.data;      // Never use 'any'
let result;                            // No type

// ✅ CORRECT
function getUser(id: string): User { }
const data: UserData = response.data;
let result: string | null = null;
```

---

## Express Route Patterns

### Basic Route Handler
```typescript
// ✅ CORRECT
app.post('/api/endpoint', [
  authenticate,                    // Middleware: validate session
  validate(requestSchema),          // Middleware: Zod validation
], async (req, res) => {
  try {
    // Validate database state
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Process request
    const result = await db.query();
    
    // Return response
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error:', error);  // Use logger
    res.status(500).json({ error: 'Server error' });
  }
});
```

### Error Handling
```typescript
// ✅ CORRECT
try {
  await asyncOperation();
} catch (error) {
  if (error instanceof ValidationError) {
    res.status(400).json({ error: 'Validation failed' });
  } else if (error instanceof DatabaseError) {
    res.status(500).json({ error: 'Database error' });
  } else {
    res.status(500).json({ error: 'Unknown error' });
  }
}
```

---

## React Component Patterns

### Functional Components (Hooks)
```typescript
// ✅ CORRECT
function TradeForm({ onSubmit }: { onSubmit: (data) => void }) {
  const [formData, setFormData] = useState(initialData);
  const { data, isLoading } = useQuery(['trades'], () => fetchTrades());
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch (error) {
      logger.error('Error:', error);
    }
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Hooks Usage
```typescript
// ✅ CORRECT
- useQuery() for server state (React Query)
- useState() for local state only
- useEffect() for side effects
- useCallback() for memoized callbacks

// ❌ AVOID
- useState() for server state (use useQuery)
- Multiple useEffect() calls (combine logic)
- useEffect() without dependency array
```

---

## Zod Validation

### Schema Pattern
```typescript
// ✅ CORRECT
import { z } from 'zod';

export const CreateTradeSchema = z.object({
  pair: z.string().regex(/^[A-Z]{3}[A-Z]{3}$/),
  amount: z.number().positive(),
  type: z.enum(['buy', 'sell']),
  user_id: z.string().uuid(),
});

type CreateTrade = z.infer<typeof CreateTradeSchema>;
```

### Validation Middleware
```typescript
// ✅ CORRECT
const validate = (schema: ZodSchema) => 
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }
    req.body = parsed.data; // Type-safe data
    next();
  };
```

---

## Git Workflow

### Commit Messages
```
✅ Correct format:
  type(scope): description
  
  Examples:
  - feat(trades): add limit order support
  - fix(auth): resolve OTP expiry bug
  - refactor(api): simplify user routes
  - docs: update API documentation
  
✅ Use imperative mood: "add" not "added"
✅ Capitalize first letter
✅ No period at end
```

### Branch Naming
```
✅ feature/description      (new features)
✅ fix/description          (bug fixes)
✅ refactor/description     (code cleanup)
✅ docs/description         (documentation)
✅ test/description         (test coverage)

❌ feat/new-thing           (missing scope)
❌ bugfix/issue             (use 'fix')
❌ work-in-progress         (use proper name)
```

### Pull Request Process
1. Create feature branch from `main`
2. Make commits with clear messages
3. Push to GitHub
4. Create PR with description
5. Pass all checks: CI/CD, code review
6. Merge with "Squash and merge"
7. Delete branch

---

## Testing Standards

### Test File Location
```
/tests/app-readiness.test.mjs
/tests/auth-flow.test.mjs
/tests/auth-throttle.test.mjs
/tests/db-connection-config.test.mjs
/tests/production-env.test.mjs
```

### Test Pattern
```typescript
describe('Feature', () => {
  it('should do expected behavior', async () => {
    // Arrange: Set up test data
    const user = await createTestUser();
    
    // Act: Perform the action
    const result = await executeAction(user);
    
    // Assert: Verify the result
    expect(result.success).toBe(true);
  });
});
```

### Run Tests
```bash
npm test                    # Run all tests
npm test -- auth            # Run matching tests
npm test -- --coverage      # Coverage report
```

---

## Logging Standards

### Use Pino Logger
```typescript
// ✅ CORRECT
import { logger } from './logger';

logger.info('User logged in', { userId });     // Info
logger.warn('High latency detected', { ms });  // Warning
logger.error('Database error', error);         // Error
logger.debug('Cache hit', { key });            // Debug

// ❌ AVOID
console.log('Debug info');                     // No console.log
console.error('Error message');                // Use logger
```

### Never Log Sensitive Data
```typescript
// ❌ AVOID
logger.info('User password: ' + password);
logger.info('Session: ' + sessionId);
logger.info('Card: ' + cardNumber);

// ✅ CORRECT
logger.info('User authentication attempt', { userId });
logger.info('Withdrawal requested', { amount, userId });
```

---

## Common Mistakes (Avoid These!)

| Mistake | Problem | Solution |
|---------|---------|----------|
| Using `any` type | Breaks type safety | Use specific types |
| Missing Zod validation | Security risk | Always validate input |
| Unhandled promises | Runtime crashes | Wrap in try/catch |
| console.log in prod | Security leak | Use logger.info() |
| Storing secrets in code | Compromise | Use env variables |
| Missing error handling | Silent failures | Handle all errors |
| Direct DB queries | SQL injection risk | Use Prisma |
| Missing CORS config | Security issue | Whitelist origins |
| Skipping migrations | Data loss | Use Prisma migrate |
| Hardcoded URLs | Env-specific issues | Use env variables |
| No rate limiting | DDoS vulnerability | Add rate limits |

---

## Pre-Deployment Checklist

### Code Quality
```bash
npm run lint              # ✅ No linting errors
npm run typecheck         # ✅ No TypeScript errors
npm test                  # ✅ All tests pass
npm audit --audit-level=high  # ✅ No high severity vulnerabilities
```

### Build & Environment
```bash
npm run build             # ✅ Production build succeeds
npm run predeploy         # ✅ Production readiness verified
cp .env.example .env      # ✅ All required env vars set
```

### Database
```bash
npx prisma migrate status         # ✅ All migrations applied
npx prisma studio (local only)    # ✅ Schema looks correct
```

### Final Checks
```bash
git status                # ✅ All changes committed
git diff origin/main      # ✅ Review all changes
git log --oneline -5      # ✅ Commit history looks good
```

---

## 📖 Read the Full Rules

[→ See /docs/RULES.md for complete development standards, patterns, and security checklist](/docs/RULES.md)
