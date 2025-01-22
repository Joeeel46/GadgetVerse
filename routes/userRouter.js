const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const passport = require('passport')
const { userAuth, adminAuth } = require('../middlewares/auth')
const productController = require('../controllers/user/productController')
const profileController = require('../controllers/user/profileController')
const cartController = require('../controllers/user/cartController')
const wishlistController = require('../controllers/user/wishlistController')
const paymentController = require('../controllers/user/paymentController')
const walletController = require('../controllers/user/walletController')
const invoiceController = require('../controllers/user/invoiceController')
const User = require('../models/userSchema')

router.use(async(req, res, next) => {
    const userData = await User.findById(req.session.user);
    res.locals.user = userData || null;
    next();
});

router.get("/signup",userController.loadSignup)
router.get("/pagenotfound",userController.pageNotFound)
router.get('/',userController.loadHomePage)
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp",userController.resendOtp)

router.get('/auth/google',passport.authenticate("google",{scope:['profile','email']}))

router.get("/auth/google/callback",passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    req.session.user = req.user._id;
    res.redirect('/');
})

router.get("/login",userController.loadLogin)
router.post("/login",userController.login)
router.get("/logout",userController.logout)
router.post("/logout",userController.logout)


router.get("/productDetails",userAuth,productController.productDetails)

router.get("/forgot-password",profileController.getForgotPassPage)
router.post("/forgot-email-valid",profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.get("/forgot-password-otp",profileController.getForgotOtpPage)
router.get("/reset-password",profileController.getResetPassPage)
router.post('/resend-forgot-otp',profileController.resendOtp)
router.post('/reset-password',profileController.postNewPassword)
// profile managment
router.get('/userProfile',userAuth,profileController.userProfile)
router.get('/')

// Address managment
router.get('/addAddress',userAuth,profileController.addAddress)
router.post('/addAddress',userAuth,profileController.postAddAddress)
router.get('/editAddress',userAuth,profileController.editAddress)
router.post('/editAddress',userAuth,profileController.postEditAddress)
router.get('/deleteAddress',userAuth,profileController.deleteAddress)
//shop
router.get('/shop',userAuth,userController.loadShoppingPage)
router.get('/search',userAuth,userController.liveSearch)
router.get('/all-products',userAuth,userController.searchAllProducts)
//cart
router.get('/cart',userAuth,cartController.getCart)
router.get('/addToCart',userAuth,cartController.addToCart)
router.get('/removeItem',userAuth,cartController.removeCart)
router.get('/checkout',userAuth,cartController.checkOut)
router.post('/placeOrder',userAuth,cartController.saveOrder)
router.get('/orderPlaced',userAuth,cartController.getOrderPlacedPage)
router.post('/update-cart-quantity',userAuth,cartController.updateQuantity)
router.get('/orderDetails',userAuth,cartController.orderProductDetails)
router.put('/clear',userAuth,cartController.clearCart)
//filter products
router.get('/products',userAuth,cartController.getSortedPage)
router.get('/shop/categoryFilter',userAuth,cartController.getSortedCategory)
//wishlist
router.get('/wishlist',userAuth,wishlistController.getWishlist)
router.post('/addToWishList',userAuth,wishlistController.addToWishlist)
router.post('/removeWishlistItem',userAuth,wishlistController.removeWishlistItem)
//payment
router.post("/createPayment",userAuth,paymentController.createPayment);
router.post("/updatePayment",userAuth,paymentController.updatePaymentStatus);
router.post("/repayment-status",userAuth,paymentController.updateRepaymentStatus)
router.post("/retry-payment",userAuth,paymentController.retryPayment);
router.post("/ondismiss",userAuth,paymentController.ondismiss)
//wallet
router.get('/cancelOrder',userAuth,productController.cancelOrder)
router.post('/returnProduct',userAuth,walletController.returnItem)
router.post('/createWalletPayment',userAuth,walletController.walletPayment)
router.post('/updateWalletPayment',userAuth,walletController.updateWallet)
//coupon
router.get('/couponlist',userAuth,paymentController.getCouponList);
router.post("/applyCoupon",userAuth,paymentController.applyCoupon);
router.post('/remove-coupon',userAuth,paymentController.removeCoupon);
//profile edit
router.post('/update-profile',userAuth,profileController.updateUserProfile);
router.post('/change-password',userAuth,profileController.changeUserPassword);
//invoice
router.get('/downloadInvoice',invoiceController.invoiceDownload)


module.exports = router