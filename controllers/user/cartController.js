const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");

const getCart = async (req,res)=>{
    try {
        const user = req.session.user
        if(!user){
            res.redirect("/login")
        }else{
            let cart = await Cart.findOne({userId:user._id}).populate('items.productId')

            if(!cart){
                return res.render('cart',{cart:null,product:[],totalAmount:0})
            }else{
                const totalAmount = cart.items.reduce((sum,item)=> sum + item.totalPrice,0)
                res.render('cart',{cart:cart,products:cart.items,totalAmount})
            }
            
        }
        
    } catch (error) {
        console.error("Error on getting cart")
    }
}

const saveToCart = async (req,res)=>{
    try {
        if(req.session.user){
            const userId = req.session.user._id
            
        }
    } catch (error) {
        
    }
}

module.exports = {
    getCart
}