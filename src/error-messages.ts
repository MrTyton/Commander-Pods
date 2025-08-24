/**
 * Enhanced error messages with contextual solutions
 * Provides specific guidance to help users resolve issues
 */

import { modernErrorManager } from './modern-error-manager.js';

// Error codes for compression
enum ErrorCode {
    PLAYER_NAME_REQUIRED = 'E001',
    PLAYER_NAME_DUPLICATE = 'E002',
    POWER_LEVEL_REQUIRED = 'E003',
    BRACKET_LEVEL_REQUIRED = 'E004',
    INSUFFICIENT_PLAYERS = 'E005',
    GENERATION_FAILED = 'E006',
    DISPLAY_MODE_FAILED = 'E007',
    INITIALIZATION_FAILED = 'E008',
    VALIDATION_FAILED = 'E009',
    INCOMPATIBLE_POWER_LEVELS = 'E010',
    INCOMPATIBLE_BRACKETS = 'E011',
    GROUP_CONFLICTS = 'E012'
}

// Enhanced error message templates with context
const ERROR_TEMPLATES: Record<string, { title: string; message: string; suggestions: string[] }> = {
    [ErrorCode.PLAYER_NAME_REQUIRED]: {
        title: 'Player Name Required',
        message: 'All players must have a name before generating pods.',
        suggestions: ['Fill in the empty name field(s) highlighted in red', 'Use unique names for each player']
    },
    [ErrorCode.PLAYER_NAME_DUPLICATE]: {
        title: 'Duplicate Player Names',
        message: 'Multiple players have the same name.',
        suggestions: ['Change one of the highlighted duplicate names', 'Each player must have a unique name']
    },
    [ErrorCode.POWER_LEVEL_REQUIRED]: {
        title: 'Power Level Selection Required',
        message: 'Each player must have at least one power level selected.',
        suggestions: ['Click the power level button for highlighted players', 'Use keyboard shortcuts: 7, 7-9, 6.5-8', 'Check at least one power level for each player']
    },
    [ErrorCode.BRACKET_LEVEL_REQUIRED]: {
        title: 'Bracket Selection Required',
        message: 'Each player must have at least one bracket selected.',
        suggestions: ['Click the bracket button for highlighted players', 'Check at least one bracket level for each player', 'Switch to Power Level mode if preferred']
    },
    [ErrorCode.INSUFFICIENT_PLAYERS]: {
        title: 'Not Enough Players',
        message: 'You need at least 3 players to form a pod.',
        suggestions: ['Add more players using the "Add Player" button', 'Use "Add 4 Players" for quick setup', 'Remove unused empty player rows']
    },
    [ErrorCode.VALIDATION_FAILED]: {
        title: 'Validation Errors Found',
        message: 'Please fix the highlighted errors before generating pods.',
        suggestions: ['Check red highlighted fields for missing information', 'Ensure all names are unique', 'Verify power levels or brackets are selected']
    },
    [ErrorCode.INCOMPATIBLE_POWER_LEVELS]: {
        title: 'Incompatible Power Levels',
        message: 'Some players have power levels too far apart to form balanced pods.',
        suggestions: ['Increase the leniency setting to allow wider power ranges', 'Adjust player power levels to be closer together', 'Consider grouping players manually to keep them together']
    },
    [ErrorCode.INCOMPATIBLE_BRACKETS]: {
        title: 'Incompatible Bracket Levels',
        message: 'Some players have brackets with no overlap for balanced pods.',
        suggestions: ['Select additional brackets for flexibility', 'Group incompatible players manually', 'Adjust bracket selections to have some overlap']
    },
    [ErrorCode.GROUP_CONFLICTS]: {
        title: 'Group Configuration Issues',
        message: 'Some groups have internal conflicts preventing pod assignment.',
        suggestions: ['Check grouped players have compatible power/bracket levels', 'Consider splitting problematic groups', 'Adjust group member selections for better compatibility']
    },
    [ErrorCode.GENERATION_FAILED]: {
        title: 'Pod Generation Failed',
        message: 'Unable to create balanced pods with current settings.',
        suggestions: ['Try enabling leniency for more flexible matching', 'Adjust player power levels or brackets', 'Reduce group sizes or ungroup some players']
    },
    [ErrorCode.DISPLAY_MODE_FAILED]: {
        title: 'Display Mode Error',
        message: 'Unable to switch to display mode.',
        suggestions: ['Generate pods first before using display mode', 'Refresh the page if issues persist']
    },
    [ErrorCode.INITIALIZATION_FAILED]: {
        title: 'Initialization Error',
        message: 'Application failed to start properly.',
        suggestions: ['Refresh the page', 'Clear browser cache', 'Check browser console for details']
    }
};

/**
 * Enhanced error message utility with contextual solutions
 */
export class ErrorMessages {
    /**
     * Get enhanced error information
     */
    static get(code: ErrorCode): { title: string; message: string; suggestions: string[] } {
        return ERROR_TEMPLATES[code] || {
            title: 'Unknown Error',
            message: 'An unexpected error occurred.',
            suggestions: ['Try refreshing the page', 'Check browser console for details']
        };
    }

    /**
     * Get simple error message (for backward compatibility)
     */
    static getSimple(code: ErrorCode, details?: string): string {
        const errorInfo = this.get(code);
        const message = details ? `${errorInfo.message}: ${details}` : errorInfo.message;
        return message;
    }

    /**
     * Common error codes as constants
     */
    static readonly PLAYER_NAME_REQUIRED = ErrorCode.PLAYER_NAME_REQUIRED;
    static readonly PLAYER_NAME_DUPLICATE = ErrorCode.PLAYER_NAME_DUPLICATE;
    static readonly POWER_LEVEL_REQUIRED = ErrorCode.POWER_LEVEL_REQUIRED;
    static readonly BRACKET_LEVEL_REQUIRED = ErrorCode.BRACKET_LEVEL_REQUIRED;
    static readonly INSUFFICIENT_PLAYERS = ErrorCode.INSUFFICIENT_PLAYERS;
    static readonly GENERATION_FAILED = ErrorCode.GENERATION_FAILED;
    static readonly DISPLAY_MODE_FAILED = ErrorCode.DISPLAY_MODE_FAILED;
    static readonly INITIALIZATION_FAILED = ErrorCode.INITIALIZATION_FAILED;
    static readonly VALIDATION_FAILED = ErrorCode.VALIDATION_FAILED;
    static readonly INCOMPATIBLE_POWER_LEVELS = ErrorCode.INCOMPATIBLE_POWER_LEVELS;
    static readonly INCOMPATIBLE_BRACKETS = ErrorCode.INCOMPATIBLE_BRACKETS;
    static readonly GROUP_CONFLICTS = ErrorCode.GROUP_CONFLICTS;

    /**
     * Show enhanced error dialog with contextual solutions
     */
    static showEnhanced(code: ErrorCode, details?: string): void {
        const errorInfo = this.get(code);
        console.error(`[${code}] ${errorInfo.title}: ${errorInfo.message}`);

        // Show enhanced error using modern error manager
        modernErrorManager.showError(
            errorInfo.title,
            details ? `${errorInfo.message}\n\nDetails: ${details}` : errorInfo.message,
            errorInfo.suggestions
        );
    }

    /**
     * Show error message with improved UX (backward compatibility)
     */
    static show(code: ErrorCode, details?: string): void {
        const errorInfo = this.get(code);
        const message = details ? `${errorInfo.message}: ${details}` : errorInfo.message;
        console.error(`[${code}] ${message}`);

        // Show simple error using modern error manager
        modernErrorManager.showError(errorInfo.title, message, errorInfo.suggestions);
    }

    /**
     * Show success message with improved UX
     */
    static showSuccess(message: string): void {
        console.log(`✅ ${message}`);
        modernErrorManager.showSuccess(message);
    }
}
