const express = require('express');
const app = express();
const mongoose = require("mongoose");
var nodemailer = require("nodemailer");
const crypto = require("crypto");
const bodyParser = require('body-parser');

const cors = require("cors");   //to communicate cross domain
const bcrypt = require("bcryptjs");  //to encrypted Password

const jwt = require("jsonwebtoken");

require('dotenv').config();



app.set("view engine", "ejs");
app.use(express.urlencoded({extended:false}));  //changing password data is passed to react we use this
app.use(express.json());

const JWT_SECRET = process.env.JWT_TOKEN;

app.use(cors());
app.use(bodyParser.json());
// mongodb://localhost:27017

const mongoUrl = process.env.MONGO_DB_URL_LOCAL

mongoose.connect(mongoUrl, {
    useNewUrlParser:true
}).then(() => {
    console.log("connected to data base")
}).catch(e => console.log(e))


require("./userDetails");

const User = mongoose.model("UserInfo");

// Register api 

app.post("/register", async(req,res)=> {
    const {fullname, email, password} = req.body;

    
    try {
        const  oldUser = await User.findOne({email})
        if (oldUser) {
           return res.send({error : "User Exists"})
           
        } else if (fullname === "") {
            return res.send({error : "Please Enter the Full name"})
        } 
        else if (email === "") {
            return res.send({error : "Please Enter the Email"})
        } else if (password === "") {
            return res.send({error : "Please Enter the password"})
        }
        const  encryptedPassword =  await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(20).toString('hex');
         await User.create({
            fullname, 
            email,
            password: encryptedPassword,
            verificationToken,
        });
        // await newUser.save();
        sendVerificationEmail(email,verificationToken)
       
        res.send({ status: 201,message:"User Registered Successfully!"});
    } catch (error) {
        console.log(error,"maincjsdnkja")
        res.send({message: error})
    }
});

async function sendVerificationEmail(email,token) {

    const verfiyLink = `Click the following link to verify your email: http://localhost:5003/verify/${token}`;
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.VERIFY_EMAIL ,
          pass: process.env.VERIFY_EMAIL_PASS
        }
      });
      
      var mailOptions = {
        from: 'youremail@gmail.com',
        to: email,
        subject: 'Please verify your email',
        text: verfiyLink,
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error,"adkjnadoidkl");
        } else {
            res.json({status: "Success"})
          console.log('Email sent: ' + info.response);
        }
      });
    console.log(verfiyLink);
}

// verify email
app.get('/verify/:token', async(req,res) => {
    try {
        const {token} = req.params;
        const user = await User.findOne({verificationToken: token});
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }
        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();
        res.status(200).json({message: 'Email verified successfully'});
        
    } catch (error) {
        res.status(500).json({message: 'Server error'})
        
    }
})


// Login Api

app.post("/login-user", async(req,res) => {
    const {email, password} = req.body;

    const user = await User.findOne({ email })

    if (!user) {
        return res.json({error : "User Not found"})
     }
     if (await bcrypt.compare(password, user.password)){
        const token= jwt.sign({email: user.email}, JWT_SECRET, {
            expiresIn: "1d",
        });


        if (res.status(201)){
            return res.json({status:"ok" , data:token})
        
        } else {
            return res.json({error: "error"})
        }
     }
     return res.json({status:"error", error: "Invalid password"});
})

// User Data Api

app.post("/userData", async(req,res)=> {
    const { token }= req.body;
    try {
        const user = jwt.verify(token,JWT_SECRET,(err,res)=>{
            // if (err){
            //     return "token expired"
            // }
            // return res            
        })
        console.log(user)
        // if (user === "token expired"){
        //     return res.send({status: "error", data: "token expired"})
        // }

        const  useremail = user.email;
        User.findOne({email: useremail}).then((data)=> {
            res.send({status: "ok", data: data})
        }) .catch((error) => {
            res.send({status: 'error', data: error})
        })
        
    } catch (error) {
        
    }
})




// forgot Password Api

app.post("/forgot-password", async(req, res) => {
    const {email} = req.body;

    try {
        const oldUser = await User.findOne({email})
        if (!oldUser) {
            return res.json({  status:"User Not Exists!!"})
        }
    const secret = JWT_SECRET + oldUser.password 
    const token = jwt.sign({email: oldUser.email, id: oldUser._id}, 
        secret, { expiresIn: "4m",})
        

    const link =  `http://localhost:5003/reset-password/${oldUser._id}/${token}`;

    //   res.json({data: link})
    
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.APP_EMAIL,
          pass: process.env.APP_EMAIL_PASS
        }
      });
      
      var mailOptions = {
        from: 'youremail@gmail.com',
        to: email,
        subject: 'Password Reset',
        text: link,
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
            res.json({status: "Success"})
          console.log('Email sent: ' + info.response);
        }
      });
    console.log(link)

    }catch (error) {

    }

})

// after reset password getting Api 

app.get("/reset-password/:id/:token",async(req, res) => {
    const {id, token} = req.params;
    console.log(req.params)
  
    const oldUser = await User.findOne({ _id : id })
    if (!oldUser) {
        return res.json({status:"User Not Exists!!"})
    }
   const secret = JWT_SECRET + oldUser.password;

   try {
    const verify = jwt.verify(token, secret);
    res.render("index", {email: verify.email, status: "Not Verified"});
    
   } catch (error) {
    console.log(error)
    res.send("Not Verified")
   }
   
})


// after reset updating to api older api



app.post("/reset-password/:id/:token",async(req, res) => {
    const {id, token} = req.params;
    const {password} = req.body;

    const oldUser = await User.findOne({ _id: id })
    if (!oldUser) {
        return res.json({status:"User Not Exists!!"})
    }
   const secret = JWT_SECRET + oldUser.password;

   try {
    const verify = jwt.verify(token, secret);
    const encryptedPassword = await bcrypt.hash(password, 10);
    await User.updateOne(
        {
            _id: id,
        }, 
        {
        $set: {
            password: encryptedPassword,
        },
    }
    )
    // res.json({status:"Password Updated"})
    res.render("index", { email: verify.email, status: "verified"});
    
   } catch (error) {
    console.log(error)
    res.json({status:"Something went Wrong"})
   }
   
})







// app.post("/post", async (req,res) => {
//     console.log(req.body)
//     const {data} = req.body

//     try {
      
//     if (data == "Ranjith" ){
//         res.send({status:"ok"})
//     } else {
//         res.send({status:"User Not Found"})
//     }
        
//     } catch (error) {
//         res.send({status:"something went wrong"})
//     }

// })


let port = process.env.PORT || 5003

app.listen(port,()=> {
    console.log(`server started: ${port}`)
})
