const user = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Order = require('../../models/orderSchema')
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")


const pageError = async (req,res)=>{
    res.render("admin-error")
}

const loadLogin = (req,res)=>{
    console.log('Session:', req.session)
    if(req.session.admin){
        return res.redirect("/admin")
    }
    res.render("admin-login",{message:null})
}

const login = async (req,res)=>{
    try {
        const {email,password} = req.body
        const admin = await user.findOne({email,isAdmin:true})
        if(admin){

            const passwordMatch = bcrypt.compare(password,admin.password)
            if(passwordMatch){
                req.session.admin = true
                return res.redirect("/admin")
            }else{
                return res.render('admin-login', { message: "Invalid password" });
            }

        } else {
            
            return res.render('admin-login', { message: "Admin not found" });
        }
    } catch (error) {
        console.log("login error",error)
        return res.redirect("/pageError")
    }
}

const loadDashboard = async (req,res)=>{
    if(req.session.admin){
        try {
            const salesData = await getTotalSales();
            const products = await getMostSellingProducts();
            const categories = await getMostSellingCategories();
            const brands = await getMostSellingBrands();
            const totalOrders = await Order.countDocuments();
            const totalProducts = await Product.countDocuments()


            res.render('dashboard', { 
                salesData: JSON.parse(JSON.stringify(salesData)), 
                products: JSON.parse(JSON.stringify(products)), 
                categories: JSON.parse(JSON.stringify(categories)), 
                brands: JSON.parse(JSON.stringify(brands)),
                totalOrders,
                totalProducts
            });
        } catch (error) {
            res.redirect("/pageError")
        }
    } else {
        res.redirect("/admin/login"); 
    }
}

async function getTotalSales() {
    try {
        const totalSales = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalSalesAmount: { $sum: "$finalAmount" }
                }
            }
        ]);

        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);

        const weeklySales = await Order.aggregate([
            {
                $match: {
                    createdOn: { $gte: startOfYear } 
                }
            },
            {
                $group: {
                    _id: { $week: "$createdOn" },
                    sales: { $sum: "$finalAmount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const monthlySales = await Order.aggregate([
            {
                $match: {
                    createdOn: { $gte: startOfYear } 
                }
            },
            {
                $group: {
                    _id: { $month: "$createdOn" },
                    sales: { $sum: "$finalAmount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const yearlySales = await Order.aggregate([
            {
                $group: {
                    _id: { $year: "$createdOn" },
                    sales: { $sum: "$finalAmount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];

        const weeklyData = {
            labels: weeklySales.map(item => `Week ${item._id}`),
            data: weeklySales.map(item => item.sales)
        };

        const monthlyData = {
            labels: monthNames,
            data: Array(12).fill(0)
        };
        monthlySales.forEach(item => {
            if (item._id >= 1 && item._id <= 12) {
                monthlyData.data[item._id - 1] = item.sales;
            }
        });

        const yearlyData = {
            labels: yearlySales.map(item => item._id.toString()),
            data: yearlySales.map(item => item.sales)
        };

        return {
            totalSalesAmount: totalSales.length > 0 ? totalSales[0].totalSalesAmount : 0,
            weekly: weeklyData,
            monthly: monthlyData,
            yearly: yearlyData
        };
    } catch (error) {
        console.error("Error in getTotalSales:", error);
        return {
            totalSalesAmount: 0,
            weekly: { labels: [], data: [] },
            monthly: { labels: [], data: [] },
            yearly: { labels: [], data: [] }
        };
    }
}


async function getMostSellingProducts() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $group: {
                    _id: "$orderedItems.product",
                    productName: { $first: "$productDetails.productName" },
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 }
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling product:", error);
    }
}

async function getMostSellingCategories() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },

            { $unwind: "$categoryDetails" },

            {
                $group: {
                    _id: "$productDetails.category",
                    categoryName: { $first: "$categoryDetails.name" },
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 }
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling category:", error);
    }
}

async function getMostSellingBrands() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $group: {
                    _id: "$productDetails.brand",
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 },
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling category and brand:", error);
    }
}


const logout = async (req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroying session",err)
                return res.redirect("/pageError")
            }
            res.redirect("/admin/login")
        })
    } catch (error) {
        console.log("Unexpeted error during logout", error)
        res.redirect("/pageError")
    }
}

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout
}


