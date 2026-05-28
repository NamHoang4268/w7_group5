export const baseURL = import.meta.env.VITE_API_URL

const SummaryApi = {
    register: {
        url: '/api/user/register',
        method: 'post'
    },
    verifyEmail: {
        url: '/api/user/verify-email',
        method: 'post'
    },
    login: {
        url: '/api/user/login',
        method: 'post'
    },
    google_login: {
        url: '/api/user/google-login',
        method: 'post'
    },
    user_points: {
        url: '/api/user/user-points',
        method: 'get'
    },
    forgot_password: {
        url: '/api/user/forgot-password',
        method: 'put'
    },
    forgot_password_otp_verification: {
        url: '/api/user/verify-forgot-password-otp',
        method: 'put'
    },
    reset_password: {
        url: '/api/user/reset-password',
        method: 'put'
    },
    refresh_token: {
        url: '/api/user/refresh-token',
        method: 'post'
    },
    user_details: {
        url: '/api/user/user-details',
        method: 'get'
    },
    logout: {
        url: '/api/user/logout',
        method: 'get'
    },
    upload_avatar: {
        url: '/api/user/upload-avatar',
        method: 'put'
    },
    update_user: {
        url: '/api/user/update-user',
        method: 'put'
    },
    verify_password: {
        url: '/api/user/verify-password',
        method: 'post'
    },
    get_available_vouchers: {
        url: '/api/voucher/available',
        method: 'post'
    },
    apply_voucher: {
        url: '/api/voucher/apply',
        method: 'post'
    },
    change_password: {
        url: '/api/user/change-password',
        method: 'put'
    },
    get_initial_products: {
        url: '/api/product/initial-products',
        method: 'post'
    },

    // Category
    add_category: {
        url: '/api/category/add-category',
        method: 'post'
    },
    upload_image: {
        url: '/api/file/upload',
        method: 'post'
    },
    get_category: {
        url: '/api/category/get-category',
        method: 'get'
    },
    update_category: {
        url: '/api/category/update-category',
        method: 'put'
    },
    delete_category: {
        url: '/api/category/delete-category',
        method: 'delete'
    },
    get_deleted_categories: {
        url: '/api/category/get-deleted-categories',
        method: 'get'
    },
    restore_category: {
        url: '/api/category/restore-category',
        method: 'put'
    },
    hard_delete_category: {
        url: '/api/category/hard-delete-category',
        method: 'delete'
    },

    // Sub Category
    add_sub_category: {
        url: '/api/sub-category/add-sub-category',
        method: 'post'
    },
    get_sub_category: {
        url: '/api/sub-category/get-sub-category',
        method: 'get'
    },
    update_sub_category: {
        url: '/api/sub-category/update-sub-category',
        method: 'put'
    },
    delete_sub_category: {
        url: '/api/sub-category/delete-sub-category',
        method: 'delete'
    },

    // Product
    add_product: {
        url: '/api/product/add-product',
        method: 'post'
    },
    get_product: {
        url: '/api/product/get-product',
        method: 'post'
    },
    get_product_by_category: {
        url: '/api/product/get-product-by-category',
        method: 'post'
    },
    get_product_by_category_and_sub_category: {
        url: '/api/product/get-product-by-category-and-subcategory',
        method: 'post'
    },
    get_product_details: {
        url: '/api/product/get-product-details',
        method: 'post'
    },
    update_product_details: {
        url: '/api/product/update-product-details',
        method: 'put'
    },
    delete_product: {
        url: '/api/product/delete-product',
        method: 'delete'
    },
    search_product: {
        url: '/api/product/search-product',
        method: 'post'
    },

    // Customer (Loyalty / QR Checkin)
    customer_checkin: {
        url: '/api/customer/checkin',
        method: 'post'
    },
    get_customer_by_id: {
        url: '/api/customer/:id',
        method: 'get'
    },
    get_all_customers: {
        url: '/api/customer',
        method: 'get'
    },
    update_customer_points: {
        url: '/api/customer/:id/points',
        method: 'patch'
    },

    // Order
    cash_on_delivery_order: {
        url: '/api/order/cash-on-delivery',
        method: 'post'
    },
    payment_url: {
        url: '/api/order/checkout',
        method: 'post'
    },
    get_order_items: {
        url: '/api/order/order-list',
        method: 'get'
    },
    all_orders: {
        url: '/api/order/all-orders',
        method: 'get'
    },
    update_order_status: {
        url: '/api/order/update-status',
        method: 'put'
    },

    // Voucher
    add_voucher: {
        url: '/api/voucher/add-voucher',
        method: 'post'
    },
    get_all_voucher: {
        url: '/api/voucher/get-all-voucher',
        method: 'get'
    },
    update_voucher: {
        url: '/api/voucher/update-voucher',
        method: 'put'
    },
    delete_voucher: {
        url: '/api/voucher/delete-voucher',
        method: 'delete'
    },
    bulk_delete_vouchers: {
        url: '/api/voucher/bulk-delete-vouchers',
        method: 'delete'
    },
    bulk_update_vouchers_status: {
        url: '/api/voucher/bulk-update-vouchers-status',
        method: 'put'
    },

    // AI Chat (Legacy — Gemini via Backend)
    chat_message: {
        url: '/api/chat/message',
        method: 'post'
    },
    // AI Chat (Bedrock — via Lambda)
    bedrock_chat: {
        url: '/api/bedrock-chat',
        method: 'post'
    },

    // Support Chat (Admin REST)
    get_my_support_conversation: {
        url: '/api/support/my-conversation',
        method: 'get'
    },
    get_support_conversations: {
        url: '/api/support/conversations',
        method: 'get'
    },
    get_support_conversation_by_id: {
        url: '/api/support/conversations/:id',
        method: 'get'
    },
    close_support_conversation: {
        url: '/api/support/conversations/:id/close',
        method: 'patch'
    },
    mark_support_conversation_read: {
        url: '/api/support/conversations/:id/read',
        method: 'patch'
    },

    // Table
    create_table: {
        url: '/api/table/create',
        method: 'post'
    },
    get_all_tables: {
        url: '/api/table/get-all',
        method: 'get'
    },
    get_table_by_id: {
        url: '/api/table/get/:id',
        method: 'get'
    },
    update_table: {
        url: '/api/table/update',
        method: 'put'
    },
    delete_table: {
        url: '/api/table/delete',
        method: 'delete'
    },
    update_table_status: {
        url: '/api/table/update-status',
        method: 'patch'
    },
    get_available_tables: {
        url: '/api/table/available',
        method: 'get'
    },
    generate_table_qr: {
        url: '/api/table/generate-qr',
        method: 'post'
    },
    get_table_qr: {
        url: '/api/table/qr/:id',
        method: 'get'
    },

    // Table Authentication
    tableLogin: {
        url: '/api/table-auth/login-qr',
        method: 'post'
    },
    getTableSession: {
        url: '/api/table-auth/session',
        method: 'get'
    },
    logoutTable: {
        url: '/api/table-auth/logout',
        method: 'post'
    },

    // Table Order Management
    add_items_to_table_order: {
        url: '/api/table-order/add-items',
        method: 'post'
    },
    get_current_table_order: {
        url: '/api/table-order/current',
        method: 'get'
    },
    checkout_table_order: {
        url: '/api/table-order/checkout',
        method: 'post'
    },
    cancel_table_order: {
        url: '/api/table-order/cancel',
        method: 'post'
    },
    get_all_active_table_orders: {
        url: '/api/table-order/all-active',
        method: 'get'
    },

    // Booking
    create_booking: {
        url: '/api/booking/create',
        method: 'post'
    },
    get_all_bookings: {
        url: '/api/booking/get-all',
        method: 'get'
    },
    get_booking_by_id: {
        url: '/api/booking/get/:id',
        method: 'get'
    },
    update_booking: {
        url: '/api/booking/update',
        method: 'put'
    },
    cancel_booking: {
        url: '/api/booking/cancel',
        method: 'delete'
    },
    confirm_booking: {
        url: '/api/booking/confirm',
        method: 'patch'
    },
    get_available_tables_for_booking: {
        url: '/api/booking/available-tables',
        method: 'post'
    },
    create_booking_payment_session: {
        url: '/api/booking/create-payment-session',
        method: 'post'
    },
    
    // Kitchen Workflow
    get_kitchen_active: {
        url: '/api/kitchen/active',
        method: 'get'
    },
    get_kitchen_orders: {
        url: '/api/kitchen/orders',
        method: 'get'
    },
    get_waiter_ready: {
        url: '/api/kitchen/waiter',
        method: 'get'
    },
    update_kitchen_item_status: {
        url: '/api/kitchen/item/:orderId/:itemId/status',
        method: 'patch'
    },
    mark_item_served: {
        url: '/api/kitchen/item/:orderId/:itemId/served',
        method: 'patch'
    },

    // Cleanup cancelled payments
    cleanup_cancelled_payment: {
        url: '/api/order/cleanup-cancelled',
        method: 'post'
    },

    // Reports & Analytics
    booking_report: {
        url: '/api/booking/report',
        method: 'get'
    },
    customer_analytics: {
        url: '/api/user/analytics',
        method: 'get'
    },

    // Voucher APIs
    get_best_voucher: {
        url: '/api/voucher/best',
        method: 'post'
    },
    // Voucher Analytics APIs
    voucher_analytics_overview: {
        url: '/api/voucher/analytics/overview',
        method: 'get'
    },
    voucher_analytics_top: {
        url: '/api/voucher/analytics/top-vouchers',
        method: 'get'
    },
    voucher_analytics_trend: {
        url: '/api/voucher/analytics/usage-trend',
        method: 'get'
    },

    // Cashier payment APIs
    get_cashier_pending_orders: {
        url: '/api/table-order/cashier-pending',
        method: 'get'
    },
    cashier_confirm_payment: {
        url: '/api/table-order/cashier-confirm',
        method: 'post'
    },

    // Service Requests (Gọi phục vụ)
    call_waiter: {
        url: '/api/service-request/call',
        method: 'post'
    },
    get_pending_service_requests: {
        url: '/api/service-request/pending',
        method: 'get'
    },
    handle_service_request: {
        url: '/api/service-request/:id/handle',
        method: 'patch'
    },

    // Waiter cancel item
    cancel_table_order_item: {
        url: '/api/table-order/item/:orderId/:itemId',
        method: 'delete'
    },

    // US26 – Stripe online payment verify
    verify_stripe_session: {
        url: '/api/table-order/verify-stripe-session',
        method: 'get'
    },

    // User Orders
    get_user_orders: {
        url: '/api/order/user-orders',
        method: 'get'
    },

    // User Addresses
    get_user_addresses: {
        url: '/api/address/user-addresses',
        method: 'get'
    },
    create_address: {
        url: '/api/address/create',
        method: 'post'
    },
    update_address: {
        url: '/api/address/update/:id',
        method: 'put'
    },
    delete_address: {
        url: '/api/address/delete/:id',
        method: 'delete'
    }
}

export default SummaryApi
