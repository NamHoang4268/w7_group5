import toast from "react-hot-toast"

const AxiosToastError = (error) => {
    if (error?.suppressToast) {
        console.log('Toast suppressed for error:', error?.response?.data?.message || error?.message);
        return;
    }

    const message =
        error?.response?.data?.message ||
        error?.message ||
        (typeof error === "string" ? error : null) ||
        "Đã xảy ra lỗi không xác định";

    toast.error(message);
}

export default AxiosToastError;
