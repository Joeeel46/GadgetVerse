const Order = require('../../models/orderSchema.js'); 
const Product = require('../../models/productSchema.js'); 
const Wallet = require('../../models/walletSchema.js'); 


const returnItem = async (req, res) => {
    const orderId = req.query.id; // Order ID from the request query

    try {
        // 1. Find the order
        const order = await Order.findById(orderId).populate('orderedItems.product');
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        // 2. Update order status to "Returned"
        order.status = "Returned";
        await order.save();

        // 3. Update stock for each product in the orderedItems
        for (let item of order.orderedItems) {
            const product = await Product.findById(item.product._id);
            if (product) {
                product.quantity += item.quantity; // Increase product stock
                await product.save();
            }
        }

        // 4. Handle wallet refund
        let wallet = await Wallet.findOne({ userId: order.userId });

        if (!wallet) {
            // If no wallet exists, create one
            wallet = new Wallet({
                userId: order.userId,
                balance: 0,
                transactions: []
            });
        }

        // Add refund transaction
        const refundAmount = order.finalAmount; // Refund the final amount
        wallet.balance += refundAmount;

        wallet.transactions.push({
            type: 'Refund',
            amount: refundAmount,
            orderId: order._id,
            status: 'Completed',
            description: `Refund for returned order ${order.orderId}`
        });

        await wallet.save();

        // 5. Send success response
        res.status(200).json({
            success: true,
            message: "Product returned successfully, stock updated, and amount refunded to wallet.",
            walletBalance: wallet.balance
        });
    } catch (error) {
        console.error("Error in returnProduct route:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};



module.exports = {
    returnItem
}