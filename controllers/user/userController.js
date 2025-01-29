const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Banner = require('../../models/bannerSchema')
const Brand = require('../../models/brandSchema')
const env = require('dotenv').config()
const nodemailer = require('nodemailer')
const bcrypt = require("bcrypt")
const statusCodes = require("../../utils/statusCodes")


const pageNotFound = async (req, res) => {
    try {
        res.render("page-404")
    } catch (error) {
        console.log("/pageNotFound")
    }
}

const loadSignup = async (req, res) => {
    try {
        return res.render("signup")
    } catch (error) {
        console.log("Home page not loading:", error)
        res.status(statusCodes.INTERNAL_SERVER_ERROR).send("Server Error")
    }
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`
        })
        
        // Corrected 'into' to 'info' and added '.accepted' check
        return info.accepted.length > 0

    } catch (error) {
        // Fixed typo in console.error and corrected message content
        console.error("Error sending email:", error)
        return false
    }
}

const signup = async (req, res) => {
    try {
        const { name, phone, email, password, cPassword } = req.body;

        if (password !== cPassword) {
            return res.render("signup", { message: "Passwords do not match" });
        }

        const findUser = await User.findOne({ email });

        if (findUser) {
            return res.render("signup", { message: "User with this email already exists" });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        
        if (!emailSent) {
            return res.render("signup", { message: "Failed to send verification email" });
        }

        // Store data in session
        req.session.userOtp = otp;
        console.log(otp)
        req.session.userData = { name, phone, email, password };

        // Render the OTP verification page
        return res.render("verify-otp", { email: email });
        
    } catch (error) {
        console.log("Signup error:", error);
        return res.render("signup", { message: "An error occurred during signup" });
    }
};

const loadHomePage = async (req, res) => {
    try {
        const today = new Date().toISOString()
        const findBanner = await Banner.find({
            startDate:{$lt:new Date(today)},
            endDate:{$gt:new Date(today)}
        })
        const user = req.session.user
        const categories = await Category.find({isListed:true})
        let productData = await Product.find(
            {isBlocked:false,
                category:{$in:categories.map(category=>category._id)},quantity:{$gt:0}
            }
        )
        .populate('category')
        .sort({ createdAt: -1 }) // Sort by `createdAt` in descending order (most recent first)
        .limit(4);

        if(user){
            
            const userData = await User.findById({_id:user})
            // console.log(userData)
            res.render("home",{user:userData ,products:productData,banner:findBanner || []})

        }else{

            return res.render('home', {products:productData,banner:findBanner || []})

        }
    } catch (error) {

        console.log('Home page not found:', error) // Added error logging
        res.status(statusCodes.INTERNAL_SERVER_ERROR).send("Server error")
        
    }
}

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.error("Error in hashing password", error); // Added error handling
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("res",otp);
        console.log("req",req.session.userOtp)
        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
            });

            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({ success: true, redirectUrl: "/" });
        } else {
            res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "Invalid OTP, Please try again" });
        }
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "An error occurred" });
    }
};

const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "Email not found in session" });
        }

        const otp = generateOtp();

        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP:", otp);
            res.status(statusCodes.OK).json({ success: true, message: "OTP Resent successfully" }); // Fixed typo: 'statue' -> 'status'
        } else {
            res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to send OTP, please try again." }); // Fixed typo: 'statue' -> 'status' and changed status code
        }
    } catch (error) {
        console.error("Error resending OTP", error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error. Please try again" }); // Fixed typo: 'sucess' -> 'success'
    }
};


const loadLogin = async (req,res)=>{
    try {
        
        if(!req.session.user){
            return res.render("login")
        }else{
            res.redirect("/pageNotFound")
        }

    } catch (error) {
        
    }
}

const login = async (req,res)=>{
    try {
        const {email,password} = req.body

        const findUser = await User.findOne({isAdmin:0,email:email})

        if(!findUser){
            return res.render("login",{message:"User not found"})

        }
        if(findUser.isBlocked){
            return res.render("login",{message:"User is blocked by admin"})
        }

        const passwordMatch = await bcrypt.compare(password,findUser.password)

        if(!passwordMatch){
            return res.render("login",{message:"Incorrect Password"})
        }

        req.session.user = findUser._id
        res.redirect("/")


    } catch (error) {
        
        console.error("Login error",error)
        res.render("login",{message:"Login failed. Please try again later"})

    }
}

const logout = async (req, res) => {
    try {
  
      req.session.user = null;
      res.redirect('/login')
  
    } catch (error) {
      console.log("Logout error", error);
      res.redirect('/page-not-found');
    }
}

const loadShoppingPage = async (req, res) => {
    try {
        const { sortBy, category } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 15;

        // Prepare condition for filtering
        const condition = category ? { category } : {};

        // Determine sort criteria based on sortBy parameter
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
                sortCriteria = { createdOn: -1 };
        }

        
        const totalProducts = await Product.countDocuments(condition);
        const totalPages = Math.ceil(totalProducts / limit);
        const skip = (page - 1) * limit;

     
        const [products, categories] = await Promise.all([
            Product.find(condition)
                .populate('category', ['name', 'categoryOffer'])
                .sort(sortCriteria)
                .skip(skip)
                .limit(limit)
                .lean(),
            Category.find()
        ]);

        
        if (req.xhr) {
            return res.render('product-grid', { 
                products,
                layout: false 
            });
        }

        
        res.render('shop', {
            products,
            category: categories,
            categories,
            totalPages,
            currentPage: page,
            selectedCategory: category,
            sortBy
        });

    } catch (error) {
        console.error('Error in getSortedPage:', error);
        res.status(500).render('error', { message: 'Internal server error' });
    }
};

const liveSearch = async (req, res) => {
    try {
        const query = req.query.query; // The search term
        if (!query) {
            return res.status(statusCodes.BAD_REQUEST).json({ message: "Query is required" });
        }

        // Search for products where the product name matches the query
        const products = await Product.find({
            productName: { $regex: query, $options: "i" } // Case-insensitive search
        }).limit(10); // Limit the results to prevent overload

        return res.json({ products });
    } catch (err) {
        console.error(err);
        return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};

const searchAllProducts = async (req, res) => {
    try {
        const products = await Product.find().limit(10); // Limit to avoid overload
        return res.json({ products });
    } catch (err) {
        console.error(err);
        return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};

module.exports = {
    loadHomePage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,
    loadShoppingPage,
    liveSearch,
    searchAllProducts
}
