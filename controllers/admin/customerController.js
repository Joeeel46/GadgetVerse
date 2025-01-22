const statusCodes = require("../../utils/statusCodes")

const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page, 10); 
        }

        const limit = 3;

        
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        })
        .limit(limit) 
        .skip((page - 1) * limit) 
        .exec();

    
        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        });

        const totalPages = count/limit;

        
        res.render("customer",{data:userData,totalPages,currentPage:page})
    } catch (error) {
        console.error("Error fetching customer info:", error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};

const customerBlocked = async (req,res)=>{
    try {
        let id = req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/users")
    } catch (error) {
        res.redirect("/pageError")
    }
}

const customerunBlocked = async (req,res)=>{
    try {
        let id = req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/users")
    } catch (error) {
        res.redirect("/pageError")
    }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked
};
