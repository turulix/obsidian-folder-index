import FolderIndexPlugin from "../main";

export class ExcludePatternManager {
    private readonly globalPatterns: string[];
    private readonly localPatterns: string[];

    constructor(plugin: FolderIndexPlugin, localPatternsStr?: string) {
        this.globalPatterns = plugin.settings.excludePatterns;
        this.localPatterns = this.parseLocalPatterns(localPatternsStr);
    }

    private parseLocalPatterns(localPatternsStr?: string): string[] {
        if (!localPatternsStr) return [];
        return localPatternsStr.split(',')
            .map(pattern => pattern.trim())
            .filter(pattern => pattern !== '');
    }

    public isExcluded(path: string): boolean {
        // Check all patterns (both global and local)
        const allPatterns = [...this.globalPatterns, ...this.localPatterns];
        
        for (const pattern of allPatterns) {
            if (pattern === "") continue;
            
            // Escape special characters in the pattern except * which we'll use as wildcard
            const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
            if (new RegExp(escapedPattern, 'i').test(path)) {
                return true;
            }
        }
        return false;
    }
}
