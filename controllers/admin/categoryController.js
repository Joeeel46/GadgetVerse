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

        if(name.length < 4){
            return res.status(statusCodes.BAD_REQUEST).json({ icon:'warning', message: "Category name cannot be empty!" });
        }

        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });
        if(existingCategory){
            return res.status(statusCodes.BAD_REQUEST).json({icon:'warning',error:"Category already exists"})
        }
        const newCategory = new Category({
            name,
            description
        })
        console.log('catagory:',newCategory)
        await newCategory.save()
        return res.status(statusCodes.OK).json({icon:'success',message:"Category added successfully"})

    } catch (error) {
        
        return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({icon:'danger',error:"Internal Server Error"})
    }
}

const addCategoryOffer = async (req, res) => {
    try {
        const { categoryId, percentage } = req.body;
        
        // Input validation
        if (!categoryId || !percentage || percentage < 1 || percentage > 99) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid input parameters" 
            });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json({ 
                success: false, 
                message: "Category not found" 
            });
        }

        const products = await Product.find({ category: category._id });
        if (products.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "No products found in this category" 
            });
        }

        // Check for existing product offers
        const hasProductOffer = products.some(product => product.productOffer > percentage);
        if (hasProductOffer) {
            return res.status(400).json({ 
                success: false, 
                message: "Products within this category already have higher product offers" 
            });
        }

        // Check if same offer already exists
        if (category.categoryOffer === percentage) {
            return res.status(400).json({ 
                success: false, 
                message: "Offer is already applied with the same percentage" 
            });
        }

        // Update category offer
        category.categoryOffer = percentage;
        await category.save();

        // Update product prices
        const updatedProducts = [];
        for (const product of products) {
            product.productOffer = 0; // Reset product offer
            product.salePrice = Math.max(0, Math.floor(product.regularPrice * (1 - percentage / 100)));
            await product.save();
            updatedProducts.push({
                id: product._id,
                salePrice: product.salePrice
            });
        }

        return res.status(200).json({
            success: true,
            message: "Category offer added successfully",
            products: updatedProducts
        });

    } catch (error) {
        console.error('Add Category Offer Error:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error" 
        });
    }
};

const removeCategoryOffer = async (req, res) => {
    try {
        const { categoryId } = req.body;
        
        if (!categoryId) {
            return res.status(400).json({ 
                success: false, 
                message: "Category ID is required" 
            });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json({ 
                success: false, 
                message: "Category not found" 
            });
        }

        const previousOffer = category.categoryOffer;
        const products = await Product.find({ category: category._id });

        // Reset category offer
        category.categoryOffer = 0;
        await category.save();

        // Update product prices
        const updatedProducts = [];
        for (const product of products) {
            // Reset to regular price if no product offer exists
            product.salePrice = product.productOffer > 0 
                ? Math.floor(product.regularPrice * (1 - product.productOffer / 100))
                : product.regularPrice;
            
            await product.save();
            updatedProducts.push({
                id: product._id,
                salePrice: product.salePrice
            });
        }

        return res.status(200).json({
            success: true,
            message: "Category offer removed successfully",
            products: updatedProducts
        });

    } catch (error) {
        console.error('Remove Category Offer Error:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error" 
        });
    }
};

const getListCategory = async (req, res) => {
    try {
        let catId = req.query.id;
        const category = await Category.findByIdAndUpdate(catId, { $set: { isListed: false } });

        // Respond with success status
        res.json({ status: 'success' });
    } catch (error) {
        res.json({ status: 'error' });
    }
};

const getUnlistCategory = async (req, res) => {
    try {
        const catId = req.query.id;
        const category = await Category.updateOne({ _id: catId }, { $set: { isListed: true } });

        // Respond with success status
        res.json({ status: 'success' });
    } catch (error) {
        res.json({ status: 'error' });
    }
};

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

