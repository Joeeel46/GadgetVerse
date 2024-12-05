const express = require('express');
const app = express();
const path = require('path');
const env = require('dotenv').config();
const session = require('express-session')
const db = require('./config/db');
const passport = require('./config/passport')
const adminRouter = require('./routes/adminRouter')
const userRouter = require('./routes/userRouter');
db();



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,////set true during production
        httpOnly:true,
        maxAge:72*80*60*1000
    }
}))


app.use(passport.initialize())
app.use(passport.session())

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
})

app.set('view engine', 'ejs');

app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);


app.use(express.static(path.join(__dirname, 'public')));

app.use('/', userRouter);

app.use('/admin',adminRouter)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running.....");
});

module.exports = app

