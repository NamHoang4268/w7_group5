import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSmartMenu, getFullMenu, searchMenu } from "../services/menu.service.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODEL_FALLBACK_CHAIN = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash",
];

const BASE_SYSTEM_PROMPT = `Bạn là trợ lý AI của EatEase Restaurant — một nhà hàng hiện đại chuyên phục vụ các món ăn đa dạng với hệ thống đặt bàn và gọi món trực tuyến.

🎯 NHIỆM VỤ CỦA BẠN:
- Tư vấn món ăn phù hợp dựa trên sở thích khách hàng
- Giải đáp thắc mắc về thực đơn, món ăn, giá cả
- Hỗ trợ khách hàng về quy trình đặt bàn trực tuyến
- Hướng dẫn gọi món tại bàn qua QR code
- Thông tin về chính sách hủy đặt bàn, thanh toán (tiền mặt, online qua Stripe)
- Giới thiệu các voucher/mã giảm giá hiện có
- Hỗ trợ theo dõi đơn hàng và trạng thái món ăn
- Thông tin về giờ mở cửa, địa chỉ nhà hàng

✨ PHONG CÁCH TRẢ LỜI:
- Trả lời bằng tiếng Việt, thân thiện, nhiệt tình như một người bạn
- Sử dụng emoji phù hợp để tạo cảm giác gần gũi (🍜 🍕 🥗 ✨ 😊)
- Trả lời ngắn gọn, súc tích, dễ hiểu
- Khi giới thiệu món ăn, hãy mô tả hấp dẫn và đưa ra lý do nên chọn
- Nếu có nhiều lựa chọn, gợi ý 2-3 món phù hợp nhất

⚠️ NGUYÊN TẮC QUAN TRỌNG:
- CHỈ giới thiệu món ăn có trong danh sách menu được cung cấp
- KHÔNG bịa đặt tên món, giá cả hay thông tin không có trong menu
- Nếu không tìm thấy món phù hợp, hãy gợi ý món tương tự hoặc hỏi thêm sở thích
- Khi khách hỏi về giá, luôn đề cập cả giá gốc và giá sau giảm (nếu có)
- Khi cần hỗ trợ nâng cao, gợi ý chat trực tiếp với nhân viên

📋 CÁCH TRẢ LỜI VỀ MÓN ĂN:
- Gọi tên món rõ ràng
- Đề cập giá (và giá sau giảm nếu có discount)
- Mô tả ngắn gọn đặc điểm nổi bật
- Thời gian chuẩn bị (nếu khách hỏi về món nhanh)
- Gợi ý kết hợp với món khác nếu phù hợp`;

// ─── Local FAQ — trả lời ngay không tốn quota ──────────────────────────────
const FAQ = [
    {
        keywords: ["đặt bàn", "booking", "reserve", "giữ chỗ", "book bàn"],
        answer: "Cách đặt bàn tại EatEase:\n1. 📱 Vào trang Đặt bàn trên website\n2. 📅 Chọn ngày, giờ và số lượng khách\n3. 📝 Điền thông tin liên hệ\n4. ✅ Xác nhận đặt bàn\n\nBạn sẽ nhận được mã QR để check-in khi đến nhà hàng!"
    },
    {
        keywords: ["gọi món", "order", "đặt món", "qr code", "quét mã"],
        answer: "Gọi món tại EatEase rất đơn giản:\n1. 📱 Quét mã QR trên bàn\n2. 🍽️ Chọn món từ thực đơn điện tử\n3. 🛒 Thêm vào giỏ và xác nhận\n4. 👨‍🍳 Bếp sẽ nhận đơn và chuẩn bị món ngay!\n\nBạn có thể theo dõi trạng thái món ăn real-time!"
    },
    {
        keywords: ["thanh toán", "payment", "trả tiền", "pay", "hình thức thanh toán"],
        answer: "EatEase hỗ trợ 2 hình thức thanh toán:\n💵 **Tiền mặt** - Thanh toán trực tiếp tại quầy\n💳 **Online (Stripe)** - Thanh toán qua thẻ/ví điện tử\n\nBạn có thể chọn hình thức thanh toán khi hoàn tất đơn hàng!"
    },
    {
        keywords: ["hủy đặt bàn", "cancel booking", "đổi lịch", "thay đổi đặt bàn", "chính sách hủy"],
        answer: "Chính sách hủy/đổi lịch đặt bàn:\n• ✅ Hủy miễn phí nếu trước **2 giờ**\n• 🔄 Đổi lịch miễn phí nếu trước **4 giờ**\n• ⚠️ Hủy muộn có thể bị tính phí 50% giá trị đặt cọc\n\nLiên hệ support@eatease.vn để được hỗ trợ!"
    },
    {
        keywords: ["giờ mở cửa", "giờ đóng cửa", "mở cửa lúc mấy giờ", "đóng cửa lúc mấy giờ", "hours"],
        answer: "Giờ mở cửa EatEase Restaurant:\n🕐 **10:00 - 22:00** hàng ngày\n📍 Địa chỉ: [Địa chỉ nhà hàng]\n\nChúng tôi phục vụ cả trưa và tối. Đặt bàn trước để có chỗ tốt nhất!"
    },
    {
        keywords: ["voucher", "mã giảm giá", "khuyến mãi", "coupon", "discount code"],
        answer: "EatEase có nhiều voucher hấp dẫn! 🎁\n• 🎉 Voucher chào mừng thành viên mới\n• 🎂 Ưu đãi sinh nhật\n• 💝 Khuyến mãi theo mùa\n\nXem voucher khả dụng tại trang Khuyến mãi hoặc khi thanh toán!"
    },
    {
        keywords: ["liên hệ", "hỗ trợ", "contact", "hotline", "email", "số điện thoại"],
        answer: "Liên hệ EatEase Restaurant:\n📧 Email: support@eatease.vn\n📞 Hotline: [Số điện thoại]\n⏰ Hỗ trợ 9:00 - 22:00 hàng ngày\n\nHoặc chat trực tiếp với nhân viên — chúng tôi luôn sẵn sàng giúp bạn! 😊"
    },
];

function checkFAQ(message) {
    const lower = message.toLowerCase();
    for (const item of FAQ) {
        // Require at least 2 keywords to match, or 1 keyword with exact phrase match
        const matched = item.keywords.filter(kw => lower.includes(kw));
        if (matched.length >= 2) return item.answer;
        
        // For single keyword, require exact phrase match (not just substring)
        if (matched.length === 1) {
            const keyword = matched[0];
            // Check if it's a standalone phrase (not part of another word)
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(message)) {
                return item.answer;
            }
        }
    }
    return null;
}

// ─── Server-side rate limiter (per IP) ─────────────────────────────────────
const ipLastRequest = new Map();
const RATE_LIMIT_MS = 4000; // tối thiểu 4 giây giữa 2 request AI cùng 1 IP

// ─── Gemini fallback chain ──────────────────────────────────────────────────
// Skip sang model tiếp theo khi gặp các lỗi quota/unavailable
const SKIP_STATUSES = new Set([429, 404, 503]);

/**
 * Build dynamic system prompt with menu context
 */
function buildSystemPrompt(menuData) {
    let prompt = BASE_SYSTEM_PROMPT;
    
    if (menuData && menuData.items && menuData.items.length > 0) {
        prompt += `\n\n📋 THỰC ĐƠN HIỆN CÓ (${menuData.totalItems} món):\n`;
        
        if (menuData.isFiltered && menuData.intents && menuData.intents.length > 0) {
            prompt += `(Đã lọc theo: ${menuData.intents.join(", ")})\n\n`;
        }
        
        menuData.items.forEach((item, index) => {
            prompt += `${index + 1}. **${item.name}**\n`;
            prompt += `   - Danh mục: ${item.category || "Chưa phân loại"}\n`;
            prompt += `   - Giá: ${item.price.toLocaleString('vi-VN')}đ`;
            
            if (item.discount > 0) {
                prompt += ` → Giảm ${item.discount}% = ${item.finalPrice.toLocaleString('vi-VN')}đ ✨`;
            }
            prompt += `\n`;
            
            if (item.description) {
                prompt += `   - Mô tả: ${item.description}\n`;
            }
            
            if (item.preparationTime) {
                prompt += `   - Thời gian: ~${item.preparationTime} phút\n`;
            }
            
            if (item.isFeatured) {
                prompt += `   - ⭐ Món đặc biệt\n`;
            }
            
            prompt += `\n`;
        });
        
        prompt += `\n💡 Hãy tư vấn món ăn từ danh sách trên một cách tự nhiên và hấp dẫn!`;
    } else {
        prompt += `\n\n⚠️ Hiện tại chưa có thông tin menu cụ thể. Hãy giới thiệu tổng quan về nhà hàng và gợi ý khách xem menu trên website.`;
    }
    
    return prompt;
}

async function sendWithModelFallback(message, formattedHistory, systemPrompt) {
    let lastError;
    for (const modelName of MODEL_FALLBACK_CHAIN) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemPrompt,
            });
            const chat = model.startChat({ history: formattedHistory });
            const result = await chat.sendMessage(message);
            console.log(`[Chat] Served by: ${modelName}`);
            return result.response.text();
        } catch (error) {
            lastError = error;
            if (SKIP_STATUSES.has(error.status)) {
                console.warn(`[Chat] Model ${modelName} unavailable (${error.status}), trying next...`);
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

// ─── Controller ─────────────────────────────────────────────────────────────
export async function chatController(req, res) {
    try {
        const { message, history = [] } = req.body;

        if (!message || typeof message !== "string" || message.trim() === "") {
            return res.status(400).json({
                message: "Tin nhắn không được để trống",
                error: true,
                success: false,
            });
        }

        const text = message.trim();

        // 1. Thử trả lời từ FAQ local trước (không tốn quota)
        const faqAnswer = checkFAQ(text);
        if (faqAnswer) {
            console.log("[Chat] Served by: local FAQ");
            console.log("[Chat] Message:", text);
            return res.json({
                message: "Thành công",
                error: false,
                success: true,
                data: { reply: faqAnswer },
            });
        }
        
        console.log("[Chat] FAQ check passed, proceeding to AI...");

        // 2. Rate limit per IP — tránh spam Gemini API
        const ip = req.ip || req.socket?.remoteAddress || "unknown";
        const now = Date.now();
        const lastTime = ipLastRequest.get(ip) || 0;
        const elapsed = now - lastTime;
        if (elapsed < RATE_LIMIT_MS) {
            const waitSec = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
            return res.status(429).json({
                message: `Vui lòng chờ ${waitSec} giây trước khi gửi tin tiếp theo ⏳`,
                error: true,
                success: false,
            });
        }
        ipLastRequest.set(ip, now);

        // 3. Fetch smart menu based on user message
        let menuData = null;
        try {
            // Detect if user is asking about food/menu
            const isFoodQuery = /món|menu|ăn|thực đơn|đặc biệt|cay|chay|nhẹ|nhanh|rẻ|đắt|giá|bao nhiêu|gợi ý|recommend/i.test(text);
            
            if (isFoodQuery) {
                console.log("[Chat] Fetching smart menu...");
                menuData = await getSmartMenu(text, { maxItems: 15 });
                
                // If no items found with intent, try text search
                if (menuData.items.length === 0) {
                    console.log("[Chat] No items from intent, trying text search...");
                    menuData = await searchMenu(text, { maxItems: 10 });
                }
                
                // If still no items, get featured items
                if (menuData.items.length === 0) {
                    console.log("[Chat] No search results, getting featured items...");
                    menuData = await getFullMenu({ maxItems: 10 });
                }
            } else {
                // For non-food queries, provide limited menu context
                console.log("[Chat] Non-food query, getting featured items...");
                menuData = await getFullMenu({ maxItems: 8 });
            }
        } catch (menuError) {
            console.error("[Chat] Menu fetch error:", menuError);
            // Continue without menu data
        }

        // 4. Build dynamic system prompt with menu
        const systemPrompt = buildSystemPrompt(menuData);

        // 5. Gọi Gemini với fallback chain
        const formattedHistory = history
            .filter((msg) => msg.role && msg.text)
            .map((msg) => ({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.text }],
            }));

        const responseText = await sendWithModelFallback(text, formattedHistory, systemPrompt);

        return res.json({
            message: "Thành công",
            error: false,
            success: true,
            data: { 
                reply: responseText,
                menuItemsCount: menuData?.totalItems || 0,
                isFiltered: menuData?.isFiltered || false
            },
        });
    } catch (error) {
        // Log đầy đủ để debug
        console.error("[Chat] AI error details:", {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            errorDetails: error.errorDetails || error.details,
        });

        if (error.status === 429) {
            // Kiểm tra xem là quota hàng ngày hay rate limit ngắn hạn
            const isQuotaExceeded =
                error.message?.includes('quota') ||
                error.message?.includes('RESOURCE_EXHAUSTED') ||
                error.errorDetails?.some?.(d => d.reason === 'RATE_LIMIT_EXCEEDED');

            const userMsg = isQuotaExceeded
                ? "Hệ thống AI đang quá tải, vui lòng thử lại sau vài phút! ⏳"
                : "Vui lòng chờ vài giây trước khi gửi tin tiếp theo ⏳";

            return res.status(429).json({
                message: userMsg,
                error: true,
                success: false,
            });
        }

        if (error.status === 400) {
            console.error("[Chat] Bad request to Gemini — possible invalid history format");
        }

        return res.status(500).json({
            message: "Lỗi kết nối AI. Vui lòng thử lại sau.",
            error: true,
            success: false,
        });
    }
}