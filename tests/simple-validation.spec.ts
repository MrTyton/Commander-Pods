import { test, expect } from '@playwright/test';

test('Basic validation behavior - name field only', async ({ page }) => {
    await page.goto('./index.html');

    // Test that new rows don't show validation errors initially
    const nameInput = page.locator('.player-row:nth-child(1) .player-name');

    // New rows should NOT start with errors
    await expect(nameInput).not.toHaveClass(/input-error/);

    // Name validation should only trigger after the user interacts with the field
    await nameInput.click();
    await nameInput.fill('Test');
    await nameInput.fill(''); // Clear it

    // Now that the field has been touched, it should show error for empty value
    await expect(nameInput).toHaveClass(/input-error/);

    // Fill name properly
    await nameInput.fill('Test Player');
    await expect(nameInput).not.toHaveClass(/input-error/);
});

test('Pod generation triggers validation', async ({ page }) => {
    await page.goto('./index.html');

    const nameInput = page.locator('.player-row:nth-child(1) .player-name');
    const powerBtn = page.locator('.player-row:nth-child(1) .power-selector-btn');

    // Initially no errors
    await expect(nameInput).not.toHaveClass(/input-error/);
    await expect(powerBtn).not.toHaveClass(/error/);

    // Try to generate pods with empty fields
    await page.click('#generate-pods-btn');

    // Now both should show errors
    await expect(nameInput).toHaveClass(/input-error/);
    await expect(powerBtn).toHaveClass(/error/);
});
