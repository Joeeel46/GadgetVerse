const Category = require("../../models/categorySchema")
const Product = require("../../models/productSchema")
const Brand = require("../../models/brandSchema")
const Order = require("../../models/orderSchema")
const Wishlist = require("../../models/wishlistSchema")


const statusCodes = require("../../utils/statusCodes")
const { $gt, $in } = require("sift")
const Wallet = require("../../models/walletSchema")

const categoryInfo = async (req,res)=>{

    try {
        const page = parseInt(req.query.page) || 1
        const limit = 4
        const skip = (page-1)*limit

        const categoryData = await Category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        const totalCategories = await Category.countDocuments()
        const totalPages = Math.ceil(totalCategories / limit)
        res.render("category",{cat:categoryData,currentPage:page,totalPages: totalPages,totalCategories:totalCategories,error:null,success:null})
    
    } catch (error) {

        console.log(error)
        res.redirect("/pageerror")   

    }

}

const addCategory = async (req,res)=>{
    const {name,description} = req.body
    try {
        
        const existingCategory = await Category.findOne({name})
        if(existingCategory){
            return res.status(statusCodes.BAD_REQUEST).json({error:"Category already exists"})
        }
        const newCategory = new Category({
            name,
            description
        })
        console.log('catagory:',newCategory)
        await newCategory.save()
        return res.status(statusCodes.OK).json({message:"Category added successfully"})

    } catch (error) {
        
        return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({error:"Internal Server Error"})
    }
}

const addCategoryOffer = async (req,res)=>{
    try {
    
        const{categoryId,percentage}=req.body;
        
        const category = await Category.findById(categoryId)
        
        if(!category){
            return res.status(statusCodes.BAD_REQUEST).json({status:false,message:"Category not found"})
        }
        const products = await Product.find({category:category._id})
        const hasProductOffer = products.some((product)=>product.productOffer > percentage)
        if(hasProductOffer){
            return res.json({status:false,message:"Products within this category already have product offers"})
        }
        await Category.updateOne({_id:categoryId},{$set: {categoryOffer:percentage}})
        for(const product of products){
            product.productOffer = 0;
            product.salePrice = product.regularPrice - Math.floor(product.regularPrice * (percentage / 100));
            await product.save();
        }
        res.json({status:true})
 
    } catch (error) {
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({statues:false,message:"Internal Server Error"})
    }
}

const removeCategoryOffer = async (req,res)=>{
    try {
        const categoryId = req.body.categoryId
        const category = await Category.findById(categoryId)

        if(!category){
            return res.status(statusCodes.NOT_FOUND).json({status:false,message:"Category not found"})
        }

        const percentage = category.categoryOffer
        const products = await Product.find({category:category._id})

        if(products.length > 0 ){
            for(const product of products){
                product.salePrice += Math.floor(product.regularPrice * (percentage/100))
                product.productOffer = 0
                await product.save()
            }
        }

        category.categoryOffer = 0
        await category.save()
        res.json({status:true, message: "Category offer removed successfully" })

    } catch (error) {
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({status:false, message:"Intenal Server Error"})
    }
}

const getListCategory = async (req,res)=> {
    try {

        let catId = req.query.id
        await Category.findByIdAndUpdate(catId,{$set:{isListed:false}})
        res.redirect("/admin/category")

    } catch (error) {
        res.redirect("pageerror")
    }
}

const getUnlistCategory = async (req,res)=>{
    try {
        
        const catId=req.query.id;
        await Category.updateOne({_id:catId},{$set:{isListed:true}})
        res.redirect("/admin/category")

    } catch (error) {
        res.redirect("/pageerror")
    }
}

const getEditCategory = async (req,res)=>{
    try {

        const id = req.query.id
        const category = await Category.findOne({_id:id})
        res.render("edit-category",{category:category})

    } catch (error) {
        res.redirect("/pageerror")
    }
}

const editCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const { categoryname, description } = req.body;

        // Check if a category with the same name exists, excluding the current one
        const existingCategory = await Category.findOne({ name: categoryname, _id: { $ne: id } });

        if (existingCategory) {
            return res.status(statusCodes.BAD_REQUEST).json({ error: "Category exists, please choose another name" });
        }

        // Update the category
        const updateCategory = await Category.findByIdAndUpdate(
            id,
            {
                name: categoryname,
                description: description
            },
            { new: true } // Return the updated document
        );

        if (updateCategory) {
            res.redirect("/admin/category");
        } else {
            res.status(statusCodes.NOT_FOUND).json({ error: "Category not found" });
        }

    } catch (error) {
        console.error(error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal Server Error" });
    }
};


// const wishlist = async (req,res)=>{
//     try {
         
//         const userId = req.session.user
//         const orders = await Order.find({userId,status:{$in:['Delivered','Cancelled']}}).populate({path:'orderedItems.product',select:'productName brand'}).sort({createdOn:-1}).limit(3)
        

//     } catch (error) {
//         console.error(error);
//         res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal Server Error" });
//     }
// }


module.exports = {
    categoryInfo,
    addCategory,
    removeCategoryOffer,
    addCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory
}

