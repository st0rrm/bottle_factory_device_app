# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a bottle factory device application - a React-based frontend for a reusable cup rental system (리턴미컵). The application displays cup usage statistics, tree growth visualization based on accumulation, and handles cup borrowing/returning operations through phone number or QR code verification.

## Project Structure

The main code is in `bottle_factory_device_app/project1/` (a Vite + React project).

Key directories:
- `src/pages/` - Page-level components organized by feature (home, rental, identification, growth, recommendation)
- `src/components/` - Reusable components (StatDisplay, TreeImage, VerificationModal)
- `src/styles/` - Global styles including Pretendard font definitions
- `src/assets/` - Static assets (fonts, images)
- `src/routes/` - Routing configuration

## Development Commands

All commands should be run from `bottle_factory_device_app/project1/` directory:

```bash
# Install dependencies
npm install
# or
yarn install

# Start development server with HMR
npm run dev

# Build for production
npm run build

# Run ESLint
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Component Hierarchy
- `App.jsx` - Root component that renders HomeScreen with full-height background
- `pages/home/home.jsx` - Main home screen with stats, tree visualization, and action buttons
  - Contains modal state management for verification flow
  - Handles borrow/return cup actions
- `components/VerificationModal.jsx` - Modal for phone/QR verification with two modes:
  - Phone mode: keypad input for phone number entry (max 11 digits)
  - QR mode: QR code scanning interface

### State Management
- Currently uses React useState for local component state
- Home screen manages:
  - `stats` object (cafeName, totalAccumulated, dailyAccumulated, weeklyAccumulated)
  - `isModalOpen` boolean for verification modal

### Tree Growth Logic
The tree visualization changes based on accumulated usage count:
- Stage 1: 0-10 uses
- Stage 2: 11-30 uses
- Stage 3: 31+ uses
(See `TreeImage.jsx:9-17`)

## Styling Guidelines

- Use **Pretendard** font family throughout the application
- To change font weight, use `font-weight` property only (e.g., `font-weight: 600` for SemiBold)
- Available weights: 100-900 (Thin to Black)
- Font files are defined in `src/styles/global.css`

## Key Implementation Notes

### Modal Pattern
The VerificationModal uses an overlay pattern:
- Clicking overlay closes modal
- Clicking modal content does not propagate to overlay (e.stopPropagation)
- Modal is conditionally rendered based on `isModalOpen` state

### Phone Input Validation
- Maximum 11 digits (Korean phone format: 010-xxxx-yyyy)
- Backspace functionality via "지우기" button
- Confirm via "확인" button

### Page Structure
Multiple page directories exist but may be unused or in-progress:
- `pages/growth`, `pages/rental`, `pages/rental_confirm`
- `pages/identification_qr`, `pages/identification_tel`, `pages/identification_tel_verity`
- `pages/recommendation`

Current implementation shows home screen with inline modal - other pages may need integration.

## Tech Stack

- React 19.1.1
- Vite 7.1.12 (build tool with HMR)
- ESLint 9.36.0 with React Hooks and React Refresh plugins
- No routing library currently configured (only single HomeScreen rendered)
- No state management library (Redux, Zustand, etc.)
