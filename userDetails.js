const mongoose = require("mongoose")

const UserDetailsScehma = new mongoose.Schema(
    {
        fullname: String,
        email: {type:String, unique: true, required: true},
        password: String,
        isVerified: { type: Boolean, default: false },
        verificationToken: { type: String },
          
    }, {
        collection: "UserInfo",
    }
)

mongoose.model("UserInfo", UserDetailsScehma)