// utils/capitalizeWords.js
export const capitalizeWords = (str) => {
    if (!str) return '';
    return str
        .split(' ')
        .map(word => {
            // Nếu từ đã có ký tự in hoa (như "PC"), giữ nguyên
            if (word.match(/[A-Z]/) && word.length > 1) return word;
            // Ngược lại, capitalize ký tự đầu
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
};