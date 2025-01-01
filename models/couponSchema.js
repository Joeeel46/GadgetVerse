const mongoose = require("mongoose")
const {Schema} = mongoose

const couponSchema = new Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    createdOn: {
        type:Date,
        default:Date.now,
        required:true
    },
    expiredOn: {
        type:Date,
        required:true
    },
    offerPercentage:{
        type: Number,
        required:true
    },
    minimumPrice:{
        type:Number,
        required: true
    },
    isList:{
        type:Boolean,
        default:true
    },
    userId: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    maxDiscount: {
        type: Number,
        required: true
    }
})


const Coupon = mongoose.model("Coupon",couponSchema)


module.exports = Coupon