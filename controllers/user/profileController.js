const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')
const Wallet = require('../../models/walletSchema')
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv').config()
const session = require('express-session')
const statusCodes = require("../../utils/statusCodes")

function generateOtp (){
    const digits = "1234567890"
    let otp = ''
    for(let i = 0;i < 6;i++){
        otp+=digits[Math.floor(Math.random()*10)]
    }
    return otp
}

const sendVerificationEmail = async (email, otp)=>{
    try {
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const mailOptions = {
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Your OTP for password has been reset",
            text:`Your OTP is ${otp}`,
            html:`<h4>Your OTP: ${otp}</h4>`
        }

        const info = await transporter.sendMail(mailOptions)
        console.log("Email sent:",info.messageId)
        return true

    } catch (error) {
        console.error("Error sending email:",error)
        return false
    }
}

const securePassword = async (password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        
    }
}

const getForgotPassPage = async (req,res)=>{

    try{
        res.render("forgot-password")
    } catch (error) {
        res.redirect("/pageNotFound")
    }

}

const forgotEmailValid = async (req,res)=>{
    try {
        const { email } = req.body;
        // const data = JSON.parse()
        console.log(req.body)
        console.log(email)
        const findUser = await User.findOne({ email: email });
        console.log(findUser)
        if (!findUser) {
            return res.status(400).json({ success: false, message: "Please provide an existing email address." });
        }
        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                res.json({ success: true, redirect: "/forgot-password-otp", otp: otp });
                console.log("OTP: ", otp);
            } else {
                res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to send OTP. Please try again." });
            }
        } else {
            res.status(statusCodes.NOT_FOUND).json({ success: false, message: "User with this email does not exist." });
        }
    } catch (error) {
        console.error("Error in forgotEmailValid:", error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "An error occurred. Please try again." });
    }
}

const verifyForgotPassOtp = async (req,res)=>{
    try {
        // console.log("HElloojsld")
        const enteredOtp = req.body.otp
        console.log(enteredOtp)
        console.log(req.session.userOtp)
        if(enteredOtp === req.session.userOtp){
            res.json({success:true,redirectUrl:'/reset-password'})
        }else{
            res.json({success:false,message:"OTP not matching"})
        }
    } catch (error) {
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({success:false,message:"An error occured please try again"})

    }
}

const getForgotOtpPage = async (req,res)=>{
    try {
        res.render("forgot-password-otp")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const getResetPassPage = async (req,res)=>{
    try {
        res.render("reset-password")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const resendOtp = async (req,res)=>{
    try {
        const otp = generateOtp()
        req.session.userOtp = otp
        const email = req.session.email
        console.log("Resending OTP to email:",email)
        const emailSent = await sendVerificationEmail(email,otp)
        if(emailSent){
            console.log("Resend OTP:",otp)
            res.status(statusCodes.OK).json({success:true,message:"Resend OTP Successful"})
        }
    } catch (error) {
        console.error("Error in resend OTP",error)
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({success:false,message:'Internal Server Error'})
    }
}

const postNewPassword = async (req,res)=>{
    try {
        const {newPass1,newPass2} = req.body
        const email = req.session.email
        if(newPass1 === newPass2){
            const passwordHash = await securePassword(newPass1)
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            res.redirect('/login')
        }
    } catch (error) {
        res.render("reset-password", {message:'Passwords do not match'})
    }
}

const userProfile = async (req,res)=>{
    try {
        const userId = req.session.user
        const userData = await User.findById(userId)
        const addressData = await Address.findOne({userId:userId})
        const orders = await Order.find({userId}).sort({ createdOn: -1 });
        const wallet = await Wallet.findOne({userId:userId});
        res.render('profile',{
            user:userData,
            userAddress:addressData,
            orders,
            wallet
        })
    } catch (error) {
        console.error("Error for retreving profile data",error)
        res.redirect('/pageNotFound')
    }
}

const addAddress = async (req,res)=>{
    try {
        const user = req.session.user
        res.render("add-address",{user:user})
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const postAddAddress = async (req,res)=>{
    try {
        const userId = req.session.user
        const userData = await User.findOne({_id:userId})
        const {addressType,name,city,streetAddress,landMark,state,pincode,phone,altPhone} = req.body

        const userAddress = await Address.findOne({userId:userData._id})
        if(!userAddress){
            const newAddress = new Address({
                userId:userData._id,
                address:[{addressType,name,city,streetAddress,landMark,state,pincode,phone,altPhone}]

            })
            await newAddress.save()
        }else{
            userAddress.address.push({addressType,name,city,streetAddress,landMark,state,pincode,phone,altPhone})
            await userAddress.save()
        }
        res.redirect('/userProfile')

    } catch (error) {
        console.error("Error adding address:",error)

        res.redirect("/pageNotFound")
    }
}

const editAddress = async (req,res)=>{
    try {
        const addressId = req.query.id
        const user = req.session.user
        const currAddress = await Address.findOne({
            "address._id": addressId
        })

        const addressData = currAddress.address.find((item)=>{
            return item._id.toString()===addressId.toString()
        })

        if(!addressData){
            return res.redirect("/pageNotFound")
        }

        res.render("edit-address",{address:addressData,user:user})

    } catch (error) {
        console.error("Error in edit address",error)
        res.redirect("/pageNotFound")
    }
}

const postEditAddress = async (req,res)=>{
    try {
        const data = req.body
        // console.log(data)
        const addressId = req.body.addressId
        // console.log(addressId)
        const user = req.session.user
        const findAddress = await Address.findOne({"address._id":addressId})
        // console.log(findAddress)
        if(!findAddress){
            return res.redirect('/pageNotFound')
        }
        await Address.updateOne(
            {"address._id":addressId},
            {$set:{
                "address.$":{
                    id: addressId,
                    addressType:data.addressType,
                    name:data.name,
                    city:data.city,
                    streetAddress:data.streetAddress,
                    landMark:data.landMark,
                    state:data.state,
                    pincode:data.pincode,
                    phone:data.phone,
                    altPhone:data.altPhone
                }
            }}
        )

        res.redirect("/userProfile")

    } catch (error) {
        console.error("Error is edit address",error)
        res.redirect("/pageNotFound")
    }
}

const deleteAddress = async (req,res)=>{
    try {
        const addressId = req.query.id
        const findAddress = await Address.findOne({"address._id":addressId})
        if(!findAddress){
            return res.status(statusCodes.NOT_FOUND).send("Address not found")
        }
        await Address.updateOne({
            "address._id":addressId
        },
    {
        $pull:{
            address:{
                _id:addressId,
            }
        }
    })

    res.redirect('/userProfile')

    } catch (error) {
        console.error("Error in delete address",error)
        res.redirect("/pageNotFound")
    }
}

const updateUserProfile = async (req, res) => {
    try {
      const { name, phone, email } = req.body;
      const userId = req.session.user; // Assuming `req.user` contains authenticated user info
  
      // Update user document
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { name, phone, email },
        { new: true, runValidators: true }
      );
  
      if (updatedUser) {
        return res.status(statusCodes.OK).json({ message: "Profile updated successfully", success: true });
      } else {
        return res.status(statusCodes.BAD_REQUEST).json({ message: "Failed to update profile", success: false });
      }
    } catch (error) {
      console.error(error);
      return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: "Server error", success: false });
    }
};

const changeUserPassword = async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.user; // Assuming `req.user` contains authenticated user info
  
      const user = await User.findById(userId);
      if (!user) return res.status(statusCodes.NOT_FOUND).json({ message: "User not found", success: false });
  
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(statusCodes.BAD_REQUEST).json({ message: "Current password is incorrect", success: false });
      }
  
      // Update to new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();
  
      return res.status(statusCodes.OK).json({ message: "Password updated successfully", success: true });
    } catch (error) {
      console.error(error);
      return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: "Server error", success: false });
    }
  };
  
  

module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    updateUserProfile,
    changeUserPassword,
    getForgotOtpPage
}