/**
 * Interactive Tour Manager for first-time users
 * Provides step-by-step guided tour of application features
 */

export interface TourStep {
    id: string;
    title: string;
    content: string;
    target: string; // CSS selector for element to highlight
    position: 'top' | 'bottom' | 'left' | 'right';
    action?: 'click' | 'type' | 'hover' | 'none';
    actionData?: string; // Data for the action (text to type, etc.)
    beforeStep?: () => void; // Function to run before showing step
    afterStep?: () => void; // Function to run after step completion
}

export class TourManager {
    private currentStep = 0;
    private tourSteps: TourStep[] = [];
    private tourOverlay: HTMLElement | null = null;
    private tourHighlight: HTMLElement | null = null;
    private tourTooltip: HTMLElement | null = null;
    private isActive = false;
    private originalScrollPosition = 0;

    constructor() {
        this.initializeTourSteps();
    }

    private initializeTourSteps(): void {
        this.tourSteps = [
            {
                id: 'welcome',
                title: '🎯 Welcome to Commander Pod Generator!',
                content: 'This interactive tour will guide you through all the features step by step. You can exit at any time by pressing Escape or clicking the ✕ Exit Tour button.',
                target: '.container',
                position: 'bottom',
                action: 'none'
            },
            {
                id: 'ranking-system',
                title: '⚙️ Choose Your Ranking System',
                content: 'First, choose between Power Level (1-10 scale) or Bracket (1,2,3,4,cEDH) system. Power Level gives more granular control, while Brackets are simpler and tournament-friendly.',
                target: 'fieldset:first-of-type',
                position: 'bottom',
                action: 'none'
            },
            {
                id: 'add-players',
                title: '👥 Adding Players',
                content: 'Player names are entered here. The "Add Player" button and keyboard shortcut Ctrl+Enter are available for quickly adding more players when you use the app.',
                target: '.player-row:first-child .player-name',
                position: 'right',
                action: 'type',
                actionData: 'Alice',
                beforeStep: () => this.ensurePlayerRows(1)
            },
            {
                id: 'power-levels',
                title: '⚡ Setting Power Levels',
                content: 'This button opens the power level selector. Individual levels or ranges can be selected, and typing shortcuts like "7-8" are supported for quick range selection.',
                target: '.player-row:first-child .power-selector-btn',
                position: 'left',
                action: 'click',
                beforeStep: () => this.ensurePowerMode()
            },
            {
                id: 'power-selection',
                title: '🎯 Power Level Selection',
                content: 'Multiple power levels can be selected for each player. The quick range buttons (6-7, 7-8, 8-9) make common selections easy. We\'ll now select "7-8" for a medium power deck.',
                target: '.player-row:first-child .power-selector-dropdown',
                position: 'right',
                action: 'none',
                beforeStep: () => {
                    // Ensure dropdown is open
                    const btn = document.querySelector('.player-row:first-child .power-selector-btn') as HTMLElement;
                    if (btn) {
                        btn.click();
                    }
                    // Wait a moment then select the range
                    setTimeout(() => {
                        const rangeBtn = document.querySelector('.player-row:first-child .range-btn[data-range="7-8"]') as HTMLElement;
                        if (rangeBtn) {
                            rangeBtn.click();
                        }
                    }, 200);
                }
            },
            {
                id: 'add-more-players',
                title: '🚀 Quick Player Addition',
                content: 'The "Add 4 Players" button enables bulk addition, and Ctrl+Enter can be pressed repeatedly for individual players. We\'ll add more players for our demonstration.',
                target: '#bulk-add-btn',
                position: 'bottom',
                action: 'click'
            },
            {
                id: 'fill-players',
                title: '📝 Complete Player Information',
                content: 'The remaining players will be filled with names and power levels. The tour will automatically provide example data to demonstrate the features.',
                target: '.player-row:nth-child(2) .player-name',
                position: 'right',
                action: 'none',
                beforeStep: () => this.fillExamplePlayers()
            },
            {
                id: 'groups',
                title: '👫 Creating Groups',
                content: 'This dropdown allows grouping players who want to play together. "Start a New Group" creates a group, then other players can "Join Group" to join them.',
                target: '.player-row:first-child .group-select',
                position: 'left',
                action: 'none'
            },
            {
                id: 'group-demo',
                title: '👥 Group Creation Demo',
                content: 'Now we\'ll create a group! Alice and Henry will be grouped together to demonstrate how the system works with compatible power levels.',
                target: '.player-row:first-child .group-select',
                position: 'left',
                action: 'none',
                beforeStep: () => this.createGroupDemo()
            },
            {
                id: 'tolerance',
                title: '🎚️ Power Level Tolerance',
                content: 'In Power Level mode, tolerance can be adjusted. "No Leniency" requires exact matches, while "Regular" and "Super" leniency allow ±0.5 and ±1.0 differences respectively.',
                target: 'fieldset:nth-of-type(2)',
                position: 'top',
                action: 'none',
                beforeStep: () => this.ensurePowerMode()
            },
            {
                id: 'pod-size-preference',
                title: '📏 Pod Size Preference',
                content: 'Pod size preference determines how pods are organized. "Balanced" allows 3-5 player pods for flexibility, while "Avoid Large Pods" prefers smaller 3-4 player pods for more intimate games.',
                target: 'fieldset:nth-of-type(3)',
                position: 'top',
                action: 'none'
            },
            {
                id: 'generate',
                title: '🎲 Generate Pods',
                content: 'Once all players have names and power levels, this button generates balanced pods. The algorithm creates 3-4 player pods with similar power levels.',
                target: '#generate-pods-btn',
                position: 'top',
                action: 'click'
            },
            {
                id: 'results',
                title: '🏆 Pod Results',
                content: 'Here are the generated pods! Players are grouped by compatible power levels. Players can be moved between pods using drag and drop if needed.',
                target: '#output-section',
                position: 'top',
                action: 'none'
            },
            {
                id: 'unassigned-players',
                title: '⚠️ Unassigned Players',
                content: 'If players can\'t be balanced into pods (due to power level mismatches or odd numbers), they\'ll appear as "unassigned." They can be manually dragged into existing pods.',
                target: '#output-section',
                position: 'top',
                action: 'none'
            },
            {
                id: 'drag-drop',
                title: '🖱️ Drag and Drop',
                content: 'Pods can be reorganized by dragging players between them. This is useful for manual adjustments or accommodating player preferences after initial pod generation.',
                target: '#output-section',
                position: 'top',
                action: 'none'
            },
            {
                id: 'display-mode',
                title: '📺 Display Mode',
                content: 'This button enters Display Mode - a clean, full-screen view perfect for showing pods to players on a projector or large screen.',
                target: '#display-mode-btn',
                position: 'bottom',
                action: 'click'
            },
            {
                id: 'display-features',
                title: '🎨 Display Mode Features',
                content: 'In Display Mode, pod titles show power level ranges, player names are clearly displayed, and automatic font scaling ensures readability. All editing controls are hidden for a clean presentation view.',
                target: '.display-mode-container',
                position: 'top',
                action: 'none'
            },
            {
                id: 'exit-display',
                title: '🚪 Exit Display Mode',
                content: 'This button exits Display Mode and returns to the main interface where changes can be made.',
                target: '#exit-display-btn',
                position: 'bottom',
                action: 'click'
            },
            {
                id: 'reset',
                title: '🔄 Reset and Undo',
                content: 'The Reset All button clears everything. It includes a smart confirmation system and an undo feature that lasts 30 seconds - so experimentation is safe!',
                target: '#reset-all-btn',
                position: 'top',
                action: 'none'
            },
            {
                id: 'keyboard-shortcuts',
                title: '⌨️ Keyboard Shortcuts',
                content: 'Pro tip: Ctrl+Enter adds players quickly, power ranges like "7-8" can be typed in selector buttons, and Escape closes any dropdown. The help contains the full list of shortcuts!',
                target: '#help-btn',
                position: 'left',
                action: 'none'
            },
            {
                id: 'complete',
                title: '🎉 Tour Complete!',
                content: 'Congratulations! You now know all the main features. The Help button contains detailed information about keyboard shortcuts and advanced features. Happy pod organizing!',
                target: '#help-btn',
                position: 'left',
                action: 'none'
            }
        ];
    }

    public async startTour(): Promise<void> {
        if (this.isActive) return;

        this.isActive = true;
        this.currentStep = 0;
        this.originalScrollPosition = window.scrollY;

        this.createTourUI();
        await this.showStep(0);
        this.setupTourEventListeners();
    }

    public async endTour(): Promise<void> {
        if (!this.isActive) return;

        this.isActive = false;

        // Add ending classes for smooth fade out
        if (this.tourOverlay) this.tourOverlay.classList.add('tour-ending');
        if (this.tourHighlight) this.tourHighlight.classList.add('tour-ending');
        if (this.tourTooltip) this.tourTooltip.classList.add('tour-ending');
        const progress = document.querySelector('.tour-progress');
        if (progress) progress.classList.add('tour-ending');

        // Remove event listeners immediately
        this.removeEventListeners();

        // Ensure we exit display mode if we're still in it and wait for it to complete
        if (document.body.classList.contains('display-mode')) {
            const exitDisplayBtn = document.getElementById('exit-display-btn');
            if (exitDisplayBtn) {
                exitDisplayBtn.click();
                // Wait for display mode to actually exit
                await this.waitForCondition(() => !document.body.classList.contains('display-mode'), 2000);
            }
        }

        // Force remove all tour elements immediately (don't wait for animation)
        setTimeout(() => {
            this.removeTourUI();
            this.cleanupRemainingElements();
        }, 50); // Very short delay to allow any pending DOM updates

        // Reset the page to clean state immediately after tour completion
        const resetButton = document.getElementById('reset-all-btn') as HTMLButtonElement;
        if (resetButton) {
            // Temporarily override the confirmation to auto-proceed
            const originalConfirm = window.confirm;
            window.confirm = () => true;
            
            // Click reset immediately
            resetButton.click();
            
            // Restore original confirm after a short delay
            setTimeout(() => {
                window.confirm = originalConfirm;
            }, 100);
        }

        // Restore original scroll position
        window.scrollTo(0, this.originalScrollPosition);
    }

    public async forceEndTour(): Promise<void> {
        this.isActive = false;

        // Ensure we exit display mode if we're still in it and wait for it to complete
        if (document.body.classList.contains('display-mode')) {
            const exitDisplayBtn = document.getElementById('exit-display-btn');
            if (exitDisplayBtn) {
                exitDisplayBtn.click();
                // Wait for display mode to actually exit
                await this.waitForCondition(() => !document.body.classList.contains('display-mode'), 2000);
            }
        }

        // Immediately remove all tour elements without animations
        this.removeTourUI();
        this.cleanupRemainingElements();

        // Reset the page to clean state immediately
        const resetButton = document.getElementById('reset-all-btn') as HTMLButtonElement;
        if (resetButton) {
            // Temporarily override the confirmation to auto-proceed
            const originalConfirm = window.confirm;
            window.confirm = () => true;
            
            // Click reset immediately
            resetButton.click();
            
            // Restore original confirm after a short delay
            setTimeout(() => {
                window.confirm = originalConfirm;
            }, 100);
        }

        // Restore original scroll position
        window.scrollTo(0, this.originalScrollPosition);
    }

    private createTourUI(): void {
        // Create overlay
        this.tourOverlay = document.createElement('div');
        this.tourOverlay.className = 'tour-overlay';
        this.tourOverlay.innerHTML = `
            <style>
                .tour-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.7);
                    z-index: 9998;
                    pointer-events: none;
                    opacity: 1;
                    transition: opacity 0.1s ease;
                }
                
                .tour-overlay.tour-ending {
                    opacity: 0;
                    pointer-events: none;
                }
                
                .tour-highlight {
                    position: absolute;
                    border: 5px solid #4CAF50;
                    border-radius: 8px;
                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.85), 
                               0 0 40px rgba(76, 175, 80, 1.2),
                               inset 0 0 0 2px rgba(255, 255, 255, 0.3);
                    z-index: 9999;
                    pointer-events: none;
                    transition: all 0.1s ease;
                    opacity: 1;
                }
                
                .tour-highlight.tour-ending {
                    opacity: 0;
                    pointer-events: none;
                }
                
                .tour-tooltip {
                    position: absolute;
                    background: linear-gradient(135deg, #2a2a2a, #3a3a3a);
                    color: white;
                    padding: 20px;
                    border-radius: 12px;
                    max-width: 350px;
                    z-index: 10000;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    border: 1px solid #4CAF50;
                    pointer-events: auto;
                    opacity: 1;
                    transition: opacity 0.15s ease;
                }
                
                .tour-tooltip.tour-ending {
                    opacity: 0;
                    pointer-events: none;
                }
                
                .tour-tooltip h3 {
                    margin: 0 0 10px 0;
                    color: #4CAF50;
                    font-size: 1.2rem;
                }
                
                .tour-tooltip p {
                    margin: 0 0 15px 0;
                    line-height: 1.5;
                }
                
                .tour-tooltip-buttons {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }
                
                .tour-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    transition: all 0.2s ease;
                }
                
                .tour-btn-primary {
                    background: #4CAF50;
                    color: white;
                }
                
                .tour-btn-primary:hover {
                    background: #45a049;
                }
                
                .tour-btn-secondary {
                    background: #666;
                    color: white;
                }
                
                .tour-btn-secondary:hover {
                    background: #777;
                }
                
                .tour-progress {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: rgba(42, 42, 42, 0.9);
                    color: white;
                    padding: 10px 15px;
                    border-radius: 20px;
                    font-size: 0.9rem;
                    z-index: 10001;
                    border: 1px solid #4CAF50;
                    opacity: 1;
                    transition: opacity 0.1s ease;
                    pointer-events: none;
                }
                
                .tour-progress.tour-ending {
                    opacity: 0;
                    pointer-events: none;
                }
            </style>
        `;

        // Create highlight element
        this.tourHighlight = document.createElement('div');
        this.tourHighlight.className = 'tour-highlight';

        // Create tooltip element
        this.tourTooltip = document.createElement('div');
        this.tourTooltip.className = 'tour-tooltip';

        document.body.appendChild(this.tourOverlay);
        document.body.appendChild(this.tourHighlight);
        document.body.appendChild(this.tourTooltip);
    }

    private async showStep(stepIndex: number): Promise<void> {
        if (stepIndex >= this.tourSteps.length) {
            await this.endTour();
            return;
        }

        const step = this.tourSteps[stepIndex];
        this.currentStep = stepIndex;

        // Run before step function if it exists
        if (step.beforeStep) {
            step.beforeStep();
        }

        // Wait a minimal moment for any DOM changes from beforeStep
        setTimeout(() => {
            this.positionHighlight(step);
            this.showTooltip(step);
            this.updateProgress();
        }, 20);
    }

    private positionHighlight(step: TourStep): void {
        const targetElement = document.querySelector(step.target) as HTMLElement;
        if (!targetElement || !this.tourHighlight) return;

        // For dropdown targets, ensure they're visible first
        if (step.target.includes('dropdown')) {
            const btn = targetElement.closest('.player-row')?.querySelector('.power-selector-btn, .bracket-selector-btn') as HTMLElement;
            if (btn && targetElement.style.display === 'none') {
                btn.click();
                // Wait for dropdown to appear
                setTimeout(() => this.positionHighlight(step), 100);
                return;
            }
        }

        const rect = targetElement.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        this.tourHighlight.style.left = `${rect.left + scrollX - 5}px`;
        this.tourHighlight.style.top = `${rect.top + scrollY - 5}px`;
        this.tourHighlight.style.width = `${rect.width + 10}px`;
        this.tourHighlight.style.height = `${rect.height + 10}px`;

        // Scroll element into view if needed
        targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
    }

    private showTooltip(step: TourStep): void {
        if (!this.tourTooltip) return;

        const isLastStep = this.currentStep === this.tourSteps.length - 1;
        const nextButtonText = isLastStep ? 'Finish Tour' : 'Next';

        this.tourTooltip.innerHTML = `
            <h3>${step.title}</h3>
            <p>${step.content}</p>
            <div class="tour-tooltip-buttons">
                <button class="tour-btn tour-btn-secondary" id="tour-exit-btn">
                    ✕ Exit Tour
                </button>
                ${this.currentStep > 0 ? '<button class="tour-btn tour-btn-secondary" id="tour-prev-btn">Previous</button>' : ''}
                <button class="tour-btn tour-btn-primary" id="tour-next-btn">
                    ${nextButtonText}
                </button>
            </div>
        `;

        // Add event listeners to the buttons
        const exitBtn = this.tourTooltip.querySelector('#tour-exit-btn');
        const prevBtn = this.tourTooltip.querySelector('#tour-prev-btn');
        const nextBtn = this.tourTooltip.querySelector('#tour-next-btn');

        if (exitBtn) {
            exitBtn.addEventListener('click', () => this.endTour().catch(console.error));
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousStep().catch(console.error));
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep().catch(console.error));
        }

        this.positionTooltip(step);
    }

    private positionTooltip(step: TourStep): void {
        const targetElement = document.querySelector(step.target) as HTMLElement;
        if (!targetElement || !this.tourTooltip) return;

        const rect = targetElement.getBoundingClientRect();
        const tooltipRect = this.tourTooltip.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        let left: number, top: number;

        switch (step.position) {
            case 'top':
                left = rect.left + scrollX + (rect.width / 2) - (tooltipRect.width / 2);
                top = rect.top + scrollY - tooltipRect.height - 15;
                break;
            case 'bottom':
                left = rect.left + scrollX + (rect.width / 2) - (tooltipRect.width / 2);
                top = rect.bottom + scrollY + 15;
                break;
            case 'left':
                left = rect.left + scrollX - tooltipRect.width - 15;
                top = rect.top + scrollY + (rect.height / 2) - (tooltipRect.height / 2);
                break;
            case 'right':
                left = rect.right + scrollX + 15;
                top = rect.top + scrollY + (rect.height / 2) - (tooltipRect.height / 2);
                break;
        }

        // Ensure tooltip stays within viewport
        const maxLeft = window.innerWidth - tooltipRect.width - 20;
        const maxTop = window.innerHeight - tooltipRect.height - 20;

        left = Math.max(20, Math.min(left, maxLeft));
        top = Math.max(20, Math.min(top, maxTop));

        this.tourTooltip.style.left = `${left}px`;
        this.tourTooltip.style.top = `${top}px`;
    }

    private updateProgress(): void {
        // Remove any existing progress elements first
        const existingProgress = document.querySelectorAll('.tour-progress');
        existingProgress.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });

        if (!this.isActive) return;

        const progress = document.createElement('div');
        progress.className = 'tour-progress';
        progress.textContent = `Step ${this.currentStep + 1} of ${this.tourSteps.length}`;
        document.body.appendChild(progress);
    }

    public async nextStep(): Promise<void> {
        // If we're at the last step, end the tour
        if (this.currentStep >= this.tourSteps.length - 1) {
            await this.endTour();
            return;
        }

        const step = this.tourSteps[this.currentStep];

        // Perform step action if specified
        if (step.action && step.action !== 'none') {
            this.performStepAction(step);
        }

        // Run after step function if it exists
        if (step.afterStep) {
            step.afterStep();
        }

        // Wait for the action to complete properly, then move to next step
        try {
            await this.waitForActionCompletion(step);
            await this.showStep(this.currentStep + 1);
        } catch (error) {
            console.warn('Tour step completion timed out, proceeding anyway:', error);
            // Proceed with tour even if condition wasn't met
            await this.showStep(this.currentStep + 1);
        }
    }

    private async waitForActionCompletion(step: TourStep): Promise<void> {
        // No action = immediate transition
        if (!step.action || step.action === 'none') {
            return Promise.resolve();
        }

        // Wait for specific completion states based on the action
        switch (step.id) {
            case 'display-mode':
                // Wait for display mode to be active
                return this.waitForCondition(() => document.body.classList.contains('display-mode'), 3000);
            
            case 'exit-display':
                // Wait for display mode to be inactive
                return this.waitForCondition(() => !document.body.classList.contains('display-mode'), 3000);
            
            case 'generate':
                // Wait for pods to be generated (check for pod containers)
                return this.waitForCondition(() => {
                    const pods = document.querySelectorAll('.pod');
                    return pods.length > 0;
                }, 5000);
            
            case 'reset':
                // Wait for reset to complete (check that player list is cleared)
                return this.waitForCondition(() => {
                    const playerRows = document.querySelectorAll('.player-row');
                    return playerRows.length <= 1; // Only the add button row should remain
                }, 3000);
            
            case 'add-player':
                // Wait for new player row to appear
                return this.waitForCondition(() => {
                    const playerRows = document.querySelectorAll('.player-row');
                    return playerRows.length > 1;
                }, 2000);
            
            case 'type-text':
                // Wait a moment for typing animation to complete
                return new Promise(resolve => setTimeout(resolve, 100));
            
            default:
                // For other actions, wait a minimal amount for DOM to stabilize
                return new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    private waitForCondition(condition: () => boolean, timeout: number = 3000): Promise<void> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const check = () => {
                if (condition()) {
                    resolve();
                    return;
                }
                
                if (Date.now() - startTime >= timeout) {
                    reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
                    return;
                }
                
                // Check again in a short interval
                setTimeout(check, 50);
            };
            
            check();
        });
    }

    public async previousStep(): Promise<void> {
        if (this.currentStep > 0) {
            await this.showStep(this.currentStep - 1);
        }
    }

    private performStepAction(step: TourStep): void {
        const targetElement = document.querySelector(step.target) as HTMLElement;
        if (!targetElement) return;

        switch (step.action) {
            case 'click':
                targetElement.click();
                break;
            case 'type':
                if (step.actionData && targetElement instanceof HTMLInputElement) {
                    targetElement.value = step.actionData;
                    targetElement.dispatchEvent(new Event('input', { bubbles: true }));
                }
                break;
            case 'hover':
                const hoverEvent = new MouseEvent('mouseenter', { bubbles: true });
                targetElement.dispatchEvent(hoverEvent);
                break;
        }
    }

    private setupTourEventListeners(): void {
        document.addEventListener('keydown', this.handleTourKeydown);

        // Make tour manager globally accessible for button clicks
        (window as any).tourManager = this;
    }

    private removeEventListeners(): void {
        document.removeEventListener('keydown', this.handleTourKeydown);
        delete (window as any).tourManager;
    }

    private handleTourKeydown = (e: KeyboardEvent): void => {
        if (!this.isActive) return;

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                e.stopPropagation();
                this.endTour().catch(console.error);
                break;
            case 'ArrowRight':
            case 'Enter':
                e.preventDefault();
                e.stopPropagation();
                if (this.currentStep >= this.tourSteps.length - 1) {
                    this.endTour().catch(console.error);
                } else {
                    this.nextStep().catch(console.error);
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                e.stopPropagation();
                this.previousStep().catch(console.error);
                break;
        }
    };

    private removeTourUI(): void {
        // Remove main tour elements
        [this.tourOverlay, this.tourHighlight, this.tourTooltip].forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });

        // Remove all progress elements (there might be multiple)
        const progressElements = document.querySelectorAll('.tour-progress');
        progressElements.forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });

        this.tourOverlay = null;
        this.tourHighlight = null;
        this.tourTooltip = null;
    }

    private cleanupRemainingElements(): void {
        // Remove any remaining tour elements that might have been left behind
        const remainingElements = document.querySelectorAll('.tour-overlay, .tour-highlight, .tour-tooltip, .tour-progress');
        remainingElements.forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    }

    // Helper methods for tour steps
    private ensurePlayerRows(count: number): void {
        const currentRows = document.querySelectorAll('.player-row').length;
        if (currentRows < count) {
            const addButton = document.getElementById('add-player-btn') as HTMLButtonElement;
            for (let i = currentRows; i < count; i++) {
                addButton?.click();
            }
        }
    }

    private ensurePowerMode(): void {
        const powerRadio = document.getElementById('power-level-radio') as HTMLInputElement;
        if (powerRadio && !powerRadio.checked) {
            powerRadio.click();
        }
    }

    private fillExamplePlayers(): void {
        // Simplified data: players with compatible power levels for grouping demo
        const playerData = [
            { name: 'Henry', power: '8' },    // Henry gets power 8 to match Alice's range
            { name: 'Charlie', power: '7' },
            { name: 'Diana', power: '7' },
            { name: 'Bob', power: '7' },
            { name: 'Eve', power: '7' },
            { name: 'Frank', power: '8' },
            { name: 'Grace', power: '8' },
            { name: 'Ivy', power: '8' }
        ];

        const playerRows = document.querySelectorAll('.player-row');

        // Fill ALL player rows, not just a few
        for (let i = 1; i < playerRows.length; i++) { // Start from 1 since Alice is already filled
            const row = playerRows[i];
            const nameInput = row.querySelector('.player-name') as HTMLInputElement;
            const powerBtn = row.querySelector('.power-selector-btn') as HTMLButtonElement;

            // Use data if available, otherwise skip
            const dataIndex = i - 1;
            if (dataIndex >= playerData.length) break; // Only fill as many as we have data for

            const playerInfo = playerData[dataIndex];

            if (nameInput && nameInput.value.trim() === '') {
                nameInput.value = playerInfo.name;
                nameInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            if (powerBtn) {
                // Check if power is already selected
                const hasSelection = row.querySelector('.power-checkbox input:checked');
                if (!hasSelection) {
                    // Open dropdown and select power level
                    powerBtn.click();
                    setTimeout(() => {
                        const checkbox = row.querySelector(`.power-checkbox input[value="${playerInfo.power}"]`) as HTMLInputElement;
                        if (checkbox) {
                            checkbox.checked = true;
                            checkbox.dispatchEvent(new Event('change', { bubbles: true }));

                            // Close the dropdown after selection
                            setTimeout(() => {
                                powerBtn.click();
                            }, 50);
                        }
                    }, 100);
                }
            }
        }
    }

    private createGroupDemo(): void {
        // Create a group with Alice and Henry (both have compatible power levels)
        const firstRow = document.querySelector('.player-row:first-child') as HTMLElement;
        const secondRow = document.querySelector('.player-row:nth-child(2)') as HTMLElement;

        if (firstRow && secondRow) {
            // Set Alice as group starter
            const aliceGroupSelect = firstRow.querySelector('.group-select') as HTMLSelectElement;
            if (aliceGroupSelect) {
                // Find "Start a New Group" option and select it
                const startGroupOption = Array.from(aliceGroupSelect.options).find(option =>
                    option.value === 'new-group');
                if (startGroupOption) {
                    aliceGroupSelect.value = 'new-group';
                    // Dispatch change event to trigger group creation
                    const changeEvent = new Event('change', { bubbles: true });
                    aliceGroupSelect.dispatchEvent(changeEvent);

                    // Wait for the group to be created and options to be updated, then add Henry
                    setTimeout(() => {
                        // Get the group ID that was created for Alice
                        const aliceGroupId = aliceGroupSelect.dataset.createdGroupId;
                        
                        if (aliceGroupId) {
                            const henryGroupSelect = secondRow.querySelector('.group-select') as HTMLSelectElement;
                            if (henryGroupSelect) {
                                // Make sure Henry's dropdown has the latest options by checking for Alice's group
                                const aliceGroupOption = Array.from(henryGroupSelect.options).find(option =>
                                    option.value === aliceGroupId);
                                
                                if (aliceGroupOption) {
                                    // Set Henry to join Alice's group using the group ID
                                    henryGroupSelect.value = aliceGroupId;
                                    // Dispatch change event to join the group
                                    const henryChangeEvent = new Event('change', { bubbles: true });
                                    henryGroupSelect.dispatchEvent(henryChangeEvent);
                                } else {
                                    // If the option isn't available yet, try to find group-1 (which should be Alice's group)
                                    const group1Option = Array.from(henryGroupSelect.options).find(option =>
                                        option.value === 'group-1');
                                    if (group1Option) {
                                        henryGroupSelect.value = 'group-1';
                                        const henryChangeEvent = new Event('change', { bubbles: true });
                                        henryGroupSelect.dispatchEvent(henryChangeEvent);
                                    }
                                }
                            }
                        }
                    }, 800); // Further increased timeout to ensure all updates complete
                }
            }
        }
    }
}
