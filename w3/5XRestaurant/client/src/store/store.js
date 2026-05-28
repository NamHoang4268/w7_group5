import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import productReducer from './productSlice';
import orderReducer from './orderSlice';
import tableReducer from './tableSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    product: productReducer,
    orders: orderReducer,
    table: tableReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

export default store;
