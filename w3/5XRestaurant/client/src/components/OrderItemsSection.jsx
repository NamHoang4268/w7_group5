import React from 'react';
import { useSelector } from 'react-redux';

const OrderItemsSection = () => {
    const cart = useSelector((state) => state.cart.cart);

    if (!cart || cart.length === 0) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <h3 className="text-lg font-semibold mb-2">
                    Sản phẩm trong đơn hàng
                </h3>
                <p className="text-gray-500">Giỏ hàng trống</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">
                Sản phẩm trong đơn hàng
            </h3>
            <div className="divide-y divide-gray-200">
                {cart.map((item) => (
                    <div key={item._id} className="flex items-center py-3">
                        <img
                            src={item.image[0]}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded mr-4 border"
                        />
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-800">
                                {item.name}
                            </h4>
                            <p className="text-sm text-gray-500">
                                Số lượng: {item.quantity}
                            </p>
                        </div>
                        <div className="font-semibold text-gray-800">
                            {item.price.toLocaleString('vi-VN')} ₫
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OrderItemsSection;
