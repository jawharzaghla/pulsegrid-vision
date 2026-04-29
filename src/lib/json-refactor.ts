export const MAX_JSON_CHARS = 12000;

export function isJsonLarge(data: unknown): boolean {
    if (!data) return false;
    const str = JSON.stringify(data);
    return str.length > MAX_JSON_CHARS;
}

export function refactorLargeJson(data: unknown): { refactoredData: unknown; wasRefactored: boolean } {
    let wasRefactored = false;

    // Six months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsTimestamp = sixMonthsAgo.getTime();

    function tryGetDate(item: any): number | null {
        if (!item || typeof item !== 'object') return null;
        for (const key of Object.keys(item)) {
            const val = item[key];
            if (typeof val === 'string' && val.length > 8) {
                const parsed = Date.parse(val);
                if (!isNaN(parsed) && parsed > 0) return parsed;
            }
        }
        return null;
    }

    function process(obj: any): any {
        if (Array.isArray(obj)) {
            let processedArray = obj.map(item => process(item));

            if (processedArray.length > 200) {
                wasRefactored = true;

                // Try filtering by date
                let hasDates = false;
                const filtered = processedArray.filter(item => {
                    const d = tryGetDate(item);
                    if (d !== null) {
                        hasDates = true;
                        return d >= sixMonthsTimestamp;
                    }
                    return true;
                });

                if (hasDates && filtered.length < processedArray.length) {
                    processedArray = filtered;
                }

                // If still > 200, take the last 200
                if (processedArray.length > 200) {
                    processedArray = processedArray.slice(-200);
                }
            }
            return processedArray;
        } else if (obj !== null && typeof obj === 'object') {
            const newObj: any = {};
            for (const key in obj) {
                newObj[key] = process(obj[key]);
            }
            return newObj;
        }
        return obj;
    }

    const initialSize = JSON.stringify(data).length;
    let processed = process(data);
    let finalSize = JSON.stringify(processed).length;

    // If it's still too large (e.g. massive flat object or huge individual array items)
    if (finalSize > MAX_JSON_CHARS) {
        wasRefactored = true;

        const aggressiveTruncate = (obj: any, maxLen: number): any => {
            if (Array.isArray(obj)) {
                return obj.slice(0, maxLen).map(item => aggressiveTruncate(item, maxLen));
            } else if (obj !== null && typeof obj === 'object') {
                const newObj: any = {};
                for (const key in obj) {
                    newObj[key] = aggressiveTruncate(obj[key], maxLen);
                }
                return newObj;
            } else if (typeof obj === 'string') {
                return obj.length > 50 ? obj.substring(0, 50) + '...' : obj;
            }
            return obj;
        };

        // Progressively reduce the size of all arrays and strings
        for (const maxLen of [20, 10, 5, 2, 1]) {
            processed = aggressiveTruncate(data, maxLen);
            finalSize = JSON.stringify(processed).length;
            if (finalSize <= MAX_JSON_CHARS) break;
        }

        // Final brute force if still too big
        if (finalSize > MAX_JSON_CHARS) {
            console.warn('[json-refactor] Payload still > limits. Throwing explicit error to prevent Groq failure.');
            const error = new Error("Data payload is fundamentally too massive to be processed by AI, even after maximum truncation. Please select a more specific API endpoint that returns less data.");
            error.name = 'JSONRefactorError';
            throw error;
        }
    }

    return {
        refactoredData: processed,
        wasRefactored: initialSize !== finalSize || wasRefactored
    };
}
