import { Pod } from './types.js';

export class DisplayModeManager {
    private isDisplayMode = false;
    private handleKeyDown: ((e: KeyboardEvent) => void) | null = null;

    enterDisplayMode(currentPods: Pod[]): void {
        if (currentPods.length === 0) return;

        this.isDisplayMode = true;
        document.body.classList.add('display-mode');

        // Calculate grid size using ceil(sqrt(pods))
        const gridSize = Math.ceil(Math.sqrt(currentPods.length));

        // Create fullscreen container that replaces everything
        const displayContainer = document.createElement('div');
        displayContainer.className = 'display-mode-container';
        displayContainer.style.position = 'fixed';
        displayContainer.style.top = '0';
        displayContainer.style.left = '0';
        displayContainer.style.width = '100vw';
        displayContainer.style.height = '100vh';
        displayContainer.style.background = '#1a1a1a';
        displayContainer.style.zIndex = '1000';
        displayContainer.style.padding = '20px';
        displayContainer.style.boxSizing = 'border-box';
        displayContainer.style.overflow = 'hidden';

        displayContainer.innerHTML = `
            <div class="display-mode-controls">
                <button id="exit-display-btn">Exit Display Mode</button>
            </div>
            <h1 style="text-align: center; margin: 0 0 20px 0; font-size: 2.5rem; color: white;">MTG Commander Pods</h1>
            <div id="display-output" style="flex-grow: 1; height: calc(100vh - 140px);"></div>
        `;

        // Hide the original container completely
        const originalContainer = document.querySelector('.container') as HTMLElement;
        if (originalContainer) {
            originalContainer.style.display = 'none';
        }

        document.body.appendChild(displayContainer);

        // Render pods in grid layout
        const displayOutput = displayContainer.querySelector('#display-output')!;
        const podsGrid = document.createElement('div');
        podsGrid.style.display = 'grid';
        podsGrid.style.gap = '20px';
        podsGrid.style.height = '100%';
        podsGrid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        podsGrid.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

        currentPods.forEach((pod, index) => {
            const podElement = document.createElement('div');
            podElement.style.display = 'flex';
            podElement.style.flexDirection = 'column';
            podElement.style.background = '#2a2a2a';
            podElement.style.border = '2px solid #4a4a4a';
            podElement.style.borderRadius = '8px';
            podElement.style.padding = '15px';
            podElement.style.boxSizing = 'border-box';
            podElement.style.minHeight = '0';
            podElement.classList.add(`pod-color-${index % 10}`);

            const title = document.createElement('h3');
            title.textContent = `Pod ${index + 1} (Power: ${pod.power})`;
            title.style.fontSize = '1.6rem';
            title.style.margin = '0 0 15px 0';
            title.style.textAlign = 'center';
            title.style.color = '#ffffff';
            title.style.fontWeight = 'bold';
            title.style.flexShrink = '0';
            podElement.appendChild(title);

            const list = document.createElement('ul');
            list.style.flexGrow = '1';
            list.style.display = 'flex';
            list.style.flexDirection = 'column';
            list.style.justifyContent = 'flex-start';
            list.style.fontSize = '1.1rem';
            list.style.lineHeight = '1.4';
            list.style.margin = '0';
            list.style.padding = '0';
            list.style.listStyle = 'none';
            list.style.overflowY = 'auto';

            pod.players.forEach(item => {
                if ('players' in item) { // It's a Group
                    const groupItem = document.createElement('li');
                    groupItem.style.marginBottom = '6px';
                    groupItem.style.color = '#ffffff';
                    groupItem.style.padding = '4px 0';
                    groupItem.innerHTML = `<strong style="color: var(--accent-color);">Group ${item.id.split('-')[1]} (Avg Power: ${item.averagePower}):</strong>`;
                    const subList = document.createElement('ul');
                    subList.style.margin = '0';
                    subList.style.padding = '0 0 0 20px';
                    subList.style.listStyle = 'none';
                    item.players.forEach(p => {
                        const subItem = document.createElement('li');
                        subItem.textContent = `${p.name} (P: ${p.powerRange})`;
                        subItem.style.marginBottom = '2px';
                        subItem.style.color = '#cccccc';
                        subList.appendChild(subItem);
                    });
                    groupItem.appendChild(subList);
                    list.appendChild(groupItem);
                } else { // It's a Player
                    const playerItem = document.createElement('li');
                    playerItem.textContent = `${item.name} (P: ${item.powerRange})`;
                    playerItem.style.marginBottom = '6px';
                    playerItem.style.color = '#ffffff';
                    playerItem.style.padding = '4px 0';
                    list.appendChild(playerItem);
                }
            });
            podElement.appendChild(list);
            podsGrid.appendChild(podElement);
        });

        displayOutput.appendChild(podsGrid);

        // Add exit button functionality
        const exitBtn = displayContainer.querySelector('#exit-display-btn')!;
        exitBtn.addEventListener('click', () => this.exitDisplayMode());

        // Add ESC key support
        this.handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.isDisplayMode) {
                this.exitDisplayMode();
            }
        };
        document.addEventListener('keydown', this.handleKeyDown);
    }

    exitDisplayMode(): void {
        this.isDisplayMode = false;
        document.body.classList.remove('display-mode');

        // Restore the original container
        const originalContainer = document.querySelector('.container') as HTMLElement;
        if (originalContainer) {
            originalContainer.style.display = '';
        }

        // Remove display mode container
        const displayContainer = document.querySelector('.display-mode-container');
        if (displayContainer) {
            displayContainer.remove();
        }

        // Remove ESC key listener if it exists
        if (this.handleKeyDown) {
            document.removeEventListener('keydown', this.handleKeyDown);
            this.handleKeyDown = null;
        }
    }

    getIsDisplayMode(): boolean {
        return this.isDisplayMode;
    }
}
