const express = require('express')
const app = express()
const env = require('dotenv').config()


app.listen(process.env.PORT,()=>{
    console.log("Server running.....")
})

module.exports = index