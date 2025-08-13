/**
 * Minimal type guards - Only used functions
 * Tree-shaken version to reduce bundle size
 */

/**
 * Type guard to check if an element is an HTMLElement
 */
export function isHTMLElement(element: unknown): element is HTMLElement {
    return element instanceof HTMLElement;
}

/**
 * Type guard to check if an element is an HTMLInputElement
 */
export function isHTMLInputElement(element: unknown): element is HTMLInputElement {
    return element instanceof HTMLInputElement;
}

/**
 * Type guard to check if an element is an HTMLButtonElement
 */
export function isHTMLButtonElement(element: unknown): element is HTMLButtonElement {
    return element instanceof HTMLButtonElement;
}

/**
 * Get element by ID with type checking
 */
export function getElementByIdTyped<T extends Element>(
    id: string,
    typeGuard: (element: unknown) => element is T
): T | null {
    const element = document.getElementById(id);
    if (!element) return null;

    if (!typeGuard(element)) {
        console.warn(`Element #${id} exists but is not the expected type`);
        return null;
    }

    return element;
}

/**
 * Strongly typed event target helpers
 */
export function getEventTarget<T extends Element>(
    event: Event,
    typeGuard: (element: unknown) => element is T
): T | null {
    const target = event.target;
    if (!target || !typeGuard(target)) {
        return null;
    }
    return target;
}

/**
 * Assert that a value is not null or undefined
 */
export function assertExists<T>(value: T | null | undefined, message?: string): T {
    if (value === null || value === undefined) {
        throw new Error(message || 'Assertion failed: value is null or undefined');
    }
    return value;
}
