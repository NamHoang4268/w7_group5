import React, { createContext, useContext } from 'react';

export const GlobalContext = createContext(null);

export const useGlobalContext = () => useContext(GlobalContext);

// GlobalProvider – đã loại bỏ order ecommerce cũ
// Chỉ giữ context stubs cho các legacy components không bị xóa kịp
const GlobalProvider = ({ children }) => {
    return (
        <GlobalContext.Provider
            value={{
                // Stubs – legacy components có thể vẫn reference những này
                totalPrice: 0,
                totalQty: 0,
                notDiscountTotalPrice: 0,
                fetchCartItem: () => {},
                updateCartItem: () => {},
                deleteCartItem: () => {},
                reloadAfterPayment: () => {},
                fetchOrder: () => {},
            }}
        >
            {children}
        </GlobalContext.Provider>
    );
};

export default GlobalProvider;
