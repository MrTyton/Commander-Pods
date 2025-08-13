/**
 * Compressed error messages using error codes
 * Reduces string literals in bundle
 */

// Error codes for compression
enum ErrorCode {
    PLAYER_NAME_REQUIRED = 'E001',
    PLAYER_NAME_DUPLICATE = 'E002',
    POWER_LEVEL_REQUIRED = 'E003',
    BRACKET_LEVEL_REQUIRED = 'E004',
    INSUFFICIENT_PLAYERS = 'E005',
    GENERATION_FAILED = 'E006',
    DISPLAY_MODE_FAILED = 'E007',
    INITIALIZATION_FAILED = 'E008'
}

// Compressed error message templates
const ERROR_TEMPLATES: Record<string, string> = {
    [ErrorCode.PLAYER_NAME_REQUIRED]: 'Name required',
    [ErrorCode.PLAYER_NAME_DUPLICATE]: 'Duplicate name',
    [ErrorCode.POWER_LEVEL_REQUIRED]: 'Select power level',
    [ErrorCode.BRACKET_LEVEL_REQUIRED]: 'Select bracket',
    [ErrorCode.INSUFFICIENT_PLAYERS]: 'Need more players',
    [ErrorCode.GENERATION_FAILED]: 'Generation failed',
    [ErrorCode.DISPLAY_MODE_FAILED]: 'Display mode failed',
    [ErrorCode.INITIALIZATION_FAILED]: 'Init failed'
};

/**
 * Error message utility with compression
 */
export class ErrorMessages {
    /**
     * Get compressed error message
     */
    static get(code: ErrorCode, details?: string): string {
        const template = ERROR_TEMPLATES[code] || 'Unknown error';
        return details ? `${template}: ${details}` : template;
    }

    /**
     * Common error messages as constants
     */
    static readonly PLAYER_NAME_REQUIRED = ErrorCode.PLAYER_NAME_REQUIRED;
    static readonly PLAYER_NAME_DUPLICATE = ErrorCode.PLAYER_NAME_DUPLICATE;
    static readonly POWER_LEVEL_REQUIRED = ErrorCode.POWER_LEVEL_REQUIRED;
    static readonly BRACKET_LEVEL_REQUIRED = ErrorCode.BRACKET_LEVEL_REQUIRED;
    static readonly INSUFFICIENT_PLAYERS = ErrorCode.INSUFFICIENT_PLAYERS;
    static readonly GENERATION_FAILED = ErrorCode.GENERATION_FAILED;
    static readonly DISPLAY_MODE_FAILED = ErrorCode.DISPLAY_MODE_FAILED;
    static readonly INITIALIZATION_FAILED = ErrorCode.INITIALIZATION_FAILED;

    /**
     * Show error message with improved UX
     */
    static show(code: ErrorCode, details?: string): void {
        const message = this.get(code, details);
        console.error(`[${code}] ${message}`);
        
        // Simple alert for now - could be extended to toast notifications
        alert(message);
    }

    /**
     * Show success message with improved UX
     */
    static showSuccess(message: string): void {
        console.log(`✅ ${message}`);
        
        // Simple alert for now - could be enhanced with green toast notifications
        alert(message);
    }
}
