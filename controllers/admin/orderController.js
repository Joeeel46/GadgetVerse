const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const statusCodes = require("../../utils/statusCodes")

const getOrderPage = async (req, res) => {
    if (req.session.admin) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 5;
            const skip = (page - 1) * limit;

            // Fetch total orders count and calculate total pages
            const totalOrders = await Order.countDocuments();
            const totalPages = Math.ceil(totalOrders / limit);

            // Fetch paginated orders with required population
            const orders = await Order.find()
                .sort({ createdOn: -1 })
                .populate('userId', 'name') // Populate userId with only the name field
                .populate('orderedItems.product', 'productName') // Populate productName from Product model
                .skip(skip)
                .limit(limit);

            // Log orders for debugging
            console.log('Fetched Orders:', JSON.stringify(orders, null, 2));

            // Check if orders array has empty `orderedItems`
            if (orders.some(order => !order.orderedItems.length)) {
                console.warn('Warning: Some orders have empty orderedItems array.');
            }

            // Render orders page with fetched data
            res.render("orders", {
                orders: orders,
                totalPages,
                currentPage: page
            });
        } catch (error) {
            console.error('Error loading orders:', error);
            res.redirect("/admin/pageerror");
        }
    } else {
        res.redirect("/admin/login");
    }
};


const updateOrderStatus = async (req, res) => {
    if (!req.session.admin) {
        return res.status(statusCodes.UNAUTHORIZED).json({ message: "Unauthorized. Please log in as an admin." });
    }

    try {
        const { orderId, status } = req.body;
        console.log(req.body);
        

        if (!orderId || typeof orderId !== 'string' || !status || typeof status !== 'string') {
            console.error("Invalid orderId or status");
            return res.status(statusCodes.BAD_REQUEST).json({ message: "Order ID and status are required and must be strings." });
        }

        const updatedOrder = await Order.findOneAndUpdate({orderId:orderId}, { status }, { new: true });

        if (!updatedOrder) {
            console.error("Order not found"); 
            return res.status(statusCodes.NOT_FOUND).json({ message: "Order not found" });
        }

        res.json({ message: "Order status updated successfully", updatedOrder });
    } catch (error) {
        console.error('Error updating order status:', error); 
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while updating the order status" });
    }
};

module.exports = {
    getOrderPage,
    updateOrderStatus
}