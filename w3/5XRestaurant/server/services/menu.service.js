import ProductModel from "../models/product.model.js";
import CategoryModel from "../models/category.model.js";

/**
 * Intent detection - phát hiện ý định của user từ message
 */
const INTENT_PATTERNS = {
    // Món cay/매운
    spicy: {
        keywords: ["cay", "매운", "매워", "spicy", "hot"],
        filter: { $or: [
            { description: { $regex: "cay", $options: "i" } },
            { name: { $regex: "cay", $options: "i" } }
        ]}
    },
    
    // Món chay/vegetarian
    vegetarian: {
        keywords: ["chay", "vegetarian", "vegan", "rau", "채식"],
        filter: { $or: [
            { description: { $regex: "chay|rau|vegetarian", $options: "i" } },
            { name: { $regex: "chay|rau", $options: "i" } }
        ]}
    },
    
    // Món nhẹ/light
    light: {
        keywords: ["nhẹ", "light", "healthy", "salad", "ít calo"],
        filter: { $or: [
            { description: { $regex: "nhẹ|salad|healthy", $options: "i" } },
            { name: { $regex: "salad|healthy", $options: "i" } }
        ]}
    },
    
    // Món nhanh/fast
    fast: {
        keywords: ["nhanh", "fast", "gấp", "quick"],
        filter: { preparationTime: { $lte: 15 } }
    },
    
    // Món đặc biệt/featured
    featured: {
        keywords: ["đặc biệt", "nổi bật", "featured", "signature", "best seller", "bán chạy"],
        filter: { isFeatured: true }
    },
    
    // Món rẻ/cheap
    cheap: {
        keywords: ["rẻ", "cheap", "giá rẻ", "tiết kiệm", "budget"],
        sort: { price: 1 }, // Sort tăng dần theo giá
        limit: 10
    },
    
    // Món đắt/expensive/cao cấp
    expensive: {
        keywords: ["đắt", "expensive", "cao cấp", "premium", "sang trọng"],
        sort: { price: -1 }, // Sort giảm dần theo giá
        limit: 10
    }
};

/**
 * Detect user intent from message
 */
function detectIntent(message) {
    const lower = message.toLowerCase();
    const detectedIntents = [];
    
    for (const [intentName, config] of Object.entries(INTENT_PATTERNS)) {
        const matched = config.keywords.some(kw => lower.includes(kw));
        if (matched) {
            detectedIntents.push({ name: intentName, config });
        }
    }
    
    return detectedIntents;
}

/**
 * Build MongoDB query from detected intents
 */
function buildQuery(intents) {
    const query = { publish: true, status: 'available' }; // Base query
    const filters = [];
    let sort = null;
    let limit = null;
    
    for (const intent of intents) {
        if (intent.config.filter) {
            filters.push(intent.config.filter);
        }
        if (intent.config.sort) {
            sort = intent.config.sort;
        }
        if (intent.config.limit) {
            limit = intent.config.limit;
        }
    }
    
    // Combine filters with $and
    if (filters.length > 0) {
        query.$and = filters;
    }
    
    return { query, sort, limit };
}

/**
 * Format menu items for AI context
 */
function formatMenuForAI(products, categories) {
    const categoryMap = {};
    categories.forEach(cat => {
        categoryMap[cat._id.toString()] = cat.name;
    });
    
    return products.map(p => {
        const categoryNames = p.category
            .map(catId => categoryMap[catId.toString()])
            .filter(Boolean)
            .join(", ");
        
        return {
            name: p.name,
            category: categoryNames,
            price: p.price,
            discount: p.discount,
            finalPrice: p.price - (p.price * p.discount / 100),
            description: p.description,
            preparationTime: p.preparationTime,
            isFeatured: p.isFeatured,
            stock: p.stock
        };
    });
}

/**
 * Main service: Get smart menu based on user message
 */
export async function getSmartMenu(userMessage, options = {}) {
    try {
        const { maxItems = 20, includeAll = false } = options;
        
        // 1. Detect intent
        const intents = detectIntent(userMessage);
        console.log(`[MenuService] Detected intents:`, intents.map(i => i.name));
        
        // 2. Build query
        const { query, sort, limit } = buildQuery(intents);
        
        // 3. Fetch products
        let productsQuery = ProductModel.find(query)
            .populate('category', 'name')
            .select('name category price discount description preparationTime isFeatured stock status');
        
        if (sort) {
            productsQuery = productsQuery.sort(sort);
        }
        
        const limitToUse = limit || (includeAll ? 100 : maxItems);
        productsQuery = productsQuery.limit(limitToUse);
        
        const products = await productsQuery.lean();
        
        // 4. Get categories for formatting
        const categoryIds = [...new Set(products.flatMap(p => p.category.map(c => c._id)))];
        const categories = await CategoryModel.find({ _id: { $in: categoryIds } }).lean();
        
        // 5. Format for AI
        const formattedMenu = formatMenuForAI(products, categories);
        
        console.log(`[MenuService] Returning ${formattedMenu.length} items`);
        
        return {
            items: formattedMenu,
            totalItems: formattedMenu.length,
            intents: intents.map(i => i.name),
            isFiltered: intents.length > 0
        };
    } catch (error) {
        console.error('[MenuService] Error:', error);
        throw error;
    }
}

/**
 * Get full menu (fallback when no intent detected)
 */
export async function getFullMenu(options = {}) {
    try {
        const { maxItems = 30 } = options;
        
        const products = await ProductModel.find({ 
            publish: true, 
            status: 'available' 
        })
            .populate('category', 'name')
            .select('name category price discount description preparationTime isFeatured')
            .sort({ isFeatured: -1, createdAt: -1 }) // Featured first
            .limit(maxItems)
            .lean();
        
        const categoryIds = [...new Set(products.flatMap(p => p.category.map(c => c._id)))];
        const categories = await CategoryModel.find({ _id: { $in: categoryIds } }).lean();
        
        const formattedMenu = formatMenuForAI(products, categories);
        
        console.log(`[MenuService] Returning full menu: ${formattedMenu.length} items`);
        
        return {
            items: formattedMenu,
            totalItems: formattedMenu.length,
            intents: [],
            isFiltered: false
        };
    } catch (error) {
        console.error('[MenuService] Error getting full menu:', error);
        throw error;
    }
}

/**
 * Search menu by text (using MongoDB text search)
 */
export async function searchMenu(searchText, options = {}) {
    try {
        const { maxItems = 15 } = options;
        
        const products = await ProductModel.find({
            $text: { $search: searchText },
            publish: true,
            status: 'available'
        })
            .populate('category', 'name')
            .select('name category price discount description preparationTime isFeatured score')
            .sort({ score: { $meta: "textScore" } }) // Sort by relevance
            .limit(maxItems)
            .lean();
        
        const categoryIds = [...new Set(products.flatMap(p => p.category.map(c => c._id)))];
        const categories = await CategoryModel.find({ _id: { $in: categoryIds } }).lean();
        
        const formattedMenu = formatMenuForAI(products, categories);
        
        console.log(`[MenuService] Search "${searchText}": ${formattedMenu.length} items`);
        
        return {
            items: formattedMenu,
            totalItems: formattedMenu.length,
            searchText,
            isFiltered: true
        };
    } catch (error) {
        console.error('[MenuService] Error searching menu:', error);
        throw error;
    }
}
