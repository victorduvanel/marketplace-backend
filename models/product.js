import mongoose from "mongoose";

const { Schema } = mongoose;
const { ObjectId } = mongoose.Schema;

const productSchema = new Schema(
  {
    title: {
      type: String,
      required: "Le titre est requis",
    },
    description: {
      type: String,
      required: "La description est requis",
      mayLength: 10000,
    },
    price: {
      type: Number,
      required: "Le prix est requis",
      trim: true,
    },
    postedBy: {
      type: ObjectId,
      ref: "User",
    },
    image: {
      data: Buffer,
      contentType: String,
    },
    quantity: {
      type: Number,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
