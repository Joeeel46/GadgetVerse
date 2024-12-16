const Order = require("../../models/orderSchema");


const showSaleReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 15;
        const skip = (page - 1) * limit;
        
        const orderData = await Order.find()
            .populate({
                path: 'userId',
                select: 'name email phone' 
            })
            .populate({
                path: 'orderedItems.product',
                select: 'productName price'
            })
            .sort({ createdOn: -1 }) // Sort by newest orders
            .skip(skip)
            .limit(limit);

        // Count total documents for pagination
        const count = await Order.countDocuments();
        const totalPages = Math.ceil(count / limit);

        // Log usernames of users who placed the orders (for debugging)
        orderData.forEach(order => {
            if (order.userId && order.userId.username) {
                console.log(order.userId.username);
            }
        });
        console.log(orderData)
        if (orderData) {
            res.render("salesreport", {
                orders: orderData,
                activePage: "sales-report",
                count,
                totalPages,
                page
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("An error occurred while generating the sales report.");
    }
};



  
module.exports={
    showSaleReport
}