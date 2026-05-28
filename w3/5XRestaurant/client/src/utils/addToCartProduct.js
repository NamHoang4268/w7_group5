import SummaryApi from "../common/SummaryApi"
import Axios from "./Axios"
import { toast } from 'react-hot-toast';
import AxiosToastError from './AxiosToastError';

export const addToCartProduct = async (productId, qty) => {
    try {
        const response = await Axios({
            ...SummaryApi.add_to_cart,
            data: {
                quantity: qty,
                productId: productId
            }
        })

        const { data: responseData } = response

        if (responseData.success) {
            toast.success(responseData.message)
        }
        return responseData

    } catch (error) {
        AxiosToastError(error)
        return {}
    }
}

export const getCartItems = async () => {
    try {
        const response = await Axios({
            ...SummaryApi.get_cart_item
        })

        const { data: responseData } = response

        if (responseData.success) {
            return responseData
        }
    } catch (error) {
        AxiosToastError(error)
        return error
    }
}