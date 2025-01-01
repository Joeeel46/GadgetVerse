const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const Order = require('../../models/orderSchema')
const Wallet = require('../../models/walletSchema')

const productDetails = async (req,res)=>{
    try {
        const userId = req.session.user
        const userData = await User.findById(userId)
        const productId = req.query.id
        const product = await Product.findById(productId).populate('category')
        
        const findCategory = product.category.name;
       
        const categoryOffer = product.category.categoryOffer || 0
        const productOffer = product.productOffer || 0 
        console.log(categoryOffer)
        
        res.render("product-details",{
            user:userData,
            product:product,
            quantity:product.quantity,
            productOffer,
            category:findCategory,
            categoryOffer
        })

    } catch (error) {
        console.error("Error for fetching product details",error)
        res.redirect("/pageNotFound")
    }
}
//wallet
const cancelOrder = async (req, res) => {
    try {
  
      const userId = req.session.user;
      const id = req.query.id;
      const reason = req.query.reason;
      await Order.findByIdAndUpdate(id, { $set: { status: 'Cancelled',cancellationReason:reason } });
      const order = await Order.findById(id);
      console.log(order.paymentMethod);
  
      if(order.paymentMethod === "online"){
        const walletData = {
          $inc: { balance: order.totalPrice },
          $push: { 
            transactions: {
              type: "Refund",
              amount: order.totalPrice,
              orderId: order._id
            }
          }
        }
        console.log(walletData)
    
        const walletUpdate = await Wallet.findOneAndUpdate(
          {userId:userId},
          walletData,
          { upsert: true, new: true }
        );
    
        if(!walletUpdate){
          throw new Error("Failed to update wallet");
        }
      }
  
      res.redirect('/userProfile')
  
    } catch (error) {
      console.error("Error loading orders page", error);
      res.status(500).redirect('/page-not-found');
    }
}

module.exports = {
    productDetails,
    cancelOrder
}