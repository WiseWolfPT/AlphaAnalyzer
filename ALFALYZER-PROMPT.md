# 🚀 ALFALYZER SESSION PROMPT

## Use this prompt when starting ANY new conversation:

```
Continue Alfalyzer implementation:
1. Read ENTIRE ALFALYZER-PRODUCTION-PLAN-2.md (2752 lines for full context)
2. Focus on "LAST SESSION SUMMARY" section for current status
3. CRITICAL: Check sync status before any work
4. Follow ENVIRONMENT PARITY REQUIREMENTS (line 46)
5. Implement the next pending phase LOCALLY
6. Deploy same day (MANDATORY - line 2385)
7. Update LAST SESSION SUMMARY before stopping
8. Stop for context management

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