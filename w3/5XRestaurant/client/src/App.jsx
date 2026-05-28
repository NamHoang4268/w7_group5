import { Outlet, useLocation } from 'react-router-dom';
import './App.css';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import fetchUserDetails from './utils/fetchUserDetails';
import { useDispatch } from 'react-redux';
import { setUserDetails } from './store/userSlice';
import {
    setAllCategory,
    setLoadingCategory,
    setAllSubCategory,
} from './store/productSlice';
import Axios from './utils/Axios';
import SummaryApi from './common/SummaryApi';
import GlobalProvider from './provider/GlobalProvider';
import AxiosToastError from './utils/AxiosToastError';
import Header from './components/home/Header';
import LiquidEther from './components/LiquidEther';
import { SupportChatProvider } from './contexts/SupportChatContext';
import FloatingChatLauncher from './components/FloatingChatLauncher';
import LightPillarClient from '@/components/animations/LightPillarClient';
import Plasma from './components/animations/Plasma';

function App() {
    const dispatch = useDispatch();
    const location = useLocation();

    // Layouts mà KHÔNG hiện Header/Footer (auth pages)
    const hideLayout = [
        '/login',
        '/register',
        '/registration-success',
        '/forgot-password',
        '/verification-otp',
        '/reset-password',
        '/verify-email',
    ].some((path) => location.pathname.startsWith(path));

    // Layouts riêng: admin dashboard, table flow, kitchen
    const dashBoardLayout = [
        '/admin',
        '/dashboard',
        '/table-menu',
        '/table-order-management',
        '/table-payment-success',
        '/kitchen',
        '/customer-checkin',
    ].some((path) => location.pathname.startsWith(path));

    useEffect(() => {
        (async () => {
            // 1) User
            const res = await fetchUserDetails();
            dispatch(setUserDetails(res?.success ? res.data : null));

            // 2) Category + SubCategory (song song)
            try {
                dispatch(setLoadingCategory(true));
                const [catRes, subCatRes] = await Promise.all([
                    Axios({ ...SummaryApi.get_category }),
                    Axios({ ...SummaryApi.get_sub_category }),
                ]);

                if (catRes.data?.success) {
                    dispatch(
                        setAllCategory(
                            catRes.data.data.sort((a, b) =>
                                a.name.localeCompare(b.name)
                            )
                        )
                    );
                }
                if (subCatRes.data?.success) {
                    dispatch(
                        setAllSubCategory(
                            subCatRes.data.data.sort((a, b) =>
                                a.name.localeCompare(b.name)
                            )
                        )
                    );
                }
            } catch (e) {
                AxiosToastError(e);
            } finally {
                dispatch(setLoadingCategory(false));
            }
        })();
    }, [dispatch]);

    const liquidEther = (
        <div className="fixed inset-0 z-0 pointer-events-none">
            {/* <LightPillarClient
                topColor="#f5e6d3"
                bottomColor="#d4a574"
                intensity={1.0}
                rotationSpeed={0.8}
                interactive={true}
                glowAmount={0.002}
                pillarWidth={3.0}
                pillarHeight={0.5}
                noiseIntensity={0.1}
                mixBlendMode="screen"
                pillarRotation={15}
            /> */}
            <Plasma
                direction="pingpong"
                color="#d4a574"
                speed={2.5}
                opacity={1}
                scale={0.5}
                mouseInteractive={true}
            />
        </div>
    );

    return (
        <GlobalProvider>
            <SupportChatProvider>
                {/* === Trang khách hàng (có Header + Footer) === */}
                {!hideLayout && !dashBoardLayout && (
                    <>
                        <Header />
                        <main className="min-h-[80vh]">
                            {liquidEther}
                            <div className="relative">
                                <Outlet />
                            </div>
                        </main>
                        {/* <Footer /> */}
                    </>
                )}

                {/* === Auth pages (không Header/Footer) === */}
                {hideLayout && (
                    <main className="min-h-screen">
                        {liquidEther}
                        <div className="relative">
                            <Outlet />
                        </div>
                    </main>
                )}

                {/* === Dashboard / Table / Kitchen / Waiter layouts === */}
                {dashBoardLayout && (
                    <main className="min-h-screen">
                        {liquidEther}
                        <div className="relative">
                            <Outlet />
                        </div>
                    </main>
                )}

                <Toaster />

                {/* Floating Chat Launcher — AI + Support, chỉ hiện trên trang khách hàng */}
                {!hideLayout && !dashBoardLayout && <FloatingChatLauncher />}
            </SupportChatProvider>
        </GlobalProvider>
    );
}

export default App;
