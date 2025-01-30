const express = require("express")
const router = express.Router()
const adminController = require("../controllers/admin/adminController")
const categoryController = require("../controllers/admin/categoryController")
const {userAuth,adminAuth} = require("../middlewares/auth")
const customerController = require("../controllers/admin/customerController")
const multer = require("multer")
const bannerController = require("../controllers/admin/bannerController")
const productController = require("../controllers/admin/productController")
const brandController = require("../controllers/admin/brandController")
const orderController = require("../controllers/admin/orderController")
const stockController = require("../controllers/admin/stockController")
const couponController = require('../controllers/admin/couponController')
const salesController = require('../controllers/admin/salesController')


const storage = require("../helpers/multer")
const uploads = multer({storage:storage})

router.get("/pageerror",adminController.pageError)
///login managment
router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)
router.get("/",adminAuth,adminController.loadDashboard)
router.get("/logout",adminController.logout)
//customer managment
router.get("/users",adminAuth,customerController.customerInfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked)
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked)
//category managment
router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",adminAuth,categoryController.addCategory)
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer)
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer)
router.get("/listCategory",adminAuth,categoryController.getListCategory)
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory)
router.get("/editCategory",adminAuth,categoryController.getEditCategory)
router.post("/editCategory/:id",adminAuth,categoryController.editCategory)
//brand management
router.get("/brands",adminAuth,brandController.getBrandPage)
router.post("/addBrand",adminAuth,uploads.single("image"),brandController.addBrand)
router.post("/blockBrand",adminAuth,brandController.blockBrand)
router.post("/unblockBrand",adminAuth,brandController.unblockBrand)
router.delete("/deleteBrand",adminAuth,brandController.deleteBrand)
//product management
router.get("/addProducts",adminAuth,productController.getProductAddPage)
router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts)
router.get("/products",adminAuth,productController.getAllProducts)
router.post("/addProductOffer",adminAuth,productController.addProductOffer)
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer)
router.post("/blockProduct",adminAuth,productController.blockProduct)
router.post("/unblockProduct",adminAuth,productController.unblockProduct)
router.get("/editProduct",adminAuth,productController.getEditProduct)
router.post("/editProduct/:id",adminAuth,uploads.array("images",4),productController.editProduct)
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)
//banner management
router.get('/banner',adminAuth,bannerController.getBannerPage)
router.get('/addBanner',adminAuth,bannerController.getAddBannerPage)
router.post('/addBanner',adminAuth,uploads.single("images"),bannerController.addBanner)
router.get('/deleteBanner',adminAuth,bannerController.deleteBanner)
//order management
router.get('/orders',adminAuth,orderController.getOrderPage)
router.post('/updateOrderStatus',adminAuth,orderController.updateOrderStatus)
//stock management
router.get('/stockPage',adminAuth,stockController.getStockPage)
router.post('/updateStock',adminAuth,stockController.updateStock)
//coupon management
router.get('/coupons',adminAuth,couponController.getCouponPage);
router.post('/save-coupon',adminAuth,couponController.addCoupon);
router.delete('/delete-coupon',adminAuth,couponController.deleteCoupon);
//sales
router.get('/salesReport',adminAuth,salesController.showSaleReport)
router.get('/downloadSalesPDF',adminAuth,salesController.saleReportPDF)


module.exports = router