/**
 * Direct ErrorMessages test
 */

import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers.js';
import { setupBasicTest, teardownBasicTest } from './test-setup.js';

test.describe('Direct ErrorMessages Test', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async () => {
        await teardownBasicTest(helper);
    });

    test('should test ErrorMessages.show directly', async ({ page }) => {
        // Test if we can access and use ErrorMessages
        const result = await page.evaluate(() => {
            // Try to find ErrorMessages in the global scope or import it

            // Check window object
            const windowKeys = Object.keys(window);

            // Try to access from script globals
            try {
                // Try importing if available
                if (typeof (window as any).ErrorMessages !== 'undefined') {
                    (window as any).ErrorMessages.show('E005');
                    return 'ErrorMessages.show called';
                } else {
                    return 'ErrorMessages not found';
                }
            } catch (error) {
                return `Error: ${error}`;
            }
        });

        // Wait for potential toast
        await page.waitForTimeout(2000);

        // Check if toast appeared
        const toastExists = await page.locator('.toast-container .toast').count();
    });
});
