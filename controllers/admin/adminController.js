const user = require('../../models/userSchema')
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")


const pageError = async (req,res)=>{
    res.render("admin-error")
}

const loadLogin = (req,res)=>{
    console.log('Session:', req.session)
    if(req.session.admin){
        return res.redirect("/admin")
    }
    res.render("admin-login",{message:null})
}

const login = async (req,res)=>{
    try {
        const {email,password} = req.body
        const admin = await user.findOne({email,isAdmin:true})
        if(admin){

            const passwordMatch = bcrypt.compare(password,admin.password)
            if(passwordMatch){
                req.session.admin = true
                return res.redirect("/admin")
            }else{
                return res.render('admin-login', { message: "Invalid password" });
            }

        } else {
            
            return res.render('admin-login', { message: "Admin not found" });
        }
    } catch (error) {
        console.log("login error",error)
        return res.redirect("/pageError")
    }
}

const loadDashboard = async (req,res)=>{
    if(req.session.admin){
        try {
            res.render("dashboard")
        } catch (error) {
            res.redirect("/pageError")
        }
    } else {
        res.redirect("/admin/login"); 
    }
}

const logout = async (req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroying session",err)
                return res.redirect("/pageError")
            }
            res.redirect("/admin/login")
        })
    } catch (error) {
        console.log("Unexpeted error during logout", error)
        res.redirect("/pageError")
    }
}

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout
}


