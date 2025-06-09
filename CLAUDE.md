# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack TypeScript project with the following structure:
- `client/`: Frontend application
- `server/`: Backend application
- `shared/`: Shared types and utilities
- `node_modules/`: Dependencies
- Configuration files: `package.json`, `tsconfig.json`, `vite.config.ts`, etc.

## Development Commands

The project uses npm as the package manager. Here are the main development commands:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Architecture

This is a full-stack TypeScript application using:
- Frontend: React with Vite
- Backend: Node.js
- Database: (To be configured)
- Styling: Tailwind CSS
- Type Safety: TypeScript

The application follows a client-server architecture with shared types between frontend and backend.