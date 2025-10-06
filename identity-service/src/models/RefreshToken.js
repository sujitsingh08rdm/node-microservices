const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: "true", unique: true },
    //user will refer to User
    /*
    ex. 
    every document in MongoDB automatically gets a unique _id field of type ObjectId, unless you explicitly override it.
        const user = await User.create({ username: "sujit", email: "test@test.com", password:   "123" });
        console.log(user._id); // something like: 6512f3a9c9e7e432a887f8c1
    
    that _id from user document is what we store in the user field of the refresh token    
       
        const refreshToken = await RefreshToken.create({
            token: "random-refresh-token-string",
            user: user._id,  // link to User document
        });
    When we later populate it, Mongoose replaces the ObjectId with the actual User object:    

        const tokenDoc = await RefreshToken.findOne({ token }).populate("user");
        console.log(tokenDoc.user.username); // works because "user" is populated

       tokenDoc = {
          _id: new ObjectId("6512f4d9a21e5a4c9930bc12"),
          token: 'random-refresh-token-xyz123',
          user: {
                _id: new ObjectId("6512f3a9c9e7e432a887f8c1"),
                 username: 'sujit',
                email: 'sujit@example.com',
                password: '$argon2id$v=19$m=4096,t=3,p=1$Wmr...', // hashed
                createdAt: 2025-09-29T07:30:12.345Z,
                updatedAt: 2025-09-29T07:30:12.345Z,
                __v: 0
                },
            __v: 0
            }
        */
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

//In MongoDB (and Mongoose), an index is like a “shortcut” that makes it faster to find documents in a collection based on a specific field or fields. Without an index, MongoDB has to scan every document to find what you want. With an index, it can go straight to the relevant documents.

//refreshTokenSchema.index({ expiresAt: 1 }, { expiresAfterSeconds: 0 }) tells MongoDB:
// ("Keep track of expiresAt so I can quickly delete expired tokens automatically.");

//There are two separate meanings for the 1 and the 0 here — they are not the same thing.
// { expiresAt: 1 }  // ascending index on expiresAt
// { expiresAt: -1 } // descending index on expiresAt
//The 0 in { expiresAfterSeconds: 0 } It means delete the document exactly at the time stored in expiresAt. So if expiresAfterSeconds: 0, it’s exactly expiresAt.

refreshTokenSchema.index({ expiresAt: 1 }, { expiresAfterSeconds: 0 });

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
module.exports = RefreshToken;
