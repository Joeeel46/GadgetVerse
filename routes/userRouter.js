const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const passport = require('passport')


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

module.exports = router