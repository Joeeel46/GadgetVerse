const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Category = require("../../models/categorySchema");
const statusCodes = require("../../utils/statusCodes")

const showSaleReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        
        // Fetch paginated orders
        const orderData = await Order.find()
            .populate('userId')
            .populate({
                path: 'orderedItems.product',
                select: 'productName price'
            })
            .sort({ createdOn: -1 }) // Sort by newest orders
            .skip(skip)
            .limit(limit);

        // Calculate totals across ALL orders
        const allOrders = await Order.find()
            .populate('userId', '_id'); // Only populate necessary fields

        // Calculate total sales (final amount)
        const totalSales = allOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);

        // Calculate total discount
        const totalDiscount = allOrders.reduce((sum, order) => sum + (order.discount || 0), 0);

        // Calculate unique customers
        const uniqueCustomerIds = new Set(allOrders.map(order => 
            order.userId ? order.userId._id.toString() : null
        ));
        const totalCustomers = uniqueCustomerIds.size;

        // Count total documents for pagination
        const count = await Order.countDocuments();
        const totalPages = Math.ceil(count / limit);

        // Render the page with all necessary data
        res.render("sales-report", {
            orders: orderData,
            activePage: "sales-report",
            count,
            totalPages,
            page,
            totalSales,
            totalDiscount,
            totalCustomers
        });
    } catch (error) {
        console.error("Error in showSaleReport:", error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).send("An error occurred while generating the sales report.");
    }
};

const saleReportPDF = async (req, res) => {
    
    
    try {
        const allOrders = await Order.find()
            .populate({
                path: 'userId',
                select: 'name email phone' // Added phone as per schema
            })
            .populate({
                path: 'orderedItems.product',
                select: 'productName price' // Added price selection
            })
            .sort({ createdOn: -1 })
            .lean(); // Use lean() for better performance when just reading data
             
            
        // Transform orders to include more details
        const transformedOrders = allOrders.map(order => ({
            ...order,
            orderedItemsDetails: order.orderedItems.map(item => ({
                productName: item.product.productName,
                quantity: item.quantity,
                price: item.price
            })),
            userName: order.userId.name,
            userEmail: order.userId.email,
            userPhone: order.userId.phone
        }));
        


        res.json({
            orders: transformedOrders,
            totalOrders: allOrders.length,
            totalSales: allOrders.reduce((sum, order) => sum + order.finalAmount, 0),
            totalDiscount: allOrders.reduce((sum, order) => sum + order.discount, 0),
            uniqueCustomers: new Set(allOrders.map(order => order.userId.toString())).size
        });
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch orders', error: error.message });
    }
};
  
module.exports={
    showSaleReport,
    saleReportPDF
}