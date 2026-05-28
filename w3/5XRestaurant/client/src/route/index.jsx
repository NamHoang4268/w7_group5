import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import Home from '@/pages/Home';
import SearchPage from '../pages/SearchPage';
import Login from '../pages/Login';
import Register from '../pages/Register';
import RegistrationSuccess from '../pages/RegistrationSuccess';
import VerifyEmail from '../pages/VerifyEmail';
import ForgotPassword from '../pages/ForgotPassword';
import OtpVerification from '../pages/OtpVerification';
import ResetPassword from '../pages/ResetPassword';
import UserMenuMobile from '../pages/UserMenuMobile';
import Profile from '../pages/Profile';
import CategoryPage from './../pages/CategoryPage';
import AdminPermission from '../layouts/AdminPermission';
import TableOrdersPermission from '../layouts/TableOrdersPermission';
import RoleGuard from '../layouts/RoleGuard';

import ProductListPage from '../pages/ProductListPage';
import ProductDisplayPage from '../pages/ProductDisplayPage';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import BillPage from './../pages/BillPage';
import ReportPage from './../pages/ReportPage';
import VoucherPage from '../pages/VoucherPage';
import AdminDashboard from '@/layouts/AdminDashboard';
import SubCategoryPage from '@/pages/SubCategoryPage';
import ProductManagementPage from '../pages/ProductManagementPage';
import TableManagementPage from '../pages/TableManagementPage';
import TableOrdersPage from '../pages/TableOrdersPage';
import BookingManagementPage from '../pages/BookingManagementPage';
import BookingPage from '../pages/BookingPage';
import BookingSuccessPage from '../pages/BookingSuccessPage';
import TableLoginPage from '../pages/TableLoginPage';
import TableMenuPage from '../pages/TableMenuPage';
import TableOrderManagementPage from '../pages/TableOrderManagementPage';
import TablePaymentSuccessPage from '../pages/TablePaymentSuccessPage';
import SupportChatAdmin from '@/pages/SupportChatAdmin';

import CustomerCheckinPage from '../pages/CustomerCheckinPage';
import WaiterBoardPage from '../pages/WaiterBoardPage';
import DashboardRouter from '../pages/DashboardRouter';
import ChefDashboard from '@/pages/ChefDashboard';
import CashierDashboard from '@/pages/CashierDashboard';
import UnifiedChatPage from '@/pages/UnifiedChatPage';
import MyOrdersPage from '../pages/MyOrdersPage';
import AddressPage from '../pages/AddressPage';

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        children: [
            // === PUBLIC – Trang khách hàng ===
            { path: '', element: <Home /> },
            { path: 'search', element: <SearchPage /> },
            {
                path: 'booking',
                element: (
                    <ProtectedRoute>
                        <BookingPage />
                    </ProtectedRoute>
                ),
            },
            { path: 'booking/success', element: <BookingSuccessPage /> },

            // === QR TABLE FLOW ===
            { path: 'customer-checkin', element: <CustomerCheckinPage /> },
            { path: 'table-login', element: <TableLoginPage /> },
            {
                path: 'table-menu',
                element: (
                    <ProtectedRoute>
                        <TableMenuPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'table-order-management',
                element: (
                    <ProtectedRoute>
                        <TableOrderManagementPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'table-payment-success',
                element: (
                    <ProtectedRoute>
                        <TablePaymentSuccessPage />
                    </ProtectedRoute>
                ),
            },

            // === AUTH ===
            {
                path: 'login',
                element: (
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                ),
            },
            {
                path: 'register',
                element: (
                    <PublicRoute>
                        <Register />
                    </PublicRoute>
                ),
            },
            {
                path: 'registration-success',
                element: (
                    <PublicRoute>
                        <RegistrationSuccess />
                    </PublicRoute>
                ),
            },
            {
                path: 'verify-email',
                element: (
                    <PublicRoute>
                        <VerifyEmail />
                    </PublicRoute>
                ),
            },
            {
                path: 'forgot-password',
                element: (
                    <PublicRoute>
                        <ForgotPassword />
                    </PublicRoute>
                ),
            },
            {
                path: 'verification-otp',
                element: (
                    <PublicRoute>
                        <OtpVerification />
                    </PublicRoute>
                ),
            },
            { path: 'reset-password', element: <ResetPassword /> },
            { path: 'user', element: <UserMenuMobile /> },

            // === ADMIN DASHBOARD ===
            {
                path: 'dashboard',
                element: (
                    <ProtectedRoute>
                        <AdminDashboard />
                    </ProtectedRoute>
                ),
                children: [
                    { index: true, element: <DashboardRouter /> },
                    { path: 'profile', element: <Profile /> },
                    {
                        path: 'chat-support-customer',
                        element: <UnifiedChatPage />,
                    },

                    // === USER PAGES ===
                    { path: 'my-orders', element: <MyOrdersPage /> },
                    { path: 'address', element: <AddressPage /> },

                    // === STAFF BOARDS ===
                    {
                        path: 'waiter-board',
                        element: (
                            <RoleGuard allowedRoles={['WAITER', 'ADMIN']}>
                                <WaiterBoardPage />
                            </RoleGuard>
                        ),
                    },
                    {
                        path: 'chef-board',
                        element: (
                            <RoleGuard allowedRoles={['CHEF', 'ADMIN']}>
                                <ChefDashboard />
                            </RoleGuard>
                        ),
                    },
                    {
                        path: 'cashier-board',
                        element: (
                            <RoleGuard allowedRoles={['CASHIER', 'ADMIN']}>
                                <CashierDashboard />
                            </RoleGuard>
                        ),
                    },

                    {
                        path: 'category',
                        element: (
                            <AdminPermission>
                                <CategoryPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'sub-category',
                        element: (
                            <AdminPermission>
                                <SubCategoryPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'product',
                        element: (
                            <AdminPermission>
                                <ProductManagementPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'table',
                        element: (
                            <AdminPermission>
                                <TableManagementPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'table-orders',
                        element: (
                            <TableOrdersPermission>
                                <TableOrdersPage />
                            </TableOrdersPermission>
                        ),
                    },
                    {
                        path: 'booking',
                        element: (
                            <AdminPermission>
                                <BookingManagementPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'bill',
                        element: (
                            <AdminPermission>
                                <BillPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'report',
                        element: (
                            <AdminPermission>
                                <ReportPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'voucher',
                        element: (
                            <AdminPermission>
                                <VoucherPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'support-chat',
                        element: (
                            <AdminPermission>
                                <SupportChatAdmin />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: '*',
                        element: (
                            <div className="p-4 text-center">
                                Trang không tồn tại trong Dashboard
                            </div>
                        ),
                    },
                ],
            },

            // === PUBLIC PRODUCT BROWSING ===
            { path: ':category', element: <ProductListPage /> },
            { path: ':category/:subCategory', element: <ProductListPage /> },
            { path: 'product/:product', element: <ProductDisplayPage /> },
        ],
    },
]);

export default router;
