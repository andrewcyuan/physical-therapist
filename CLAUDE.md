# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is an app to give live physical therapy guidance. The app will use live video processing using AI and pose detection to give guidance, and give live audio feedback.

### Core Technologies

- **Framework**: Next.js with App Router (using TypeScript)
- **Authentication**: Supabase Auth with SSR support
- **Database**: Supabase PostgreSQL
- **State Management**: Zustand and React Query

### Directory Structure

- `/app`: Next.js App Router pages and API routes
- `/components`: React components organized by feature
- `/utils`: Utility functions and helpers
- `/hooks`: Custom React hooks
- `/types`: TypeScript type definitions
- `/lib`: Core functionality libraries
- `/public`: Static assets

### Important Integration Points

1. **Supabase Client**: Authentication and database access via `utils/supabase/client.ts` and `utils/supabase/server.ts`

### Frontend

Always use tailwind zinc!

### Deployment

The application is configured for deployment on Vercel.

### React Best Practices
1. Do NOT use ternary operators for conditional rendering. This leads to unreadable code that is hard to manage down the line. Instead, use a React Sub-component in the same file, then if-statements.
2. Please emphasize clear and readable variable names, especially for files and React components.
3. Do NOT write comments anywhere, your code should be simple and understandable - therefore comments are NOT needed.
4. NEVER use svg elements directly in a React component. SVGs should always be created as their own file in the public folder, then referenced in the React component.


# IMPORTANT NOTE
Before coding, always think about the NPM packages you could use to simply the code, and use packages AS MUCH AS POSSIBLE. 
Do NOT reinvent the wheel where it is not needed. Be resourceful. Search the web for popular NPM packages.

# Tailwind Note 
Never use opacity control on colors defined in globals css. For example bg-primary/50 will never work. We must just use different colors from globals to make this work. Try to avoid creating your own colors when possible and just use tailwind ones defined in globals.css.
