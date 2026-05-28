// kitchen.socket.js – Quản lý socket events cho Kitchen Workflow

export const registerKitchenSocket = (io) => {
    io.on("connection", (socket) => {
        // Bếp join room
        socket.on("kitchen:join", () => {
            socket.join("kitchen");
            console.log(`[Kitchen] Chef joined: ${socket.id}`);
        });

        // Waiter join room
        socket.on("waiter:join", () => {
            socket.join("waiter");
            console.log(`[Kitchen] Waiter joined: ${socket.id}`);
        });

        // Bàn gửi đơn lên bếp
        socket.on("kitchen:send_order", (data) => {
            // data: { orderId, tableId, tableName, items }
            io.to("kitchen").emit("kitchen:new_order", data);
            console.log(`[Kitchen] New order from table ${data.tableName}`);
        });

        // Bếp báo món xong → waiter nhận
        socket.on("dish:ready", (data) => {
            // data: { orderId, itemId, tableId, tableName, productName }
            io.to("waiter").emit("dish:ready", data);
            console.log(`[Kitchen] Dish ready: ${data.productName} - Table ${data.tableName}`);
        });

        // Waiter xác nhận đã phục vụ → update màn hình bếp
        socket.on("dish:served", (data) => {
            // data: { orderId, itemId, tableId }
            io.to("kitchen").emit("dish:served", data);
            // Also notify the table
            io.to(`table_${data.tableId}`).emit("dish:served", data);
            console.log(`[Kitchen] Dish served: table ${data.tableId}`);
        });

        socket.on("disconnect", () => {
            console.log(`[Kitchen] Socket disconnected: ${socket.id}`);
        });
    });
};
