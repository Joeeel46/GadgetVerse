const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const { response } = require("express");
const statusCodes = require("../../utils/statusCodes")

const getWishlist = async (req,res)=>{
    try {
        const userId = req.session.user
        const wishlist = await Wishlist.findOne({userId}).populate('products.productId');
        if (!wishlist) {
            
            return res.render('wishlist', { products: [] });
        }
        res.render('wishlist',{products:wishlist.products})
    } catch (error) {
        console.log(error)
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({error: 'Internal server error'})
    }
}

const addToWishlist = async (req,res)=>{
    const userId = req.session.user
    const productId = req.body.product_id
    // console.log(userId)
    // console.log(productId)

   try {
        const wishlist = await Wishlist.findOne({userId})

        if(wishlist){
            const productExists = wishlist.products.some(item => item.productId.toString() === productId.toString());
            if (productExists) {
                return res.json({ message: "Product Already Exist in Wishlist!" });
            }
            wishlist.products.push({productId,added_at: new Date()})
            await wishlist.save()
        }else{
            const newWishlist = new Wishlist({
                userId,
                products:[{productId,added_at:new Date()}]
            })
            await newWishlist.save()
        }
        res.status(statusCodes.OK).json({message:'Product added to wishlist!'})
    } catch (error) {
        console.log(error)
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({error: 'Internal server error'})
    }
}

const removeWishlistItem = async (req,res) => {
    try {
        
        const userId = req.session.user;
        const { productId } = req.body;

        await Wishlist.findOneAndUpdate(
            {userId:userId},
            {$pull:{products:{productId:productId}}}
        )

        res.redirect('/wishlist')

    } catch (error) {
        
    }
  }


module.exports = {
    addToWishlist,
    getWishlist,
    removeWishlistItem
}



