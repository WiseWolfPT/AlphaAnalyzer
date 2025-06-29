# Lottie Dependencies Analysis and Import Patterns

## Current Dependencies

### Package.json Analysis
The project currently has **both** Lottie libraries installed:

1. **@lottiefiles/dotlottie-react**: `^0.14.1`
2. **@lottiefiles/react-lottie-player**: `^3.6.0`

## Current Issues Identified

### 1. Incorrect Import Pattern in landing.tsx
**Problem**: The file imports `Player` from `@lottiefiles/react-lottie-player` but uses `DotLottieReact` component, which should be imported from `@lottiefiles/dotlottie-react`.

**Current Code (Line 36)**:
```typescript
import { Player } from '@lottiefiles/react-lottie-player';
```

**Used Component (Line 299)**:
```typescript
<DotLottieReact
  src="/hero-animation-v2.lottie"
  loop
  autoplay
  style={{ 
    height: 'clamp(300px, 50vw, 600px)', 
    width: 'clamp(300px, 50vw, 600px)',
    maxWidth: '100%',
    maxHeight: '100%'
  }}
/>
```

## Library Comparison

### @lottiefiles/dotlottie-react (v0.14.1)
- **Purpose**: Modern React wrapper for .lottie files (newer dotlottie format)
- **Main Export**: `DotLottieReact`
- **File Support**: .lottie files (newer format)
- **Features**: Better performance, smaller bundle size
- **Usage**: For .lottie format files

### @lottiefiles/react-lottie-player (v3.6.0)
- **Purpose**: Traditional React wrapper for JSON Lottie files
- **Main Export**: `Player` (as class component)
- **File Support**: JSON animation files
- **Features**: More mature, wider compatibility
- **Usage**: For traditional JSON Lottie files

## Correct Import Patterns

### For DotLottie (.lottie files) - RECOMMENDED
```typescript
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// Usage
<DotLottieReact
  src="/animation.lottie"
  loop
  autoplay
  style={{ width: '300px', height: '300px' }}
/>
```

### For Traditional Lottie (JSON files)
```typescript
import { Player } from '@lottiefiles/react-lottie-player';

// Usage
<Player
  src="/animation.json"
  loop
  autoplay
  style={{ width: '300px', height: '300px' }}
/>
```

## Exported Components by Library

### @lottiefiles/dotlottie-react exports:
- `DotLottieReact` - Main component for .lottie files
- `DotLottieWorkerReact` - Web Worker version
- `setWasmUrl` - Configuration function
- All exports from `@lottiefiles/dotlottie-web`

### @lottiefiles/react-lottie-player exports:
- `Player` - Main component class
- `Controls` - Control components
- `Seeker` - Seeker component
- Various enums and types

## Recommendations

### 1. Fix Current Import Issue
**File**: `/client/src/pages/landing.tsx`
**Fix**: Change the import to match the component being used

**From**:
```typescript
import { Player } from '@lottiefiles/react-lottie-player';
```

**To**:
```typescript
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
```

### 2. Consider Library Consolidation
Since the project uses .lottie files (based on the `src="/hero-animation-v2.lottie"`), you might consider:

**Option A**: Keep only `@lottiefiles/dotlottie-react` if all animations are .lottie format
**Option B**: Keep both if you need support for both .lottie and JSON formats

### 3. File Format Check
Verify your animation files:
- `.lottie` files → use `@lottiefiles/dotlottie-react`
- `.json` files → use `@lottiefiles/react-lottie-player`

## Current Animation File
The landing page uses: `"/hero-animation-v2.lottie"`
This confirms that `DotLottieReact` is the correct component choice.

## No Conflicts Detected
- Both libraries can coexist without conflicts
- They serve different purposes and don't interfere with each other
- TypeScript definitions are properly separated

## Next Steps
1. Fix the import in `/client/src/pages/landing.tsx`
2. Verify all animation files are in the correct format
3. Consider removing unused library if only one format is needed
4. Update any other files that might have similar import issues