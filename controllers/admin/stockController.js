const Product = require('../../models/productSchema')

const getStockPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Default to page 1 if not specified
        const limit = 4; // Number of items per page

        // Pagination logic applied to the database query
        const products = await Product.find()
            .populate("category", "name")
            .limit(limit)
            .skip((page - 1) * limit);

        // Fetch total count for all products to calculate total pages
        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / limit);

        res.render("stock-managment", {
            data: products,
            currentPage: page,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error("Error in loading stock management page:", error);
        res.status(500).send("Error in loading stock management page.");
    }
};


const updateStock = async (req,res) => {
    try {
        const {productId,newStock} = req.body;
        await Product.findByIdAndUpdate(productId,{quantity:newStock});
        res.json({success:true})

    } catch (error) {
        console.log("Error updating Stock");
        res.json({success:false});
    }
}

module.exports ={
    getStockPage,
    updateStock
}