import mongoose from "mongoose";

const hobbySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    emoji: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Hobby = mongoose.model("Hobby", hobbySchema);

export default Hobby;
