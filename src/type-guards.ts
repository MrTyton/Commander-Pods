/**
 * Type guards and utility types for improved type safety
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
 * Type guard to check if an element is an HTMLSelectElement
 */
export function isHTMLSelectElement(element: unknown): element is HTMLSelectElement {
    return element instanceof HTMLSelectElement;
}

/**
 * Type guard to check if an element is an HTMLButtonElement
 */
export function isHTMLButtonElement(element: unknown): element is HTMLButtonElement {
    return element instanceof HTMLButtonElement;
}

/**
 * Safe querySelector that returns null if element doesn't exist or is wrong type
 */
export function safeQuerySelector<T extends Element = Element>(
    parent: Document | Element,
    selector: string,
    typeGuard?: (element: unknown) => element is T
): T | null {
    const element = parent.querySelector(selector);
    if (!element) return null;

    if (typeGuard && !typeGuard(element)) {
        console.warn(`Element ${selector} exists but is not the expected type`);
        return null;
    }

    return element as T;
}

/**
 * Safe querySelectorAll that ensures type safety
 */
export function safeQuerySelectorAll<T extends Element = Element>(
    parent: Document | Element,
    selector: string,
    typeGuard?: (element: unknown) => element is T
): T[] {
    const elements = Array.from(parent.querySelectorAll(selector));

    if (typeGuard) {
        return elements.filter(typeGuard);
    }

    return elements as T[];
}

/**
 * Safe element access with type checking
 */
export function getElementSafely<T extends Element>(
    parent: Document | Element,
    selector: string,
    typeGuard: (element: unknown) => element is T,
    errorMessage?: string
): T | null {
    const element = parent.querySelector(selector);

    if (!element) {
        if (errorMessage) {
            console.warn(`Element not found: ${selector}. ${errorMessage}`);
        }
        return null;
    }

    if (!typeGuard(element)) {
        console.warn(`Element ${selector} exists but failed type check. ${errorMessage || ''}`);
        return null;
    }

    return element;
}

/**
 * Get element by ID (returns HTMLElement or null)
 */
export function getElementById(id: string): HTMLElement | null {
    return document.getElementById(id);
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
 * Type-safe property access for objects
 */
export function hasProperty<K extends string>(
    obj: unknown,
    key: K
): obj is Record<K, unknown> {
    return obj !== null && obj !== undefined && typeof obj === 'object' && key in obj;
}

/**
 * Type guard for checking if value is a number
 */
export function isNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for checking if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard for checking if value is an array
 */
export function isArray<T>(value: unknown): value is T[] {
    return Array.isArray(value);
}

/**
 * Type-safe array access
 */
export function getArrayItem<T>(array: T[], index: number): T | undefined {
    if (index < 0 || index >= array.length) {
        return undefined;
    }
    return array[index];
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
