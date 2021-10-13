import expressJwt from "express-jwt";
import Product from "../models/product";

export const requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
});

export const productOwner = async (req, res, next) => {
  let product = await Product.findById(req.params.productId).exec();
  let owner = product.postedBy._id.toString() === req.user._id.toString();
  if (!owner) {
    return res.status(403).send("non autorisé");
  }
  next();
};
