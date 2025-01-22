const Razorpay = require('razorpay');
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema")
const User = require("../../models/userSchema")
const Coupon = require('../../models/couponSchema')
require("dotenv").config();
const crypto = require('crypto');
const { message } = require('statuses');
const statusCodes = require("../../utils/statusCodes");
const Cart = require('../../models/cartSchema');
const status = require('statuses');


const razorpay = new Razorpay({
    key_id: "rzp_test_pgn7NyAMZL75UQ",
    key_secret: "a4yLpQ9zDLQ9RbCGwTFHgIUq"
});




const createPayment = async (req, res) => {
    const { amount } = req.body;
    const amt = Number(amount)
    const options = {
        amount: amt * 100,
        currency: 'INR',
        receipt: 'receipt#1',
    };
    // console.log('bodyyyyy', req.body)

    try {
        const order = await razorpay.orders.create(options);
        // console.log("order",order)
        return res.json({ success: true, orderId: order.id });
    } catch (error) {
        console.error(error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to create order' });
    }
}



const updatePaymentStatus = async (req, res) => {
    try {

        const userId = req.session.user
        const { paymentId, orderId, razorpayId, signature } = req.body;
        // console.log(req.body)

        const generatedSignature = crypto.createHmac('sha256', "a4yLpQ9zDLQ9RbCGwTFHgIUq")
            .update(razorpayId + "|" + paymentId)
            .digest('hex');
        // console.log("generatedSignature:", generatedSignature, "signature:", signature)
        
        if (generatedSignature !== signature) {
            const order = await Order.findOneAndUpdate(
                { _id: orderId },
                { paymentStatus: 'Failed' },
                { new: true }
            );
            console.log("fail payment")
            if (!order) {
                return res.status(statusCodes.NOT_FOUND).json({ success: false, message: 'Order not found.' });
            } else {
                return res.status(statusCodes.NOT_FOUND).json({ success: false, message: 'Payment  failed!' });
            }

        }

        const order = await Order.findOneAndUpdate(
            { _id: orderId },
            { paymentStatus: 'Completed' ,status: 'Processing'},
            { new: true }
        );
        console.log('userrrrIdddd',userId)
        await Cart.findOneAndDelete({userId})
        
        if (order && order.orderedItems.length > 0) {
            for (const item of Object.values(order.orderedItems)) {
                await Product.findByIdAndUpdate(
                    { _id: item.product },
                    { $inc: { quantity: -item.quantity } }
                );
            }
        }
        
        if (!order) {
            return res.status(statusCodes.NOT_FOUND).json({ success: false, message: 'Order not found.' });
        }

        return res.status(statusCodes.OK).json({ success: true, orderId: order._id });
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal Server Error' });
    }
}

const updateRepaymentStatus = async (req, res) => {
    try {

        const { paymentId, orderId, razorpayId, signature } = req.body;
        

        const generatedSignature = crypto.createHmac('sha256', "a4yLpQ9zDLQ9RbCGwTFHgIUq")
            .update(razorpayId + "|" + paymentId)
            .digest('hex');
        // console.log("generatedSignature:", generatedSignature, "signature:", signature)

        

        if (generatedSignature === signature) {
            const order = await Order.findOneAndUpdate(
                { _id: orderId },
                { paymentStatus: 'Completed' ,status: 'Processing' },
                { new: true }
            );
            
            if (!order) {
                return res.status(statusCodes.NOT_FOUND).json({ success: false, message: 'Order not found.' });
            }

            for(let item of Object.values(order.orderedItems)){
                await Product.findByIdAndUpdate(
                    {_id:item.product},
                    {$inc:{quantity:-item.quantity}}
                )
            }

            return res.status(statusCodes.BAD_REQUEST).json({ success: true, message: 'Payment Completed!' });
            
        }
        if (generatedSignature !== signature) {
            
            return res.status(statusCodes.NOT_FOUND).json({ success: false, message: 'Payment  failed!' });
            
        }
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal Server Error' });
    }
}

const retryPayment = async (req, res) => {
    const { orderId, amount } = req.body;

    try {

        const orders = await Order.findOne({orderId})
        
        for (const item of Object.values(orders.orderedItems)) {
            const product = await Product.findById(item.product)
            // console.log('prodcut',product)
            // console.log('quantity',product.quantity , item.quantity)
            if(product.quantity < item.quantity){
                
                return res.status(400).json({status:400,success: false, message: `Insufficient stock for ${product.productName}, try again later!`})
            }
            if(product.isBlocked){
                return res.status(400).json({status:400,success: false, message: `Product ${product.productName} is blocked!`})
            }
        }

        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: `${orderId}`,
        };

        const razorpayOrder = await razorpay.orders.create(options);
        res.json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: process.env.RAZORPAY_KEY_ID,
            orderId,
        });
    } catch (error) {
        console.error('Error retrying payment:', error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to retry payment' });
    }
};
const ondismiss = async (req, res) => {
    try {
        
        const userId = req.session.user
        const orderId = req.body.orderId;
        console.log('orderId',orderId)
        const orderData = await Order.findByIdAndDelete({ _id: orderId });
        await Coupon.findOneAndUpdate({name:orderData.couponCode},{$pull:{userId:userId}})
        console.log("order Data", orderData)
    
        return res.status(statusCodes.OK).json({ success: true })

    } catch (error) {
        console.log(error);
    }
}

const getCouponList = async (req, res) => {
    try {

        const user = req.session.user;
        if (!user) {
            return res.redirect('/login');
        }

        const coupons = await Coupon.find({
            isList: true,
            userId: { $ne: user },
        }).select('name offerPercentage minimumPrice maxDiscount expiredOn');

        res.render('couponList', { coupons });

    } catch (error) {
        console.log('error', error)
    }
}

const applyCoupon = async (req, res) => {
    try {
        const { couponCode, totalPrice } = req.body;
        const userId = req.session.user
        const userData = await User.findById(userId)

        if(userData.usedCoupon.includes(couponCode)){
            return res.status(statusCodes.BAD_REQUEST).json({message:"Coupon already used before!", icon:"warning"})
        }

        // Validate input
        if (!couponCode || !totalPrice) {
            return res.status(statusCodes.BAD_REQUEST).json({ message: "Coupon code and total price are required" });
        }

        // Find the coupon in the database
        const coupon = await Coupon.findOne({ name: couponCode });

        if (!coupon) {
            return res.status(statusCodes.NOT_FOUND).json({ message: "Invalid coupon code" });
        }

        if (coupon) {

            // Check if the total price is eligible for the discount
            if (totalPrice >= coupon.minimumPrice) {
                const discount = Math.min((totalPrice * coupon.offerPercentage) / 100, coupon.maxDiscount);
                const newTotal = totalPrice - discount;

                // Send success response
                
                return res.status(statusCodes.OK).json({
                    message: "Coupon applied successfully",
                    discountAmount: discount.toFixed(2),
                    newSubtotal: newTotal.toFixed(2),
                    maxDiscount: coupon.maxDiscount
                });
            } else {
                // Total price doesn't meet minimum requirement
                return res.status(statusCodes.BAD_REQUEST).json({
                    message: `This coupon requires a minimum purchase of ₹${coupon.minimumPrice}`,
                });
            }
        } else {
            // Coupon not found
            return res.status(statusCodes.NOT_FOUND).json({ message: "Invalid coupon code" });
        }
    } catch (error) {
        console.error("Error applying coupon:", error);
        return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
            message: "An error occurred while applying the coupon. Please try again later.",
        });
    }
};




const removeCoupon = async (req, res) => {
    try {
        // Destructure and parse input values
        const { originalPrice, discountRow } = req.body;
        
        if (isNaN(originalPrice) || isNaN(discountRow)) {
            return res.status(statusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid price or discount value"
            });
        }

        // Calculate subtotal
        const subtotal = parseFloat(originalPrice) + parseFloat(discountRow);
        // console.log(subtotal);

        return res.status(statusCodes.OK).json({
            success: true,
            subtotal: subtotal,
            message: "Coupon removed successfully"
        });
    } catch (error) {
        console.error('Error removing coupon:', error);
        return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to remove coupon"
        });
    }
};





module.exports = {
    createPayment,
    updatePaymentStatus,
    retryPayment,
    ondismiss,
    getCouponList,
    applyCoupon,
    removeCoupon,
    updateRepaymentStatus
}