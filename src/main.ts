import { UIManager } from './ui-manager.js';

/**
 * Dynamically generates CSS rules for group colors
 * Uses randomized distribution with good visual separation
 */
function generateGroupColorCSS(): void {
    const totalGroups = 50;

    // Generate a shuffled array of hue values for better visual variety
    // Use larger steps and random starting point for better color separation
    const hueStep = 360 / totalGroups; // 7.2 degrees per group
    const randomOffset = Math.floor(Math.random() * 360); // Random starting point
    const minSpacing = 25; // Minimum degrees between adjacent colors

    // Generate hue values with good separation
    const hues: number[] = [];
    for (let i = 0; i < totalGroups; i++) {
        // Use golden ratio for better distribution
        const goldenRatio = 137.5; // degrees
        const hue = (randomOffset + i * goldenRatio) % 360;
        hues.push(Math.round(hue));
    }

    let css = '';

    for (let i = 1; i <= totalGroups; i++) {
        const hue = hues[i - 1];
        const saturation = 70 + Math.floor(Math.random() * 20); // 70-90% for variety
        const borderLightness = 50;
        const backgroundLightness = 28 + Math.floor(Math.random() * 8); // 28-36% for variety

        // CSS for dropdown selection appearance
        css += `
.player-row .group-select.group-${i} {
    border-color: hsl(${hue}, ${saturation}%, ${borderLightness}%) !important;
    background-color: hsl(${hue}, ${saturation}%, ${backgroundLightness}%) !important;
}`;

        // CSS for dropdown option appearance  
        css += `
.group-select option[value="group-${i}"] {
    background-color: hsl(${hue}, ${saturation}%, ${backgroundLightness}%);
}`;
    }

    // Create and inject the style element
    const styleElement = document.createElement('style');
    styleElement.id = 'dynamic-group-colors';
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
}

document.addEventListener('DOMContentLoaded', () => {
    // Generate group color CSS first
    generateGroupColorCSS();

    const uiManager = new UIManager();
    // Initialize the application with default player rows
    uiManager.resetAll();
});
