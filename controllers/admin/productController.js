const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Brand = require("../../models/brandSchema")
const fs = require("fs")
const path = require("path")
const User = require("../../models/userSchema")
const sharp = require("sharp")
const statusCodes = require("../../utils/statusCodes")


const getProductAddPage = async (req,res)=>{
    try {
        const category = await Category.find({isListed:true})
        const brand = await Brand.find({isBlocked:false})

        res.render("add-product",{
            cat:category,
            brand:brand
        })
        
    } catch (error) {
        res.redirect("/pageerror")
    }
}

const addProducts = async (req,res) => {
    try {
        const products = req.body;
        const productExists = await Product.findOne({
            productName:products.productName
        })

        if(!productExists){
            const images = [];
            
            if(req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;
                    const resizedImagePath = path.join("public", "uploads", "product-images", req.files[i].filename);
                    await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }
            

            const categoryId = await Category.findOne({name:products.category})

            if(!categoryId){
                return res.status(statusCodes.BAD_REQUEST).json("Invalid category name")
            }

            const newProduct = new Product({
                productName:products.productName,
                description:products.description,
                brand:products.brand,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                createdAt:new Date(),
                quantity:products.quantity,
                size:products.size,
                color:products.color,
                productImage:images,
                status:"Available",
            })

            await newProduct.save();
            return res.redirect('/admin/addproducts')

        }else{
            return res.status(statusCodes.BAD_REQUEST).json("Product already exists, please try with another name");
        }

    } catch (error) {
        console.error("Error adding product",error)
        res.redirect('/admin/pageerror')
    }
}

const getAllProducts = async (req,res)=>{
    try {
        const search = req.query.search || ""
        const page = req.query.page || 1
        const limit = 4

        const productData = await Product.find({
            $or:[

                {productName:{$regex:new RegExp(".*"+search+".*","i")}},
                {brand:{$regex:new RegExp(".*"+search+".*","i")}}

            ],
        }).limit(limit*1)
        .skip((page-1)*limit).populate('category','name')
        
        .exec()
        

        const count = await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}},
                {brand:{$regex:new RegExp(".*"+search+".*","i")}}
            ]
        }).countDocuments()

        const category = await Category.find({isListed:true})
        const brand = await Brand.find({isBlocked:false})

        if(category && brand){
            res.render("product-list",{
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                cat:category,
                brand:brand

            })
        }else{
            res.render("admin-error")
        }

    } catch (error) {
        res.redirect("/pageerror")
    }
}

const addProductOffer = async(req,res)=>{
    try {
        const {productId,percentage} = req.body
        const findProduct = await Product.findOne({_id:productId})
        const findCategory = await Category.findOne({_id:findProduct.category})
        
        if(findCategory.categoryOffer > percentage){
            return res.json({status:false,message:"The products category already has a category offer"})
        }

        findProduct.salePrice = findProduct.salePrice-Math.floor(findProduct.salePrice * (percentage / 100))
        findProduct.productOffer = parseInt(percentage)
        await findProduct.save()
        findCategory.categoryOffer=0
        await findCategory.save()
        
        res.json({status:true})


    } catch (error) {
        res.redirect("/pageerror")
        res.status(statusCodes.INTERNAL_SERVER_ERROR).json({status:false,message:"Internal Server Error"})
    }
}

const removeProductOffer = async (req,res)=>{
    try {
        const {productId} = req.body
        const findProduct = await Product.findOne({_id:productId})
        const percentage = findProduct.productOffer
        findProduct.salePrice = Math.ceil(findProduct.salePrice / (1 - (percentage / 100)));
        findProduct.productOffer = 0 
        await findProduct.save()
        res.json({status:true})
    } catch (error) {
        res.redirect("/pageerror")
    }
}

const blockProduct = async(req,res)=>{
    try {
        let id = req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/pageerror")
    }
}

const unblockProduct = async(req,res)=>{
    try {
        let id = req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/pageerror")
    }
}

// const blockunblock = async (req,res)=> {

//     try {
//         const id = req.query.id
//         const product = await Product.findById(id)
//         if(product.isBlocked === true){
//             await Product.updateOne({_id:id},{$set:{isBlocked:false}})
//         }else{
//             await Product.updateOne({_id:id},{$set:{isBlocked:true}})
//         }
        
//     } catch (error) {
//         res.redirect("/pageerror")
//     }

// }

const getEditProduct = async (req,res)=>{
    try {
        const id = req.query.id
        const product = await Product.findOne({_id:id}).populate('category');
        const category = await Category.find({})
        const brand = await Brand.find({})
        res.render("edit-product",{
            product:product,
            cat:category,
            brand:brand
        })

    } catch (error) {
        res.redirect("/pageerror")
    }
}

const editProduct = async (req,res)=>{
    try {
        const id= req.params.id
        const product = await Product.findOne({_id:id})
        const data = req.body
        
        const existingProduct = await Product.findOne({
            productName:data.productName,
            _id:{$ne:id}
        })
        if(existingProduct){
            return res.status(statusCodes.BAD_REQUEST).json({error:"Product with this name already exists. Please try with another name"})
        }

        const category = await Category.findOne({name:data.category})
        console.log(category)

        const images = []

        if(req.files && req.files.length > 0){
            for(let i = 0;i < req.files.length;i++){
                images.push(req.files[i].filename)
            }
        }

        const updateFields = {
            productName:data.productName,
            description:data.description,
            brand:data.brand,
            category:category._id,
            regularPrice:data.regularPrice,
            salePrice:data.salePrice,
            quantity:data.quantity,
            size:data.size,
            color:data.color
        }
        if(req.files.length > 0 ){
            updateFields.$push = {productImage:{$each:images}}
        }

        await Product.findByIdAndUpdate(id,updateFields,{new:true})
        res.redirect("/admin/products")

    } catch (error) {
        console.error(error)
    }
}

const deleteSingleImage = async (req,res)=>{
    try {
        const {imageNameToServer,productIdToServer} = req.body
        console.log(req.body)
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}})
        const imagePath = path.join("public","uploads","re-image",imageNameToServer)
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath)
            console.log(`Image ${imageNameToServer} deleted successfully`)
        }else{
            console.log(`Image ${imageNameToServer} not found`)
        }
        res.send({status:true})
    } catch (error) {
        res.redirect("/pageerror")
    }
}

module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage
}