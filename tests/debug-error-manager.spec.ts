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
        // Check if toast container exists
        const toastContainer = page.locator('#toast-container');
        await expect(toastContainer).toBeVisible();
        
        // Check if modal container exists
        const modalContainer = page.locator('#modal-container');
        await expect(modalContainer).toBeVisible();
    });

    test('should manually trigger error manager', async ({ page }) => {
        // Inject code to manually trigger the error manager
        await page.evaluate(() => {
            // Try to access the global error manager
            console.log('Testing modern error manager...');
            
            // Check if the containers exist
            const toastContainer = document.getElementById('toast-container');
            const modalContainer = document.getElementById('modal-container');
            console.log('Toast container:', toastContainer);
            console.log('Modal container:', modalContainer);
            
            // Try to access modernErrorManager from the global scope
            if ((window as any).modernErrorManager) {
                console.log('Found modern error manager on window');
                (window as any).modernErrorManager.showError('Test Error', 'This is a test');
            } else {
                console.log('Modern error manager not found on window');
            }
        });

        // Wait a bit for any toasts to appear
        await page.waitForTimeout(2000);
        
        // Check console logs
        const logs = await page.evaluate(() => {
            return (window as any).logs || [];
        });
        console.log('Browser logs:', logs);
    });

    test('should test error messages module', async ({ page }) => {
        // Check if ErrorMessages is available and working
        await page.evaluate(() => {
            console.log('Testing ErrorMessages...');
            
            // Try to trigger an error using ErrorMessages
            try {
                // This should call the modernErrorManager
                if ((window as any).ErrorMessages) {
                    console.log('Found ErrorMessages');
                    (window as any).ErrorMessages.show('E005', 'Test error');
                } else {
                    console.log('ErrorMessages not found on window');
                }
            } catch (error) {
                console.error('Error testing ErrorMessages:', error);
            }
        });

        await page.waitForTimeout(2000);
    });
});
