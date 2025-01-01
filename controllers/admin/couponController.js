const Coupon = require("../../models/couponSchema");

const getCouponPage = async (req,res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit =6;
        const skip =(page-1)*limit;

        const coupons = await Coupon.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        const totalCategories = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCategories/limit);
        res.render("coupons",{
            coupons:coupons,
            totalCategories:totalCategories,
            totalPages:totalPages,
            currentPage:page,
            activePage: 'coupon'
        })
    } catch (error) {
        console.log("get coupon error ",error);
        
    }
}

const addCoupon = async (req, res) => {
    try {
        console.log(req.body);
        let { couponCode, createdOn, expireOn, discountPercentage, minimumPrice, maxDiscount  } = req.body;
        let percentage = Number(discountPercentage);
        let miniPrice = Number(minimumPrice);
        let maxPrice = Number(maxDiscount);
        

        const existingCoupon = await Coupon.findOne({ couponCode });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: "Coupon code already exists" });
        }

        const startDate = new Date(createdOn);
        const endDate = new Date(expireOn);
        if (endDate <= startDate) {
            return res.status(400).json({ success: false, message: "Expiration date must be after start date" });
        }
        const newCoupon = new Coupon({
            name:couponCode,
            createdOn: startDate,
            expiredOn: endDate,
            offerPercentage:percentage,
            minimumPrice:miniPrice,
            maxDiscount:maxPrice,
            isList: true
        });
        const couponSave =await newCoupon.save();
       
        if(couponSave){
            return res.status(200).json({ success: true, message: "Coupon added successfully" });
        }else{
            res.status(500).json({ success: false, message: "Coupon is not added" });
        }
        
        
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).json({ success: false, message: "Error adding coupon" });
    }
};
const deleteCoupon = async (req,res)=>{
    try {
        console.log("vhgcjh",req.params);
        const couponId= req.query.id;
        const couponData = await Coupon.findByIdAndDelete({_id:couponId});
        if(couponData){
            return res.json({success:true,message: "Coupon remove successfully"})
        }else{
            return res.json({success:false,message: "some thing went wrong"})
        }
    } catch (error) {
        
    }
}


module.exports = {
    getCouponPage,
    addCoupon,
    deleteCoupon
}