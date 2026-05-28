/**
 * Get n random items from an array
 * @param arr - The array to get items from
 * @param n - Number of random items to return
 * @returns Array of n random items
 */
export const getRandomItems = <T>(arr: T[], n: number): T[] => {
    if (!arr?.length || n <= 0) return [];
    
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(n, arr.length));
};
