import { UIManager } from './ui-manager.js';

document.addEventListener('DOMContentLoaded', () => {
    const uiManager = new UIManager();
    // Initialize the application with default player rows
    uiManager.resetAll();
});
