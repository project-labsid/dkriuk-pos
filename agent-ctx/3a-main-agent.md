# Task 3-a — Authentication API Routes & Seed Data

## Agent: Main Agent
## Status: Completed

### Summary
Built all authentication API routes for the POS system and created a comprehensive seed script.

### Deliverables
1. `src/app/api/auth/login/route.ts` — POST login with bcrypt verification
2. `src/app/api/auth/register/route.ts` — POST register with role-based access
3. `src/app/api/auth/[id]/route.ts` — GET/PUT/DELETE single user
4. `src/app/api/auth/change-password/route.ts` — POST change password
5. `src/app/api/users/route.ts` — GET list users with pagination/search/filters
6. `prisma/seed.ts` — Full seed with 2 branches, 4 users, 5 categories, 3 suppliers, 5 customers, 20 products, tax/service settings, 9 store settings, 20 transactions, 5 stock adjustments, 4 purchases

### Key Decisions
- Simple token-free auth: login returns user data, frontend stores in localStorage/zustand
- Register endpoint checks `x-user-role` header for super_admin verification
- DELETE user does soft-delete (deactivate) if user has transactions
- All responses exclude password field
- All routes use Indonesian language for error messages
- Seed creates default super_admin: `admin@pos.com` / `admin123`

### Dependencies Added
- bcryptjs + @types/bcryptjs
