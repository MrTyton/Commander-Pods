import { test, expect } from '@playwright/test';
import { setupValidationTest, teardownBasicTest } from './test-setup';
import TestHelper from './test-helpers';

test.describe('Basic Validation Behavior', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupValidationTest(page);
    });

    test.afterEach(async () => {
        await teardownBasicTest(helper);
    });

    test('name field validation - only triggers after interaction', async () => {
        // New rows should NOT start with errors
        await helper.validation.expectNameInputValid(1);

        // Name validation should only trigger after the user interacts with the field
        const nameInput = helper.players.getNameInput(1);
        await nameInput.click();
        await nameInput.fill('Test');
        await nameInput.fill(''); // Clear it

        // Now that the field has been touched, it should show error for empty value
        await helper.validation.expectNameInputError(1);

        // Fill name properly
        await helper.players.setPlayerName(1, 'Test Player');
        await helper.validation.expectNameInputValid(1);
    });

    test('pod generation triggers validation for empty fields', async () => {
        // Initially no errors
        await helper.validation.expectNameInputValid(1);
        await helper.validation.expectPowerButtonValid(1);

        // Try to generate pods with empty fields
        await helper.validation.triggerValidation();

        // Now both should show errors
        await helper.validation.expectNameInputError(1);
        await helper.validation.expectPowerButtonError(1);
    });
});
