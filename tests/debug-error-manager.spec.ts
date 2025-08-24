/**
 * Debug test to check if modern error manager is working
 */

import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers.js';
import { setupBasicTest, teardownBasicTest } from './test-setup.js';

test.describe('Debug Modern Error Manager', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async () => {
        await teardownBasicTest(helper);
    });

    test('should create toast container on page load', async ({ page }) => {
        // Check if toast container exists in DOM (but may not be visible when empty)
        const toastContainer = page.locator('#toast-container');
        await expect(toastContainer).toBeAttached();

        // Check if modal container exists in DOM (but may not be visible when empty)
        const modalContainer = page.locator('#modal-container');
        await expect(modalContainer).toBeAttached();
    });

    test('should manually trigger error manager', async ({ page }) => {
        // Inject code to manually trigger the error manager
        await page.evaluate(() => {
            // Try to access the global error manager

            // Check if the containers exist
            const toastContainer = document.getElementById('toast-container');
            const modalContainer = document.getElementById('modal-container');

            // Try to access modernErrorManager from the global scope
            if ((window as any).modernErrorManager) {
                (window as any).modernErrorManager.showError('Test Error', 'This is a test');
            }
        });

        // Wait a bit for any toasts to appear
        await page.waitForTimeout(2000);

        // Check console logs
        const logs = await page.evaluate(() => {
            return (window as any).logs || [];
        });
    });

    test('should test error messages module', async ({ page }) => {
        // Check if ErrorMessages is available and working
        await page.evaluate(() => {
            // Try to trigger an error using ErrorMessages
            try {
                // This should call the modernErrorManager
                if ((window as any).ErrorMessages) {
                    (window as any).ErrorMessages.show('E005', 'Test error');
                }
            } catch (error) {
                // Error handling without logging
            }
        });

        await page.waitForTimeout(2000);
    });
});
