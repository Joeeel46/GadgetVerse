const mongoose = require('mongoose');
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const { log } = require('npmlog');


const getCart = async (req,res)=>{
    try {
        const userId = req.session.user;
        
        const user = await User.findById(userId)
        let cart = await Cart.findOne({userId:userId}).populate('items.productId')
        

        if(!cart){
            return res.render('cart',{products:[],totalAmount:0,user})
        }
        
        const totalAmount = cart.items.reduce((sum,item)=> sum + item.totalPrice,0)
        res.render('cart',{products:cart.items,totalAmount,user})
        
    } catch (error) {
        console.error("Error on getting cart")
    }
}

const addToCart = async (req,res)=>{
    try {
        
        if(req.session.user){
            const userId = req.session.user
            
            const {productId} = req.query
            
            const quantity = req.query.quantity
            
            
            const quantityNumber = parseInt(quantity,10) || 1
            
            const product = await Product.findById(productId)
           
            
            const productPrice = product.salePrice
            const itemTotalPrice = productPrice * quantityNumber
            let cart = await Cart.findOne({userId:userId})

            if(!cart){
                cart = new Cart({
                    userId,
                    items:[{
                        productId,
                        quantity:quantityNumber,
                        price:productPrice,
                        totalPrice:itemTotalPrice
                    }]
                })
            }else{
                const itemIndex = cart.items.findIndex(item => item.productId.equals(productId))
                if(itemIndex > -1){
                        const existingQuantity = cart.items[itemIndex].quantity;
                        if (existingQuantity + quantityNumber <= 5) {
                            cart.items[itemIndex].quantity += quantityNumber
                            cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity * productPrice
                        }
                    await cart.save();
                    

                }else{
                    cart.items.push({
                        productId,
                        quantity:quantityNumber,
                        price:productPrice,
                        totalPrice:itemTotalPrice
                    })
                }
            }
            await cart.save()
            return res.status(200).redirect('/cart')
        }else{
            res.redirect('/login')
        }
    } catch (error) {
        console.error("Error adding to cart:",error)
        res.status(500).send("Error adding to cart")
    }
}

const removeCart = async (req,res)=>{
    try {
        const userId = req.session.user
        const {productId} = req.query

        const cart = await Cart.findOne({userId})

        if(cart){
            let itemIndex = cart.items.findIndex(item => item.productId.equals(productId))
            // console.log(itemIndex)
            cart.items.splice(itemIndex,1)
            await cart.save()
        }
        res.redirect("/cart")
    } catch (error) {
        console.error("Error removing from cart:",error)
        res.status(500).send("Error removing from cart")
    }
}

const checkOut = async (req,res)=>{
    try {
        const userId = req.session.user
        const user = await User.findById(userId)
        const productId = req.query.productId
        const qty = parseInt(req.query.quantity)
        
        const addresses = (await Address.findOne({userId})) || []
        
        let totalPrice
        
        if(productId){
            const product = await Product.findById(productId)
            if(!product || product.isBlocked){
                return res.status(404).redirect("/pageNotFound")
            }
            totalPrice = product.salePrice
            return res.render('checkout',{carts:null,product,addresses:addresses.address,totalPrice,user,qty})

        }else{
            const cartItems = await Cart.findOne({userId}).populate('items.productId')
            if(!cartItems || cartItems.items.length === 0){
                return res.redirect('/cart')
            }
            const activeItems = cartItems.items.filter(item=>item.productId && !item.productId.isBlocked && item.productId.quantity >= item.quantity)
            // if(activeItems.length === 0){
            //     return res.redirect('/cart')
            // }
           
            totalPrice = activeItems.reduce((sum,item)=>sum + item.totalPrice,0)
            console.log(totalPrice)
            return res.render('checkout',{carts:cartItems,addresses:addresses.address,totalPrice,product:null,user})
        }

        
    } catch (error) {
        console.error(error)
        res.status(500).send("Error retrieving checkout information")
    }
}

const saveOrder = async (req, res) => {
    try {
        const user = await User.findById({ _id: req.session.user });
        // console.log("User fetched successfully.");
    
        // Directly use req.body.formData
        const data = req.body.formData || req.body;
        console.log(data);
        const {
          singleProduct,
          cart,
          totalPrice,
          finalAmount,
          address,
          discount,
          payment_option,
          cartData,
          singleProductId,
          singleProductQuantity,
          couponCode,
        } = data;
        // console.log("finalAMount,discount",)
        const addresses = await Address.findOne({ userId: req.session.user });
        console.log("cart",data)
    
        if (!addresses || !addresses.address || addresses.address.length === 0) {
          return res
            .status(400)
            .json({ success: false, message: "No saved addresses found" });
        }
      const selectedAddress = addresses.address.find(
        (addr) => addr._id.toString() === address.toString()
      );
      if (!selectedAddress) {
        return res
          .status(404)
          .json({ success: false, message: "Selected address not found" });
      }
  
      const shippingAddress = {
        addressType: selectedAddress.addressType,
        name: selectedAddress.name,
        city: selectedAddress.city,
        landMark: selectedAddress.landMark,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
        phone: selectedAddress.phone,
        altPhone: selectedAddress.altPhone,
      };
      
  
      if (cartData && Object.values(cartData).length > 0) {
        for (const item of Object.values(cartData)) {
          await Product.findByIdAndUpdate(
            { _id: item.productId },
            { $inc: { quantity: -item.quantity } }
          );
        }
      }
      
      if (singleProductId && mongoose.Types.ObjectId.isValid(singleProductId)) {
        // Handle NaN and default to 1
        const quantityToUpdate = singleProductQuantity && !isNaN(singleProductQuantity)
          ? parseInt(singleProductQuantity, 10)
          : 1;

          console.log("wewfd",singleProductId)
        await Product.findByIdAndUpdate(
          { _id: singleProductId },
          { $inc: { quantity: -quantityToUpdate } }
        );
      }
  
      let orderedItems = [];
      const product = singleProduct ? JSON.parse(singleProduct) : null;
      console.log("product",product)
      if (product && product._id) {
        orderedItems.push({
          product: product._id,
          quantity: 1,
          price: product.salePrice,
        });
        console.log("orderf=desnlcsndkcls",orderedItems)
      } 
      if (cart !== '[]') {
        const cartItems = JSON.parse(cart);
        orderedItems = cartItems.map((item) => ({
          product: (item.productId), // Ensure ObjectId type
          quantity: item.quantity,
          price: item.totalPrice,
        }));
        const cart1 = await Cart.findOne({ userId: req.session.user });
        cart1.items = [];

        const cartsav = await cart1.save();
      }
      if(!cart){
        try {
            const cartItems = JSON.parse(cart); // Ensure JSON parsing succeeds
            if (!Array.isArray(cartItems)) {
                throw new Error("Carts is not an array");
            }
            orderedItems = cartItems.map(item => ({
                product: mongoose.Types.ObjectId(item.productId),
                quantity: item.quantity,
                price: item.totalPrice,
            }));
        } catch (err) {
            console.error("Error parsing carts:", err.message);
        }
    }


      let payment_status;
      if (payment_option == "online") {
        payment_status = "Completed";
        
      } 
      console.log("Hello aldmaksdjaknxsjksan",orderedItems)
      const newOrder = new Order({
        userId: user._id,
        orderedItems,
        totalPrice,
        finalAmount,
        shippingAddress: shippingAddress,
        paymentMethod: payment_option,
        paymentStatus: payment_status,
        couponCode,
        discount,
        status: "Pending",
        createdOn: Date.now(),
        invoiceDate: new Date(),
      });
      

      
      
      if (!newOrder) {
        console.log("Order not placed");
      }
      if (cartData) {
        const cart = await Cart.findOne({ userId: req.session.user });
        cart.items = [];

        const cartsav = await cart.save();
        if(cartsav){
            console.log('sav',cartsav)
        }
      }
  
      await newOrder.save();
      user.orderHistory.push(newOrder._id);
      await user.save();
    //   console.log("Address of order:", address, "New Order:", newOrder);
  
      payment_option == "online"
        ? res.status(200).json({ success: "true", orderId: newOrder._id })
        : res.render("order-placed", { orderId: newOrder._id });
    
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).send("Internal Server Error");
    }
};



const getOrderPlacedPage = async (req,res)=>{
    try {
        const { orderId } = req.query;
        res.render('order-placed',{orderId})
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const getSortedPage = async (req, res) => {
    const { sortBy } = req.query;

    let sortCriteria;
    switch (sortBy) {
        case 'mostPopular':
            sortCriteria = { popularity: -1 };
            break;
        case 'priceLowHigh':
            sortCriteria = { salePrice: 1 };
            break;
        case 'priceHighLow':
            sortCriteria = { salePrice: -1 };
            break;
        case 'newArrivals':
            sortCriteria = { createdAt: -1 }; 
            break;
        case 'avgRating':
            sortCriteria = { avgRating: -1 }; 
            break;
        case 'aToZ':
            sortCriteria = { productName: 1 };
            break;
        case 'zToA':
            sortCriteria = { productName: -1 };
            break;
        default:
            sortCriteria = {}; 
    }

    const products = await Product.find().sort(sortCriteria); 
    res.render('shop', { products });
};

const updateQuantity =  async (req, res) => {
    const { productId, change } = req.body;
    try {

        const userId = req.session.user;
        if (!userId) {
            return res.json({ success: false, message: "User not logged in" });
        }

        const cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.json({ success: false, message: "Cart not found" });
        }

        const item = cart.items.find((item) => item.productId.toString() === productId);
        if (item) {
            item.quantity += change;
            item.totalPrice = item.quantity * item.price;

            if (item.quantity <= 0) {
                cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
            }

            cart.totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);
            await cart.save();

            res.json({
                success: true,
                newQuantity: item.quantity,
                newSubtotal: item.totalPrice,
                totalPrice: cart.totalPrice,
            });
        } else {
            res.json({ success: false, message: "Item not found in cart" });
        }

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Failed to update quantity" });
    }
};

const orderProductDetails = async (req, res) => {
    try {
        const orderId = req.query.id;

        // Fetch the order by custom orderId field
        const order = await Order.findOne({ orderId: orderId })
            .populate({
                path: 'orderedItems.product',  
                model: 'Product',              
                select: 'productName productImage salePrice' 
            });
        console.log('order',order)
        if (!order) {
            return res.status(404).render('error', { message: 'Order not found' });
        }

        // Render the details with fields from the new schema
        res.render('order-details', {
            order: {
                orderId: order.orderId,
                userId: order.userId,
                orderedItems: order.orderedItems,
                totalPrice: order.totalPrice,
                discount: order.discount,
                finalAmount: order.finalAmount,
                shippingAddress: order.shippingAddress,
                invoiceDate: order.invoiceDate,
                status: order.status,
                createdOn: order.createdOn,
                couponApplied: order.couponApplied,
                couponCode: order.couponCode,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus
            }
        });
        console.log(order.orderedItems)
        

    } catch (error) {
        console.log("Order Product Details Error:", error.message);
        res.status(500).render('error', { message: 'Error fetching order details' });
    }
};



module.exports = {
    getCart,
    addToCart,
    checkOut,
    removeCart,
    updateQuantity,
    getOrderPlacedPage,
    getSortedPage,
    saveOrder,
    orderProductDetails
}