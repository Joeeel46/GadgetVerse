const Order = require('../../models/orderSchema.js'); 
const Product = require('../../models/productSchema.js'); 
const Wallet = require('../../models/walletSchema.js'); 
const User = require("../../models/userSchema")
const Razorpay = require('razorpay');
require("dotenv").config();
const statusCodes = require("../../utils/statusCodes")

const razorpayInstance  = new Razorpay({
    key_id: "rzp_test_pgn7NyAMZL75UQ",
    key_secret: "a4yLpQ9zDLQ9RbCGwTFHgIUq"
});

const walletPayment = async (req,res)=>{
    const {amount} = req.body

    if(!amount || amount <= 0){
        return res.status(statusCodes.BAD_REQUEST).json({success:false,message:'Invalid amount'})
    }



    try{
        const order = await razorpayInstance.orders.create({
            amount: amount * 100,
            currency: 'INR',
            payment_capture:1,
        })

        res.json({success:true,orderId:order.id})

    }catch(error){
        console.log("Error creating Razorpay order:",error)
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({success:false,message:"Internal server error"})
    }

}

const updateWallet = async (req,res)=>{
    const {paymentId , razorpayId, signature ,amount } = req.body
    const userId = req.session.user
    
    try{
        const crypto = require('crypto')
        const secret = "a4yLpQ9zDLQ9RbCGwTFHgIUq"
        const hmac = crypto.createHmac('sha256',secret)

        hmac.update(`${razorpayId}|${paymentId}`)
        const generatedSignature = hmac.digest('hex')

        if(generatedSignature !== signature){
            throw new Error("Invalid Razorpay signauture")
        }

        let wallet = await Wallet.findOne({userId})

        if(!wallet){
            wallet = new Wallet({
                userId,
                balance : 0,
                transactions: []
            })
        }
        
        wallet.balance += Number(amount)

        wallet.transactions.push({
            type: 'Deposit',
            amount: Number(amount),
            status: 'Completed',
            description: 'Wallet Top-Up'
        })

        await wallet.save()

        res.status(statusCodes.OK).json({status:200 ,success: true, message: 'Wallet updated successfully'})
    }catch (error) {
        console.error('Error updating wallet:', error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to update wallet' });
    }
}

const returnItem = async (req, res) => {
    const orderId = req.query.id; 

    try {
        
        const order = await Order.findById(orderId).populate('orderedItems.product');
        if (!order) {
            return res.status(statusCodes.NOT_FOUND).json({ success: false, message: "Order not found." });
        }

       
        order.status = "Returned";
        await order.save();

        
        for (let item of order.orderedItems) {
            const product = await Product.findById(item.product._id);
            if (product) {
                product.quantity += item.quantity; 
                await product.save();
            }
        }

        
        let wallet = await Wallet.findOne({ userId: order.userId });

        if (!wallet) {
            
            wallet = new Wallet({
                userId: order.userId,
                balance: 0,
                transactions: []
            });
        }

        
        const refundAmount = order.finalAmount; 
        wallet.balance += refundAmount;

        wallet.transactions.push({
            type: 'Refund',
            amount: refundAmount,
            orderId: order._id,
            status: 'Completed',
            description: `Refund for returned order ${order.orderId}`
        });

        await wallet.save();

        res.status(statusCodes.OK).json({
            success: true,
            message: "Product returned successfully, stock updated, and amount refunded to wallet.",
            walletBalance: wallet.balance
        });
    } catch (error) {
        console.error("Error in returnProduct route:", error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error." });
    }
};



module.exports = {
    returnItem,
    walletPayment,
    updateWallet
}