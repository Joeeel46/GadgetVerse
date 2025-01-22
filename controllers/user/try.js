// const mongoose = require('mongoose');
// const User = require("../../models/userSchema");
// const Product = require("../../models/productSchema");
// const Category = require("../../models/categorySchema");
// const Cart = require("../../models/cartSchema");
// const Wallet = require("../../models/walletSchema");
// const Address = require("../../models/addressSchema");
// const Order = require("../../models/orderSchema");
// const Wishlist = require("../../models/wishlistSchema");
// const status = require('statuses');


// const addToWishlist = async (req,res)=>{
//     try {

//         const userId = req.session.user
//         if(!userId){
//             return res.json({success:false,message:"No user found!"})
//         }
//         const {productId} = req.body

//         let wishlist = await Wishlist.findOne({userId})
//         if(!wishlist){
//             wishlist = new Wishlist({userId,products:[]})
//             await wishlist.save()
//         }
//         const exist = wishlist.products.find(product=> product.productId === productId)
//         if(exist){
//             return res.json({success:false,message:"Product already exists!"})
//         }
//         wishlist.products.push({productId})
//         await wishlist.save()
//         return res.json({success:true,message:"Product added to wishlist!"})

//     } catch (error) {
//         console.log(error)
//     }
// }


// const orderDetails = async (req,res)=>{
//     try {
        
//         const userId = req.session.user
//         const order = await Order.findOne({userId})
//         if(!order){
//             return res.json({success:false,message:"No orders found"})
//         }
//         return res.json({success:true,message:`Order status ${order.status}, products are ${order.orderedItems}`})

//     } catch (error) {
//         console.log(error)
//     }
// }



// const allorders = async (req,res)=>{
//     try {

//         const userId = req.session.user
//         const page = req.query.page || 1
//         const limit = 10
//         const orders = await Order.find({_id:userId}).populate('orderedItems.product','name price').skip((page - 1)*limit).limit(limit)

//         if(!orders){
//             return res.json({success:false,message:"No orders found"})
//         }
//         const orderDetails = orders.map(order => ({
//             orderId:order.orderId,
//             totalPrice:order.totalPrice,
//             items:order.orderedItems.length,
//             itemDetails:order.orderedItems.map(item => {
//                 productId:item.product._id,
//                 name:item.name,
//                 price:item.price
//             })
//         }))

//         return res.json({orders:orderDetails})

//     } catch (error) {
//         console.log(error)
//     }
// }