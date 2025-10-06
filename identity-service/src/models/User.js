const mongoose = require("mongoose");
const argon2 = require("argon2");

//create  userSchema
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

//this is a middleware hook that run before the document with saved to mongoDB (.save() or .create()) ,this.isModified checks if password is changed or is newly created (then only hashing run if password is not modifed then hashing is skippe).
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    try {
      //a secure password hashing algorithm to hash the plain-text password. so the plain password is stored as hash before saving to DB. if hashing fails(memory issue, invalid inputs) go to catch block then (next)which tells mongoose to stop saving and throw an eror.
      this.password = await argon2.hash(this.password);
      //   next(); // -> continue saving
    } catch (error) {
      return next(error);
    }
  } else {
    // next(); //-> continue if password not modified
  }
});

//this defines a custom instance method on new User model ,
// candidatePassword is plain password provided by the user during login.
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    //this.password is the hashed password stored in DB. verify check if db pass is same as plain passs nd retru true if matches
    return await argon2.verify(this.password, candidatePassword);
  } catch (error) {
    throw error;
  }
};

//creates a text index on "username" field, userfull for searching users by username.
userSchema.index({ username: "text" });

const User = mongoose.model("User", userSchema);
module.exports = User;
