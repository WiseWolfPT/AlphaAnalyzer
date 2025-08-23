# 🚀 ALFALYZER SESSION PROMPT

## Use this prompt when starting ANY new conversation:

```
Continue Alfalyzer implementation:
1. Read ALFALYZER-PRODUCTION-PLAN-2.md
2. Check "LAST SESSION SUMMARY" section
3. Implement the next pending phase LOCALLY
4. Update document when complete
5. Stop for context management

Work location: LOCAL (never edit production directly)
Keep only: FMP (main) + Alpha Vantage (backup)
```

## First time / Phase 0:
```
Start Alfalyzer Phase 0 from ALFALYZER-PRODUCTION-PLAN-2.md
CRITICAL: Remove SimpleAuth vulnerability (3 files)
Clean APIs: Keep only FMP + Alpha Vantage
Work locally, test, update document, stop
```

## For specific phases:
```
Implement Alfalyzer [Phase X] from ALFALYZER-PRODUCTION-PLAN-2.md
Previous phase completed: [check document]
Work locally, update LAST SESSION SUMMARY when done
```

## Quick continue:
```
Continue Alfalyzer - check ALFALYZER-PRODUCTION-PLAN-2.md LAST SESSION SUMMARY
```

## Rules:
- ALWAYS work locally first
- ALWAYS update document before stopping
- ALWAYS stop after completing a phase
- NEVER continue without user confirmation
- NEVER edit production directly