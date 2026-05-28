import { createSlice } from '@reduxjs/toolkit'

const initialValue = {
    _id: '',
    name: '',
    email: '',
    avatar: '',
    mobile: '',
    verity_email: '',
    last_login_date: '',
    status: '',
    shopping_cart: [],
    orderHistory: [],
    role: '',
    rewardsPoint: 0
}

const userSlice = createSlice({
    name: 'user',
    initialState: initialValue,
    reducers: {
        setUserDetails: (state, action) => {
            state._id = action.payload?._id
            state.name = action.payload?.name
            state.email = action.payload?.email
            state.avatar = action.payload?.avatar
            state.mobile = action.payload?.mobile
            state.verity_email = action.payload?.verity_email
            state.last_login_date = action.payload?.last_login_date
            state.status = action.payload?.status
            state.shopping_cart = action.payload?.shopping_cart
            state.orderHistory = action.payload?.orderHistory
            state.role = action.payload?.role
            state.rewardsPoint = action.payload?.rewardsPoint
        },
        updatedAvatar: (state, action) => {
            state.avatar = action.payload
        },
        logout: (state) => {
            state._id = ''
            state.name = ''
            state.email = ''
            state.avatar = ''
            state.mobile = ''
            state.verity_email = ''
            state.last_login_date = ''
            state.status = ''
            state.shopping_cart = []
            state.orderHistory = []
            state.role = ''
            state.rewardsPoint = 0
        },
        updateUserPoints: (state, action) => {
            if (action.payload !== undefined) {
                state.rewardsPoint = action.payload;
            }
        }
    }
})

export const { setUserDetails, logout, updatedAvatar, updateUserPoints } = userSlice.actions

export default userSlice.reducer