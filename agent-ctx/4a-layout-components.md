# Task ID: 4-a — Main Application Layout Components

**Agent:** Main Agent
**Date:** 2025-07-03
**Status:** Completed

## Summary

Built 6 new files and modified 3 existing files to create the complete application layout system.

### New Files
- `src/features/auth/LoginPage.tsx` — Login page with zod validation, framer-motion, role setup detection
- `src/features/auth/ProfileDialog.tsx` — Profile edit + password change dialog
- `src/components/layout/AppSidebar.tsx` — Desktop sidebar with role-based nav, collapse mode, mobile overlay
- `src/components/layout/AppHeader.tsx` — Header with search, notifications, dark mode toggle, user dropdown
- `src/components/layout/MobileNav.tsx` — Bottom nav with Sheet for more options
- `src/components/layout/AppLayout.tsx` — Main layout combining all components with page transitions

### Modified Files
- `src/app/globals.css` — Emerald color scheme (oklch), custom scrollbars, theme transitions
- `src/app/layout.tsx` — ThemeProvider, Sonner toaster, POS Sejahtera metadata
- `src/app/page.tsx` — Auth hydration, login/app routing, page placeholders

### Key Decisions
- Emerald green oklch-based color palette replacing default neutral
- Sidebar: 256px desktop with animated collapse, mobile overlay with backdrop
- MobileNav: 5 bottom items + Sheet for overflow, role-filtered
- ProfileDialog: dual-tab (profile edit / password change) with zod validation
- All UI text in Bahasa Indonesia
- ESLint passes with 0 errors
