/**
 * Calculate points based on order total
 * @param {number} orderTotal - Total amount of the order
 * @returns {number} Points earned (1 point per 10,000 VND)
 */
export const calculatePointsFromOrder = (orderTotal) => {
    // 1 point for every 10,000 VND spent
    const POINTS_PER_10000VND = 1;

    // Ensure orderTotal is a number
    const numericTotal = Number(orderTotal);
    if (isNaN(numericTotal)) {
        console.error('Invalid order total:', orderTotal);
        return 0;
    }

    // Calculate points: 1 point per 10,000 VND, rounded down
    const points = Math.floor(numericTotal / 10000);
    console.log(`Calculating points: ${numericTotal} VND / 10000 = ${points} points`);

    return points * POINTS_PER_10000VND;
};

/**
 * Calculate points that can be used for an order
 * @param {number} availablePoints - User's available points
 * @param {number} orderTotal - Total amount of the order
 * @returns {number} Points that can be used (100 VND per point, up to 50% of order total)
 */
export const calculateUsablePoints = (availablePoints, orderTotal) => {
    const MAX_POINTS_PERCENTAGE = 0.5; // Max 50% of order can be paid with points
    const POINT_VALUE = 100; // 1 point = 100 VND

    const maxPointsByOrder = Math.floor((orderTotal * MAX_POINTS_PERCENTAGE) / POINT_VALUE);
    return Math.min(availablePoints, maxPointsByOrder);
};

export default {
    calculatePointsFromOrder,
    calculateUsablePoints
};
