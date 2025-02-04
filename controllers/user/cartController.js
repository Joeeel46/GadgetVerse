
const mongoose = require('mongoose');
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Wallet = require("../../models/walletSchema");
const Address = require("../../models/addressSchema");
const statusCodes = require("../../utils/statusCodes")
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const { log } = require('npmlog');
const { message } = require('statuses');
const status = require('statuses');


const getCart = async (req, res) => {
    try {
        const userId = req.session.user;

        const user = await User.findById(userId);
        let cart = await Cart.findOne({ userId: userId }).populate('items.productId')
        .populate({
            path: 'items.productId',
            populate: {
                path: 'category'
            }
        });

        if (!cart) {
            return res.render('cart', { products: [], totalAmount: 0, user });
        }

        const blockedBrands = await Brand.find({ isBlocked: true }).select('brandName');

        const blockedBrandNames = new Set(blockedBrands.map(brand => brand.brandName));
        
        cart.items = cart.items.filter(item => 
            item.productId &&
            !item.productId.isBlocked &&  
            item.productId.category.isListed &&
            !blockedBrandNames.has(item.productId.brand)  
        );

        await cart.save();

        const totalAmount = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

        res.render('cart', { products: cart.items, totalAmount, user });

    } catch (error) {
        console.error("Error on getting cart")
    }
}

const addToCart = async (req, res) => {
    try {
        if (req.session.user) {
            const userId = req.session.user;
            const { productId } = req.query;
            const product = await Product.findById(productId).populate("category");
            if (!product) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: "Product not found! Kindly refresh the Page"
                });
            }

            if (product.isBlocked) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: "Product is Blocked! Kindly refresh the Page"
                });
            }

            if (!product.category || !product.category.isListed) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: "Category is Unlisted! Kindly refresh the Page"
                });
            }

            const brand = await Brand.findOne({ brandName: product.brand });
            if (!brand || brand.isBlocked) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: "Brand blocked! Kindly refresh the Page"
                });
            }
            
            const quantity = req.query.quantity;
            const quantityNumber = parseInt(quantity, 10) || 1;
    
            console.log(userId);
    
            let cart = await Cart.findOne({ userId: userId });
    
            if (cart) {
             
                const productExists = cart.items.find(item => item.productId.toString() === productId.toString());
    
                if (productExists) {
                  
                    const product = await Product.findById(productId);
                    const totalQuantity = quantityNumber + productExists.quantity;
                    if(totalQuantity > 5){
                        return res.status(400).json({
                            status: 400,
                            success: false,
                            message: "Cart limit reached!"
                        })
                    }

                    if (product.quantity < totalQuantity) {
                        return res.status(400).json({
                            status: 400,
                            success: false,
                            message: "No stock left!"
                        });
                    }
    
                    
                    const itemIndex = cart.items.findIndex(item => item.productId.equals(productId));
                    if (itemIndex > -1) {
                        cart.items[itemIndex].quantity += quantityNumber;
                        cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity * product.salePrice;
                    }
                } else {
                    // If the product doesn't exist in the cart, add it as a new item
                    const product = await Product.findById(productId);
                    if (product.quantity < quantityNumber) {
                        return res.status(400).json({
                            status: 400,
                            success: false,
                            message: "No stock left!"
                        });
                    }
    
                    const itemTotalPrice = product.salePrice * quantityNumber;
                    cart.items.push({
                        productId,
                        quantity: quantityNumber,
                        price: product.salePrice,
                        totalPrice: itemTotalPrice
                    });
                }
            } else {
                // If no cart exists, create a new one and validate stock
                const product = await Product.findById(productId);
                if (product.quantity < quantityNumber) {
                    return res.status(400).json({
                        status: 400,
                        success: false,
                        message: "No stock left!"
                    });
                }
    
                const itemTotalPrice = product.salePrice * quantityNumber;
                cart = new Cart({
                    userId,
                    items: [{
                        productId,
                        quantity: quantityNumber,
                        price: product.salePrice,
                        totalPrice: itemTotalPrice
                    }]
                });
            }
    
            // Save the cart and send a success response
            await cart.save();
            return res.status(200).json({
                status: 200,
                icon: 'success',
                message: 'Product added to cart successfully!'
            });
        } else {
            return res.status(401).json({
                icon: 'info',
                message: 'Please login to add products to the cart'
            });
        }
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
            icon: 'error',
            message: "Error adding to cart"
        });
    }
};


const removeCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.query;

        const cart = await Cart.findOne({ userId });

        if (cart) {
            let itemIndex = cart.items.findIndex(item => item.productId.equals(productId));
            if (itemIndex > -1) {
                cart.items.splice(itemIndex, 1);
                await cart.save();
            }
        }

        res.status(statusCodes.OK).json({ message: "Product removed from cart successfully!" });
    } catch (error) {
        console.error("Error removing from cart:", error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error removing from cart" });
    }
}

const checkOut = async (req, res) => {
    try {
        const userId = req.session.user
        const user = await User.findById(userId)
        const productId = req.query.productId
        const qty = parseInt(req.query.quantity)

        const wallet = await Wallet.findOne({ userId })

        const walletAmount = wallet?.balance ?? 0;

        // console.log('wallet', wallet)
        const addresses = (await Address.findOne({ userId })) || []

        let totalPrice

        if (productId) {
            const product = await Product.findById(productId)
            if (!product || product.isBlocked) {
                return res.status(404).redirect("/pageNotFound")
            }
            totalPrice = product.salePrice * qty
            return res.render('checkout', { carts: null, product, addresses: addresses.address, totalPrice, user, qty, walletAmount })

        } else {
            const cartItems = await Cart.findOne({ userId }).populate({
                path: 'items.productId',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });
            
            if (!cartItems || cartItems.items.length === 0) {
                return res.redirect('/cart');
            }
            
            const blockedBrands = await Brand.find({ isBlocked: true }).select('brandName');
            const blockedBrandNames = blockedBrands.map(brand => brand.brandName);
            
            const activeItems = cartItems.items.filter(item => 
                item.productId && 
                !item.productId.isBlocked && 
                !blockedBrandNames.includes(item.productId.brand) && 
                item.productId.category?.isListed && 
                item.productId.quantity >= item.quantity
            );
            
            cartItems.items = cartItems.items.filter(item => 
                activeItems.includes(item)
            );
            await cartItems.save();
            
            const totalPrice = activeItems.reduce((sum, item) => sum + item.totalPrice, 0);
            
            return res.render('checkout', { 
                carts: cartItems, 
                addresses: addresses.address, 
                totalPrice, 
                product: null, 
                user, 
                walletAmount 
            });
        }


    } catch (error) {
        console.error(error)
        res.status(statusCodes.INTERNAL_SERVER_ERROR).send("Error retrieving checkout information")
    }
}



const saveOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);

        const data = req.body.formData || req.body;

        const {
            singleProduct,
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

        // Validate address
        const addresses = await Address.findOne({ userId });
        if (!addresses || !addresses.address || addresses.address.length === 0) {
            return res.status(400).json({ status:404,success: false, message: "No address is found!" });
        }

        const selectedAddress = addresses.address.find(addr => addr._id.toString() === address.toString());
        if (!selectedAddress) {
            return res.status(400).json({ status:404,success: false, message: "Selected address not found!" });
        }

        const shippingAddress = {
            addressType: selectedAddress.addressType,
            name: selectedAddress.name,
            city: selectedAddress.city,
            landMark: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
            phone: selectedAddress.phone,
            altPhone: selectedAddress.altPhone
        };

        // Validate coupon if exists
        if (couponCode) {
            const coupon = await Coupon.findOne({ name: couponCode });
            
            
            if (coupon) {
                // if (coupon.expiredOn < Date.now()) {
                //     return res.status(400).json({ status:404,success: false, message: "Coupon has expired!" });
                // }
                if (coupon.userId.includes(userId)) {
                    return res.status(404).json({ status:404,success: false, message: "Coupon already used!" });
                }
                
                await Coupon.findOneAndUpdate({ name: couponCode }, { $push: { userId: userId } });
                
            }else{

                return res.status(400).json({ status:404,success: false, message: "Coupon does not exist!" });
    
            }
        }

        let orderedItems = [];

        console.log('singleproduct',singleProduct)
        console.log('cartdata',cartData)

        if (singleProduct) {
            console.log('inside single')
            const productId = JSON.parse(singleProduct);
            console.log('singleproductparsed',productId)
            
            const productExists = await Product.findById(productId).populate('category');

            if (!productExists) {
                return res.status(400).json({ status:400,success: false, message: "Product not found" });
            }

            if (productExists.isBlocked) {
                return res.status(400).json({ status:400,success: false, message: "Product is currently unavailable" });
            }

            if (!productExists.category || !productExists.category.isListed) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: "Product is currently unavailable"
                });
            }

            const brand = await Brand.findOne({ brandName: productExists.brand });
            if (!brand || brand.isBlocked) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: "Product is currently unavailable"
                });
            }
            
            if (productExists.quantity < singleProductQuantity) {
                return res.status(400).json({
                    status:400,
                    success: false,
                    message: `Only ${productExists.quantity} units available`
                });
            }
            // console.log('salePrice',productExists.salePrice)
            orderedItems.push({
                product: productId,
                quantity: singleProductQuantity,
                price: productExists.salePrice
            });

            if (payment_option === "COD" || payment_option === "Wallet") {
                productExists.quantity -= singleProductQuantity;
                await productExists.save();
            }

        }else if (cartData) {
            console.log('inside cart')
            console.log("cart",cartData)
            const cartItems = JSON.parse(cartData);

            // Validate all cart items first
            for (let item of cartItems) {
                const productExists = await Product.findById(item.productId).populate("category");

                if (!productExists) {
                    return res.status(400).json({
                        status:404,
                        success: false,
                        message: "One or more products not found"
                    });
                }

                if (!productExists.category || !productExists.category.isListed) {
                    return res.status(400).json({
                        status: 400,
                        success: false,
                        message: `Product ${productExists.productName} is currently unavailable`
                    });
                }

                if (productExists.isBlocked) {
                    return res.status(400).json({
                        status:400,
                        success: false,
                        message: `Product ${productExists.productName} is currently unavailable`
                    });
                }

                const brand = await Brand.findOne({ brandName: productExists.brand });
                if (!brand || brand.isBlocked) {
                    return res.status(400).json({
                        status: 400,
                        success: false,
                        message: `Product ${productExists.productName} is currently unavailable`
                    });
                }

                if (productExists.quantity < item.quantity) {
                    return res.status(400).json({
                        status:400,
                        success: false,
                        message: `Only ${productExists.quantity} units available for ${productExists.productName}`
                    });
                }
            }

            for (let item of cartItems) {
                const product = await Product.findById(item.productId);

                orderedItems.push({
                    product: item.productId,
                    quantity: item.quantity,
                    price: product.salePrice
                });
                
                
                if (payment_option === "COD" || payment_option === "Wallet") {
                    product.quantity -= item.quantity;
                    await product.save();
                }
            }

            if(payment_option !== "online"){
                await Cart.findOneAndDelete({ userId });
            }
        }

        if (payment_option === "Wallet") {
            const wallet = await Wallet.findOne({userId});
            if (wallet.balance < finalAmount) {
                return res.status(400).json({
                    success: false,
                    message: "Insufficient wallet balance"
                });
            }
            wallet.balance -= finalAmount;
            await wallet.save();
        }
        
        const payment_status =
            payment_option === "Wallet" ? "Completed" :
                (payment_option === "COD" || payment_option === "online") ? "Pending" : null;

        const orderStatus = 
        payment_option === "Wallet" ? "Processing" :
                (payment_option === "COD" || payment_option === "online") ? "Pending" : null;

        const newOrder = new Order({
            userId: user._id,
            orderedItems,
            totalPrice,
            discount,
            finalAmount,
            shippingAddress,
            paymentMethod: payment_option,
            paymentStatus: payment_status,
            couponCode,
            couponApplied: couponCode ? true : false,
            status: orderStatus,
            createdOn: Date.now(),
            invoiceDate: new Date()
        });
        await newOrder.save();
        user.orderHistory.push(newOrder._id);
        await user.save();
        
        return res.status(200).json({ success: true, orderId: newOrder._id })

    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while processing your order"
        });
    }
};

const getOrderPlacedPage = async (req, res) => {
    try {
        const { orderId } = req.query;
        res.render('order-placed', { orderId })
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}



const updateQuantity = async (req, res) => {
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
        // console.log('order', order)
        if (!order) {
            return res.status(statusCodes.NOT_FOUND).render('error', { message: 'Order not found' });
        }

        // Render the details with fields from the new schema
        res.render('order-details', {
            order: {
                id: order._id,
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
        // console.log('orderitems', order.orderedItems)


    } catch (error) {
        console.log("Order Product Details Error:", error.message);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).render('error', { message: 'Error fetching order details' });
    }
};

const clearCart = async (req, res) => {
    try {
        const userId = req.session.user
        // console.log('userid', userId)
        const cart = await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } })

        res.status(statusCodes.OK).json({ success: true, message: "Cart Cleared Successfully!" })
    } catch (error) {
        console.log(error)
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to clear cart', error });
    }
}


module.exports = {
    getCart,
    addToCart,
    checkOut,
    removeCart,
    updateQuantity,
    getOrderPlacedPage,
    saveOrder,
    orderProductDetails,
    clearCart
}