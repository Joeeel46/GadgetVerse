const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const passport = require('passport')
const { userAuth, adminAuth } = require('../middlewares/auth')
const productController = require('../controllers/user/productController')
const profileController = require('../controllers/user/profileController')
const cartController = require('../controllers/user/cartController')


router.get("/signup",userController.loadSignup)
router.get("/pagenotfound",userController.pageNotFound)
router.get('/',userController.loadHomePage)
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp",userController.resendOtp)

router.get('/auth/google',passport.authenticate("google",{scope:['profile','email']}))

router.get("/auth/google/callback",passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
})

router.get("/login",userController.loadLogin)
router.post("/login",userController.login)
router.get("/logout",userController.logout)
router.post("/logout",userController.logout)


router.get("/productDetails",userAuth,productController.productDetails)

router.get("/forgot-password",profileController.getForgotPassPage)
router.post("/forgot-email-valid",profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.get("/reset-password",profileController.getResetPassPage)
router.post('/resend-forgot-otp',profileController.resendOtp)
router.post('/reset-password',profileController.postNewPassword)
// profile managment
router.get('/userProfile',userAuth,profileController.userProfile)


// Address managment
router.get('/addAddress',userAuth,profileController.addAddress)
router.post('/addAddress',userAuth,profileController.postAddAddress)
router.get('/editAddress',userAuth,profileController.editAddress)
router.post('/editAddress',userAuth,profileController.postEditAddress)
router.get('/deleteAddress',userAuth,profileController.deleteAddress)
//shop
router.get('/shop',userAuth,userController.loadShoppingPage)
//cart
router.get('/cart',userAuth,cartController.getCart)

module.exports = router