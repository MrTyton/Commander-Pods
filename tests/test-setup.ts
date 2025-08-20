import { Page } from '@playwright/test';
import TestHelper from './test-helpers';

/**
 * Standard test setup and teardown functions for consistent test behavior
 */

// ==================== STANDARD SETUPS ====================

/**
 * Basic setup for most tests - navigates to app and waits for page ready
 */
export async function setupBasicTest(page: Page): Promise<TestHelper> {
    const helper = new TestHelper(page);
    await helper.setup.gotoWithWait();
    await helper.setup.waitForPageReady();
    return helper;
}

/**
 * Power mode setup with specific tolerance
 */
export async function setupPowerModeTest(
    page: Page,
    tolerance: 'none' | 'regular' | 'super' = 'none'
): Promise<TestHelper> {
    const helper = new TestHelper(page);
    await helper.setup.setupForTest({
        mode: 'power',
        tolerance: tolerance
    });
    return helper;
}

/**
 * Bracket mode setup
 */
export async function setupBracketModeTest(page: Page): Promise<TestHelper> {
    const helper = new TestHelper(page);
    await helper.setup.setupForTest({
        mode: 'bracket'
    });
    return helper;
}

/**
 * Setup with pre-created players for testing
 */
export async function setupWithPlayers(
    page: Page,
    players: { name: string; power?: string | number[]; bracket?: string | number[] }[],
    mode: 'power' | 'bracket' = 'power'
): Promise<TestHelper> {
    const helper = new TestHelper(page);
    await helper.setup.setupForTest({ mode });
    await helper.players.createPlayers(players);
    return helper;
}

/**
 * Setup with pods already generated
 */
export async function setupWithPods(
    page: Page,
    players: { name: string; power?: string | number[]; bracket?: string | number[] }[],
    mode: 'power' | 'bracket' = 'power'
): Promise<TestHelper> {
    const helper = await setupWithPlayers(page, players, mode);
    await helper.pods.generatePods();
    await helper.pods.waitForPodsGenerated();
    return helper;
}

/**
 * Setup for display mode testing
 */
export async function setupDisplayModeTest(
    page: Page,
    players: { name: string; power?: string | number[]; bracket?: string | number[] }[]
): Promise<TestHelper> {
    const helper = await setupWithPods(page, players);
    await helper.displayMode.waitForDisplayModeButton();
    await helper.displayMode.enterDisplayMode();
    return helper;
}

/**
 * Setup for group testing
 */
export async function setupGroupTest(
    page: Page,
    playerCount: number = 6
): Promise<TestHelper> {
    const helper = new TestHelper(page);
    await helper.setup.gotoWithWait();
    await helper.setup.waitForPageReady();
    await helper.players.ensurePlayerRows(playerCount);
    return helper;
}

/**
 * Setup for validation testing
 */
export async function setupValidationTest(page: Page): Promise<TestHelper> {
    const helper = new TestHelper(page);
    await helper.setup.gotoWithWait();
    await helper.setup.waitForPageReady();
    // Start with clean state - no initial validation errors
    return helper;
}

/**
 * Setup for shuffle testing
 */
export async function setupShuffleTest(
    page: Page,
    players: { name: string; power: string | number[] }[]
): Promise<TestHelper> {
    const helper = new TestHelper(page);
    await helper.setup.gotoWithWait();
    await helper.setup.waitForPageReady();

    // Ensure we have enough rows
    await helper.players.ensurePlayerRows(players.length);

    return helper;
}

// ==================== STANDARD TEARDOWNS ====================

/**
 * Basic cleanup - reset the application state
 */
export async function teardownBasicTest(helper: TestHelper) {
    // Check if helper is valid before attempting teardown
    if (!helper || !helper.setup || !helper.players) {
        console.warn('Helper object is invalid during teardown, skipping cleanup');
        return;
    }

    try {
        // Remove any existing dialog handlers to avoid conflicts
        helper.page.removeAllListeners('dialog');

        // Force close any open modals or tours that might block interactions
        try {
            // Close help modal if open
            const helpModal = helper.page.locator('#help-modal');
            if (await helpModal.isVisible()) {
                await helper.page.keyboard.press('Escape');
                await helpModal.waitFor({ state: 'hidden', timeout: 2000 });
            }
        } catch (modalError) {
            console.warn('Could not close help modal:', modalError);
        }

        try {
            // Check if tour manager exists and is active
            const isTourActive = await helper.page.evaluate(() => {
                return (window as any).tourManager && (window as any).tourManager.isActive;
            });

            if (isTourActive) {
                // Force end the tour immediately without animations
                await helper.page.evaluate(() => {
                    (window as any).tourManager.forceEndTour();
                });
                // Wait a moment for cleanup
                await helper.page.waitForTimeout(100);
            }

            // Also check for any remaining tour overlay elements
            const tourOverlay = helper.page.locator('.tour-overlay');
            if (await tourOverlay.isVisible()) {
                await helper.page.keyboard.press('Escape');
                await tourOverlay.waitFor({ state: 'hidden', timeout: 2000 });
            }
        } catch (tourError) {
            console.warn('Could not end active tour:', tourError);
        }

        // Wait a moment for any cleanup to complete
        await helper.page.waitForTimeout(100);

        // Reset with confirmation acceptance
        try {
            await helper.setup.resetWithConfirmation(true);
        } catch (resetError) {
            console.warn('Reset with confirmation failed:', resetError);
            // Try direct button click as fallback
            try {
                await helper.page.evaluate(() => {
                    const resetBtn = document.getElementById('reset-all-btn') as HTMLButtonElement;
                    if (resetBtn) {
                        resetBtn.click();
                    }
                });
                await helper.page.waitForTimeout(100);
            } catch (fallbackError) {
                console.warn('Fallback reset failed:', fallbackError);
            }
        }
    } catch (error) {
        // If reset fails, at least clear what we can
        console.warn('Reset failed during teardown:', error);
        try {
            await helper.players.clearAllPlayers();
        } catch (clearError) {
            console.warn('Clear players failed during teardown:', clearError);
        }
    }
}

/**
 * Display mode cleanup - exit display mode and reset
 */
export async function teardownDisplayModeTest(helper: TestHelper) {
    try {
        // Exit display mode if active
        if (await helper.displayMode.isInDisplayMode()) {
            await helper.displayMode.exitDisplayMode();
        }
    } catch (error) {
        console.warn('Display mode exit failed during teardown:', error);
    }

    await teardownBasicTest(helper);
}

/**
 * No-op teardown for tests that don't need cleanup
 */
export async function teardownNoOp(helper: TestHelper) {
    // Do nothing - for tests that want to preserve state
}

/**
 * Debug teardown - takes screenshot before cleaning up
 */
export async function teardownWithDebug(helper: TestHelper, testName: string) {
    try {
        await helper.utils.screenshot(`teardown-${testName}`);
    } catch (error) {
        console.warn('Screenshot failed during debug teardown:', error);
    }

    await teardownBasicTest(helper);
}

// ==================== CONVENIENCE FUNCTIONS ====================

/**
 * Create a standard beforeEach function for basic tests
 */
export function createBasicBeforeEach() {
    return async ({ page }: { page: Page }) => {
        return await setupBasicTest(page);
    };
}

/**
 * Create a standard beforeEach function for power mode tests
 */
export function createPowerModeBeforeEach(tolerance: 'none' | 'regular' | 'super' = 'none') {
    return async ({ page }: { page: Page }) => {
        return await setupPowerModeTest(page, tolerance);
    };
}

/**
 * Create a standard beforeEach function for bracket mode tests
 */
export function createBracketModeBeforeEach() {
    return async ({ page }: { page: Page }) => {
        return await setupBracketModeTest(page);
    };
}

/**
 * Create a standard afterEach function
 */
export function createBasicAfterEach() {
    return async (helper: TestHelper) => {
        await teardownBasicTest(helper);
    };
}

/**
 * Create a debug afterEach function that takes screenshots
 */
export function createDebugAfterEach(testSuiteName: string) {
    return async (helper: TestHelper, testInfo: any) => {
        const testName = `${testSuiteName}-${testInfo.title.replace(/\s+/g, '-')}`;
        await teardownWithDebug(helper, testName);
    };
}

// ==================== EXAMPLE USAGE PATTERNS ====================

/**
 * Example of how to use these functions in a test file:
 * 
 * ```typescript
 * import { test, expect } from '@playwright/test';
 * import { setupPowerModeTest, teardownBasicTest } from './test-setup';
 * 
 * test.describe('My Test Suite', () => {
 *     let helper: TestHelper;
 * 
 *     test.beforeEach(async ({ page }) => {
 *         helper = await setupPowerModeTest(page, 'regular');
 *     });
 * 
 *     test.afterEach(async () => {
 *         await teardownBasicTest(helper);
 *     });
 * 
 *     test('my test', async () => {
 *         // Test logic using helper
 *         await helper.players.createPlayers([...]);
 *         await helper.pods.generatePods();
 *         // assertions...
 *     });
 * });
 * ```
 */
