import { test, expect } from '@playwright/test';

test('User-friendly validation for player fields', async ({ page }) => {
    await page.goto('./index.html');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Test that new rows don't show validation errors initially
    const nameInput = page.locator('.player-row:nth-child(1) .player-name');
    const powerBtn = page.locator('.player-row:nth-child(1) .power-selector-btn');

    // New rows should NOT start with errors
    await expect(nameInput).not.toHaveClass(/input-error/);
    await expect(powerBtn).not.toHaveClass(/error/);

    // Name validation should only trigger after the user interacts with the field
    await nameInput.click();
    await nameInput.fill('Test');
    await nameInput.fill(''); // Clear it

    // Now that the field has been touched, it should show error for empty value
    await expect(nameInput).toHaveClass(/input-error/);

    // Fill name properly
    await nameInput.fill('Test Player');
    await expect(nameInput).not.toHaveClass(/input-error/);

    // Power/bracket validation should only trigger when pods are generated
    await expect(powerBtn).not.toHaveClass(/error/);

    // Try to generate pods - this should trigger validation
    await page.click('#generate-pods-btn');

    // Now power button should show error since no power levels selected
    await expect(powerBtn).toHaveClass(/error/);

    // Select a power level - error should clear immediately
    await powerBtn.click();
    await page.waitForSelector('.player-row:nth-child(1) .power-checkbox input[value="7"]', { state: 'visible' });
    await page.check('.player-row:nth-child(1) .power-checkbox input[value="7"]');
    await powerBtn.click(); // Close dropdown

    // Error should be removed
    await expect(powerBtn).not.toHaveClass(/error/);
});

test('Bracket mode validation behavior', async ({ page }) => {
    await page.goto('./index.html');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Switch to bracket mode
    await page.click('#bracket-radio');

    const nameInput = page.locator('.player-row:nth-child(1) .player-name');
    const bracketBtn = page.locator('.player-row:nth-child(1) .bracket-selector-btn');

    // Fill name
    await nameInput.fill('Player 1');

    // Bracket button should not show error initially
    await expect(bracketBtn).not.toHaveClass(/error/);

    // Try to generate pods - should trigger validation
    await page.click('#generate-pods-btn');

    // Now bracket button should show error
    await expect(bracketBtn).toHaveClass(/error/);

    // Select a bracket - error should clear
    await bracketBtn.click();
    await page.waitForSelector('.player-row:nth-child(1) .bracket-checkbox input[value="3"]', { state: 'visible' });
    await page.check('.player-row:nth-child(1) .bracket-checkbox input[value="3"]');
    await bracketBtn.click(); // Close dropdown

    // Error should be removed
    await expect(bracketBtn).not.toHaveClass(/error/);
});

test('Multiple players validation flow', async ({ page }) => {
    await page.goto('./index.html');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Use existing first player row and set it up properly
    await page.fill('.player-row:nth-child(1) .player-name', 'Player 1');
    const powerBtn1 = page.locator('.player-row:nth-child(1) .power-selector-btn');
    await powerBtn1.click();
    await page.waitForSelector('.player-row:nth-child(1) .power-checkbox input[value="7"]', { state: 'visible' });
    await page.check('.player-row:nth-child(1) .power-checkbox input[value="7"]');
    await powerBtn1.click();

    // Use existing second player row but leave it empty
    const secondRowName = page.locator('.player-row:nth-child(2) .player-name');
    const secondRowPower = page.locator('.player-row:nth-child(2) .power-selector-btn');

    // Second player should NOT have errors initially
    await expect(secondRowName).not.toHaveClass(/input-error/);
    await expect(secondRowPower).not.toHaveClass(/error/);

    // Try to generate pods - should trigger validation for all rows
    await page.click('#generate-pods-btn');

    // Now second player should have validation errors
    await expect(secondRowName).toHaveClass(/input-error/);
    await expect(secondRowPower).toHaveClass(/error/);

    // First player should still be valid
    await expect(page.locator('.player-row:nth-child(1) .player-name')).not.toHaveClass(/input-error/);
    await expect(page.locator('.player-row:nth-child(1) .power-selector-btn')).not.toHaveClass(/error/);

    // Fix second player's name
    await page.fill('.player-row:nth-child(2) .player-name', 'Player 2');
    await expect(secondRowName).not.toHaveClass(/input-error/);

    // Power error should still be there until fixed
    await expect(secondRowPower).toHaveClass(/error/);

    // Fix power level
    await secondRowPower.click();
    await page.waitForSelector('.player-row:nth-child(2) .power-checkbox input[value="6"]', { state: 'visible' });
    await page.check('.player-row:nth-child(2) .power-checkbox input[value="6"]');
    await secondRowPower.click();

    // All errors should be gone
    await expect(secondRowPower).not.toHaveClass(/error/);
});
