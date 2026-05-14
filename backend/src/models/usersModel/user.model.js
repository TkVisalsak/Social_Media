import mongoose from "mongoose";

const  userSchema = new mongoose.Schema(
{
    email: {
        type: String,
        required: true,
        unique: true,
    },
    userName: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
    },
    profilePic:{
        type: String,
        default: "",
    },
    firstName:{
        type: String,
        default: "",
    },
    lastName:{
        type: String,
        default: "",
    },
    dob:{
        type: String,
        default: "",
    },
    gender:{
        type: String,
        default: "",
    },
    bio:{
        type: String,
        default: "",
    },
    phoneNumber:{
        type: String,
        default: "",
    },
    hobbies: {
        type: [String],
        default: [],
        index: true,
    },

    followersListPublic: {
        type: Boolean,
        default: true,
    },
    followingListPublic: {
        type: Boolean,
        default: true,
    },
    savedPostsPublic: {
        type: Boolean,
        default: false,
    },

},
    {timestamps: true}
);


userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});


userSchema.set("toJSON", {
  virtuals: true,
});

const User = mongoose.model("User",userSchema);

export default User;