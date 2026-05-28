// utils/valideURLConvert.js
export const valideURLConvert = (name) => {
    if (!name) return ""; // Xử lý trường hợp name rỗng
    let url = name
        .toString()
        .toLowerCase() // Chuyển thành chữ thường
        .normalize("NFD") // Phân tách dấu thành ký tự riêng
        // .replace(/[\u0300-\u036f]/g, "") // Loại bỏ dấu (tùy chọn, để URL không có dấu)
        .replaceAll(" ", "-") // Thay khoảng trắng bằng -
        .replaceAll(",", "-")
        .replaceAll("&", "-")
        .replaceAll("(", "")
        .replaceAll(")", "")
        .replaceAll("%", "-percent-");
    url = url
        .replace(/[^a-z0-9-]/g, "") // Giữ a-z, 0-9, -
        .replace(/-+/g, "-") // Thay nhiều - liên tiếp bằng 1 -
        .replace(/^-|-$/g, ""); // Loại bỏ - ở đầu hoặc cuối
    return url;
};