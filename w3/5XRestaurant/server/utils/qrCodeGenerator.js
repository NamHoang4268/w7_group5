import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique token for table QR code
 * @param {String} tableId - MongoDB ObjectId of the table
 * @param {String} tableNumber - Table number (e.g., "A01")
 * @returns {String} JWT token
 */
export const generateTableToken = (tableId, tableNumber) => {
    const payload = {
        tableId: tableId.toString(),
        tableNumber,
        type: 'table_login',
        uniqueId: uuidv4() // Add unique ID to prevent token collision
    };

    // Create a permanent token (no expiration for table QR codes)
    const token = jwt.sign(payload, process.env.SECRET_KEY_ACCESS_TOKEN);

    return token;
};

/**
 * Generate QR code image as base64 string
 * @param {String} token - JWT token for table login
 * @returns {Promise<String>} Base64 encoded QR code image
 */
export const generateQRCodeImage = async (token) => {
    try {
        // Create the login URL with token
        const loginUrl = `${process.env.FRONTEND_URL}/table-login?token=${token}`;

        // Generate QR code as base64 data URL
        const qrCodeDataUrl = await QRCode.toDataURL(loginUrl, {
            errorCorrectionLevel: 'H', // High error correction
            type: 'image/png',
            quality: 0.95,
            margin: 2,
            width: 400,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        return qrCodeDataUrl;
    } catch (error) {
        throw new Error(`Failed to generate QR code: ${error.message}`);
    }
};

/**
 * Verify table token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyTableToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN);

        // Verify it's a table login token
        if (decoded.type !== 'table_login') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (error) {
        throw new Error(`Token verification failed: ${error.message}`);
    }
};

/**
 * Generate complete QR code data for a table
 * @param {String} tableId - MongoDB ObjectId of the table
 * @param {String} tableNumber - Table number
 * @returns {Promise<Object>} Object containing token and QR code image
 */
export const generateTableQRCode = async (tableId, tableNumber) => {
    try {
        // Generate token
        const token = generateTableToken(tableId, tableNumber);

        // Generate QR code image
        const qrCodeImage = await generateQRCodeImage(token);

        return {
            token,
            qrCodeImage
        };
    } catch (error) {
        throw new Error(`Failed to generate table QR code: ${error.message}`);
    }
};
