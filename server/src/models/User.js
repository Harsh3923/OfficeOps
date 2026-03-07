const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name:{
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email:{
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
        },
        password:{
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
        },
        role:{
            type: String,
            enum: ["ADMIN", "IT", "EMPLOYEE"],
            default: "EMPLOYEE",
        },
        isVerified:{
            type: Boolean,
            default: true,
        },
        department:{
            type: String,
            trim: true,
            default: "",
        },
        jobTitle:{
            type: String,
            trim: true,
            default: "",
        },
        location:{
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;