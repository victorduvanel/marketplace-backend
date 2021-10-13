import Product from "../models/product";
import Order from "../models/order";
import fs from "fs";

export const create = async (req, res) => {
  // console.log('req.fields', req.fields)
  // console.log('req.files', req.files)
  try {
    let fields = req.fields;
    let files = req.files;

    let product = new Product(fields);
    product.postedBy = req.user._id;
    //handle image
    if (files.image) {
      product.image.data = fs.readFileSync(files.image.path);
      product.image.contentType = files.image.type;
    }

    product.save((err, result) => {
      if (err) {
        console.log("saving product err =>", err);
        res
          .status(404)
          .send("Vous devez remplir tous les champs pour publier un article");
      }
      res.json(result);
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      err: err.message,
    });
  }
};

export const products = async (req, res) => {
  let all = await Product.find({})
    .limit(24)
    .select("-image.data")
    .populate("postedBy", "_id name")
    .exec();
  // console.log(all);
  res.json(all);
};

export const image = async (req, res) => {
  let product = await Product.findById(req.params.productId).exec();
  if (product && product.image && product.image.data !== null) {
    res.set("Content-Type", product.image.contentType);
    return res.send(product.image.data);
  }
};

export const sellerProducts = async (req, res) => {
  let all = await Product.find({ postedBy: req.user._id })
    .select("-image.data")
    .populate("postedBy", "_id name")
    .exec();
  // console.log(all);
  res.send(all);
};

export const remove = async (req, res) => {
  let removed = await Product.findByIdAndDelete(req.params.productId)
    .select("-image.data")
    .exec();
  res.json(removed);
};

export const read = async (req, res) => {
  let product = await Product.findById(req.params.productId)
    .populate("postedBy", "_id name")
    .select("-image.data")
    .exec();
  res.json(product);
};

export const update = async (req, res) => {
  try {
    let fields = req.fields;
    let files = req.files;

    let data = { ...fields };

    if (files.image) {
      let image = {};
      image.data = fs.readFileSync(files.image.path);
      image.contentType = files.image.type;

      data.image = image;
    }

    let updated = await Product.findByIdAndUpdate(req.params.productId, data, {
      new: true,
    }).select("-image.data");

    res.json(updated);
  } catch (err) {
    console.log(err);
    res.status(400).send("Echec de la mise à jour, essayez à nouveau");
  }
};

export const userProductPurchase = async (req, res) => {
  const all = await Order.find({ orderedBy: req.user._id })
    .select("session")
    .populate("product", "-image.data")
    .populate("orderedBy", "_id name")
    .exec();
  res.json(all);
};

export const isAllreadyPurchased = async (req, res) => {
  const { productId } = req.params;
  // find orders of the currently logged in user
  // TO DO : CHECK QUANTITY INTO STOCK
  const userOrders = await Order.find({ orderedBy: req.user._id })
    .select("product")
    .exec();
  // check if productId is found in userOrders array
  let ids = [];
  for (let i = 0; i < userOrders.length; i++) {
    ids.push(userOrders[i].product.toString());
  }
  res.json({
    ok: ids.includes(productId),
  });
};
