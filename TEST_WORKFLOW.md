# Test Workflow Instructions

## Overview
This document contains the step-by-step workflow for fixing tests systematically, ensuring each fix is properly validated and committed.

## Workflow Steps

### For Each Issue/Fix:

1. **Identify the Issue**
   - Run tests to identify failing tests
   - Analyze the specific failure and root cause

2. **Make the Fix**
   - Edit the relevant TypeScript files
   - Ensure changes are minimal and focused

3. **Build and Bundle**
   ```powershell
   npm run bundle
   ```

4. **Run Tests**
   ```powershell
   npx playwright test --reporter=line --timeout=30000
   ```

5. **Verify All Tests Pass**
   - Ensure the specific issue is fixed
   - Ensure no new test failures are introduced
   - All tests must pass before proceeding

6. **Commit the Fix**
   ```powershell
   git add .
   git commit -m "Fix: [description of the specific issue fixed]"
   ```

## Test Command Reference

### Full Test Suite
```powershell
npx playwright test --reporter=line --timeout=30000
```

### Run Specific Test File
```powershell
npx playwright test tests/[filename].spec.ts --reporter=line --timeout=30000
```

### Run Single Test
```powershell
npx playwright test tests/[filename].spec.ts:[line] --reporter=line --timeout=30000
```

## Common Issues to Watch For

1. **Display Mode Issues**
   - Tests entering display mode but not exiting properly
   - Body class not being set/unset correctly
   - Display mode buttons not appearing/disappearing

2. **Reset Functionality**
   - Reset button not clearing all data
   - Initial state not being restored correctly

3. **Player Row Count Issues**
   - Tests expecting specific initial player counts
   - Adding/removing players not working correctly

4. **Pod Generation Issues**
   - Pod optimization settings not being respected
   - Power level calculations incorrect
   - Group assignments not working

## Git Workflow

- Each fix should be a separate commit
- Commit messages should be descriptive and specific
- All tests must pass before committing
- Use conventional commit format when possible:
  - `Fix: [description]`
  - `Test: [description]`
  - `Refactor: [description]`

## Notes

- Always run `npm run bundle` after TypeScript changes
- Use `--reporter=line` for cleaner test output
- Focus on one issue at a time
- Verify no regressions before committing
