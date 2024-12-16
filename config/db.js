const mongoose = require('mongoose')
const env = require('dotenv').config()


const connectDB = async ()=>{
    try {
        console.log("hello");
        
        await mongoose.connect(process.env.MONGODB_PR)
        console.log('DB connected')
    } catch (error) {
        console.log("DB Connection error",error.message)
        process.exit(1)
    }
    
}


module.exports = connectDB