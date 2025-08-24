/**
 * Modern Error Handling System
 * 
 * Provides custom UI components for error handling that replace browser defaults:
 * - Toast notifications for error messages
 * - Modal dialogs for confirmations
 * - Enhanced error displays with contextual help
 * - Consistent styling that matches the application UI
 */

import { domCache } from './dom-cache.js';

interface ToastOptions {
    type: 'error' | 'warning' | 'success' | 'info';
    title: string;
    message: string;
    suggestions?: string[];
    duration?: number; // Auto-hide after milliseconds (0 = no auto-hide)
    actions?: Array<{
        label: string;
        action: () => void;
        style?: 'primary' | 'secondary' | 'danger';
    }>;
}

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmStyle?: 'primary' | 'danger' | 'warning';
    icon?: string;
}

export class ModernErrorManager {
    private static instance: ModernErrorManager;
    private toastContainer: HTMLElement | null = null;
    private modalContainer: HTMLElement | null = null;
    private activeToasts: Set<HTMLElement> = new Set();
    private toastCounter = 0;

    private constructor() {
        this.initializeContainers();
    }

    static getInstance(): ModernErrorManager {
        if (!ModernErrorManager.instance) {
            ModernErrorManager.instance = new ModernErrorManager();
        }
        return ModernErrorManager.instance;
    }

    /**
     * Initialize DOM containers for toasts and modals
     */
    private initializeContainers(): void {
        // Create toast container
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);

        // Create modal container
        this.modalContainer = document.createElement('div');
        this.modalContainer.id = 'modal-container';
        this.modalContainer.className = 'modal-container';
        document.body.appendChild(this.modalContainer);
    }

    /**
     * Show a toast notification
     */
    showToast(options: ToastOptions): void {
        if (!this.toastContainer) return;

        const toastId = `toast-${++this.toastCounter}`;
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast toast-${options.type}`;
        
        // Create toast content
        const icon = this.getIconForType(options.type);
        const actionsHtml = options.actions ? this.createActionsHtml(options.actions, toastId) : '';
        const suggestionsHtml = options.suggestions ? this.createSuggestionsHtml(options.suggestions) : '';

        toast.innerHTML = `
            <div class="toast-header">
                <span class="toast-icon">${icon}</span>
                <h4 class="toast-title">${options.title}</h4>
                <button class="toast-close" data-toast-id="${toastId}" aria-label="Close">
                    <span class="btn-icon">✖️</span>
                </button>
            </div>
            <div class="toast-body">
                <p class="toast-message">${options.message}</p>
                ${suggestionsHtml}
                ${actionsHtml}
            </div>
        `;

        // Add event listeners
        this.setupToastEventListeners(toast, toastId);

        // Add to container and track
        this.toastContainer.appendChild(toast);
        this.activeToasts.add(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('toast-show');
        });

        // Auto-hide if duration specified
        if (options.duration && options.duration > 0) {
            setTimeout(() => {
                this.hideToast(toastId);
            }, options.duration);
        }
    }

    /**
     * Show a confirmation modal
     */
    async showConfirm(options: ConfirmOptions): Promise<boolean> {
        if (!this.modalContainer) return false;

        return new Promise((resolve) => {
            const modalId = `modal-${++this.toastCounter}`;
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal-overlay';

            const icon = options.icon || this.getIconForConfirmStyle(options.confirmStyle || 'primary');
            const confirmText = options.confirmText || 'Confirm';
            const cancelText = options.cancelText || 'Cancel';
            const confirmClass = `btn btn-${options.confirmStyle || 'primary'}`;

            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-header">
                        <span class="modal-icon">${icon}</span>
                        <h3 class="modal-title">${options.title}</h3>
                    </div>
                    <div class="modal-body">
                        <p class="modal-message">${options.message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary modal-cancel" data-modal-id="${modalId}">
                            ${cancelText}
                        </button>
                        <button class="${confirmClass} modal-confirm" data-modal-id="${modalId}">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `;

            // Event listeners for modal actions
            const confirmBtn = modal.querySelector('.modal-confirm') as HTMLElement;
            const cancelBtn = modal.querySelector('.modal-cancel') as HTMLElement;
            const overlay = modal;

            const handleConfirm = () => {
                this.hideModal(modalId);
                resolve(true);
            };

            const handleCancel = () => {
                this.hideModal(modalId);
                resolve(false);
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            
            // Close on overlay click (outside dialog)
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    handleCancel();
                }
            });

            // Keyboard support
            const handleKeydown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    handleCancel();
                } else if (e.key === 'Enter') {
                    handleConfirm();
                }
            };

            document.addEventListener('keydown', handleKeydown);

            // Clean up event listener when modal is removed
            const cleanup = () => {
                document.removeEventListener('keydown', handleKeydown);
            };

            modal.addEventListener('modal-hidden', cleanup, { once: true });

            // Add to container
            if (this.modalContainer) {
                this.modalContainer.appendChild(modal);
            }

            // Animate in
            requestAnimationFrame(() => {
                modal.classList.add('modal-show');
            });
        });
    }

    /**
     * Hide a specific toast
     */
    private hideToast(toastId: string): void {
        const toast = document.getElementById(toastId);
        if (toast && this.activeToasts.has(toast)) {
            toast.classList.add('toast-hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                this.activeToasts.delete(toast);
            }, 300); // Match CSS transition duration
        }
    }

    /**
     * Hide a specific modal
     */
    private hideModal(modalId: string): void {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('modal-hide');
            modal.dispatchEvent(new CustomEvent('modal-hidden'));
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300); // Match CSS transition duration
        }
    }

    /**
     * Set up event listeners for toast interactions
     */
    private setupToastEventListeners(toast: HTMLElement, toastId: string): void {
        // Close button
        const closeBtn = toast.querySelector('.toast-close') as HTMLElement;
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideToast(toastId);
            });
        }

        // Action buttons
        const actionBtns = toast.querySelectorAll('[data-toast-action]');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideToast(toastId);
            });
        });
    }

    /**
     * Get icon for toast type
     */
    private getIconForType(type: string): string {
        const icons = {
            error: '❌',
            warning: '⚠️',
            success: '✅',
            info: 'ℹ️'
        };
        return icons[type as keyof typeof icons] || icons.info;
    }

    /**
     * Get icon for confirmation style
     */
    private getIconForConfirmStyle(style: string): string {
        const icons = {
            danger: '⚠️',
            warning: '⚠️',
            primary: '❓'
        };
        return icons[style as keyof typeof icons] || icons.primary;
    }

    /**
     * Create HTML for action buttons
     */
    private createActionsHtml(actions: ToastOptions['actions'], toastId: string): string {
        if (!actions || actions.length === 0) return '';

        const buttonsHtml = actions.map(action => {
            const style = action.style || 'secondary';
            return `<button class="btn btn-${style} btn-sm" data-toast-action="${toastId}" onclick="(${action.action.toString()})()">
                ${action.label}
            </button>`;
        }).join('');

        return `<div class="toast-actions">${buttonsHtml}</div>`;
    }

    /**
     * Create HTML for suggestions list
     */
    private createSuggestionsHtml(suggestions: string[]): string {
        const listItems = suggestions.map(suggestion => 
            `<li>${suggestion}</li>`
        ).join('');

        return `
            <div class="toast-suggestions">
                <h5>Problems:</h5>
                <ul>${listItems}</ul>
            </div>
        `;
    }

    /**
     * Clear all active toasts
     */
    clearAllToasts(): void {
        this.activeToasts.forEach(toast => {
            if (toast.id) {
                this.hideToast(toast.id);
            }
        });
    }

    /**
     * Clear only error toasts (leave success/info toasts)
     */
    async clearErrorToasts(): Promise<void> {
        const errorToasts = Array.from(this.activeToasts).filter(toast => 
            toast.classList.contains('toast-error')
        );
        
        if (errorToasts.length === 0) {
            return Promise.resolve();
        }

        const hidePromises = errorToasts.map(toast => {
            if (toast.id) {
                return new Promise<void>((resolve) => {
                    // Listen for the animation end
                    const handleAnimationEnd = () => {
                        toast.removeEventListener('transitionend', handleAnimationEnd);
                        // Also remove from DOM to prevent positioning issues
                        if (toast.parentNode) {
                            toast.parentNode.removeChild(toast);
                        }
                        resolve();
                    };
                    toast.addEventListener('transitionend', handleAnimationEnd);
                    this.hideToast(toast.id!);
                });
            }
            return Promise.resolve();
        });

        await Promise.all(hidePromises);
        
        // Small delay to ensure DOM is fully cleared before new toast
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    /**
     * Convenience methods that replace browser defaults
     */

    /**
     * Replace alert() with custom toast
     */
    alert(message: string, title: string = 'Alert'): void {
        this.showToast({
            type: 'info',
            title,
            message,
            duration: 5000
        });
    }

    /**
     * Replace confirm() with custom modal
     */
    async confirm(message: string, title: string = 'Confirm'): Promise<boolean> {
        return this.showConfirm({
            title,
            message
        });
    }

    /**
     * Show error with enhanced formatting
     */
    async showError(title: string, message: string, suggestions?: string[]): Promise<void> {
        // Clear existing error toasts first and wait for animation to complete
        await this.clearErrorToasts();
        
        this.showToast({
            type: 'error',
            title,
            message,
            suggestions,
            duration: 0 // Don't auto-hide errors
        });
    }

    /**
     * Show success message
     */
    showSuccess(message: string, title: string = 'Success'): void {
        this.showToast({
            type: 'success',
            title,
            message,
            duration: 3000
        });
    }

    /**
     * Show warning message
     */
    showWarning(title: string, message: string, suggestions?: string[]): void {
        this.showToast({
            type: 'warning',
            title,
            message,
            suggestions,
            duration: 0 // Don't auto-hide warnings
        });
    }
}

// Export singleton instance
export const modernErrorManager = ModernErrorManager.getInstance();
