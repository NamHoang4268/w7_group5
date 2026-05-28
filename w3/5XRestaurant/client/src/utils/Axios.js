import axios from "axios";
import SummaryApi, { baseURL } from "../common/SummaryApi";

let isLoggingOut = false;

// Hàm set flag từ bên ngoài
export const setIsLoggingOut = (value) => {
    isLoggingOut = value;
};

// Tạo instance riêng
const Axios = axios.create({
    baseURL: baseURL,
    withCredentials: true, // gửi cookie nếu có
});

// Request interceptor
Axios.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem("accesstoken");
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor
Axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            // Nếu là do logout thì bỏ qua, không redirect và không show toast
            if (isLoggingOut) {
                return Promise.reject({ ...error, suppressToast: true });
            }

            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem("refreshToken");
                if (refreshToken) {
                    const newAccessToken = await refreshAccessToken(refreshToken);
                    if (newAccessToken) {
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                        return Axios(originalRequest);
                    }
                }
            } catch (refreshError) {
                console.error("Refresh token failed:", refreshError);
            }

            // Refresh fail → clear token và redirect login (chỉ 1 lần)
            localStorage.removeItem("accesstoken");
            localStorage.removeItem("refreshToken");

            // Kiểm tra nếu chưa ở trang login VÀ không phải trang Home thì mới redirect
            if (window.location.pathname !== "/login" && window.location.pathname !== "/") {
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);

// Hàm refresh token
const refreshAccessToken = async (refreshToken) => {
    try {
        const response = await axios({
            ...SummaryApi.refresh_token,
            baseURL: baseURL, // Add baseURL here
            headers: {
                Authorization: `Bearer ${refreshToken}`,
            },
        });

        const accessToken = response.data?.data?.accessToken;
        if (accessToken) {
            localStorage.setItem("accesstoken", accessToken);
        }
        return accessToken;
    } catch (error) {
        console.error("Error refreshing token:", error);
        return null;
    }
};

export default Axios;
