const { name } = require("ejs")
const Brand = require("../../models/brandSchema")
const statusCodes = require("../../utils/statusCodes")
const Category = require("../../models/categorySchema")
const { $lt } = require("sift")
const { message } = require("statuses")

const getBrandPage = async (req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 4
        const skip = (page-1)*limit
        const brandData = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit)
        const totalBrands = await Brand.countDocuments()
        const totalPages = Math.ceil(totalBrands/limit)
        const reverseBrand = brandData.reverse()
        res.render("brands",{
            data: reverseBrand,
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands
        })
    } catch (error) {
        res.redirect("/pageerror")
    }
}

const addBrand = async (req,res)=>{
    try {
        const brand = req.body.name?.trim();

        if (!brand) {
            return res.status(400).json({ message: "Brand name cannot be empty!" });
        }else if(brand.length < 4){
            return res.status(400).json({ message: "Brand name too short!" });
        }
        
        const findBrand = await Brand.findOne({ brandName: { $regex: brand, $options: 'i' } });
    
        if (!findBrand) {
          const image = req.file ? req.file.filename : null;
          const newBrand = new Brand({
            brandName: brand,
            brandImage: image
          });
          await newBrand.save();
          res.status(200).json({ message: "Brand added successfully!" });
        } else {
          res.status(400).json({ message: "Brand already exists" });
        }
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

const blockBrand = async (req, res) => {
    try {
        const id = req.query.id;
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.json({ success: true, isBlocked: true });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error blocking brand" });
    }
};

const unblockBrand = async (req, res) => {
    try {
        const id = req.query.id;
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.json({ success: true, isBlocked: false });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error unblocking brand" });
    }
};

const deleteBrand = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ success: false, message: "Brand ID is required" });
        }
        console.log('delete',id)
        await Brand.deleteOne({ _id: id });
        res.json({ success: true });
    } catch (error) {
        console.log("Error deleting brand:", error);
        res.status(500).json({ success: false, message: "Error deleting brand" });
    }
};

module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unblockBrand,
    deleteBrand
}



