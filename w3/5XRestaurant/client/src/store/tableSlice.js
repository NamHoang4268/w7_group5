import { createSlice } from '@reduxjs/toolkit';

const initialValue = {
    allTable: [],
    loadingTable: false,
};

const tableSlice = createSlice({
    name: 'table',
    initialState: initialValue,
    reducers: {
        setAllTable: (state, action) => {
            state.allTable = [...action.payload];
        },
        setLoadingTable: (state, action) => {
            state.loadingTable = action.payload;
        },
    },
});

export const { setAllTable, setLoadingTable } = tableSlice.actions;

export default tableSlice.reducer;
