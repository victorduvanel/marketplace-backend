import User from "../models/user";
import Stripe from "stripe";
import queryString from "query-string";
import Product from "../models/product";
import Order from "../models/order";

const stripe = Stripe(process.env.STRIPE_SECRET);

export const createConnectAccount = async (req, res) => {
  // 1. find user from db
  const user = await User.findById(req.user._id).exec();
  console.log("USER ==> ", user);
  // 2. if user don't have stripe_account_id yet, create now
  if (!user.stripe_account_id) {
    const account = await stripe.accounts.create({
      type: "express",
    });
    console.log("ACCOUNT ===> ", account);
    user.stripe_account_id = account.id;
    user.save();
  }
  // 3. create account link based on account ID
  let accountLink = await stripe.accountLinks.create({
    account: user.stripe_account_id,
    refresh_url: process.env.STRIPE_REDIRECT_URL,
    return_url: process.env.STRIPE_REDIRECT_URL,
    type: "account_onboarding",
  });
  // pre fill email information for UX
  accountLink = Object.assign(accountLink, {
    "stripe_user[email]": user.email || undefined,
  });
  //   console.log("ACCOUNT LINK", accountLink);
  let link = `${accountLink.url}?${queryString.stringify(accountLink)}`;
  console.log("LOGIN LINK", link);
  res.send(link);

  //4. update payment schedule
};

const updateDelayDays = async (accountId) => {
  const account = await stripe.accounts.update(accountId, {
    payout_schedule: {
      delay_days: 10,
    },
  });
  return account;
};

export const getAccountStatus = async (req, res) => {
  // console.log('GET ACCOUNT STATUS')
  const user = await User.findById(req.user._id).exec();
  const account = await stripe.accounts.retrieve(user.stripe_account_id);
  // console.log('USER ACCOUNT RETRIEVE', account)
  // udpate delay days
  const updatedAccount = await updateDelayDays(account.id);
  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    {
      stripe_seller: updatedAccount,
    },
    { new: true }
  )
    .select("-password")
    .exec();
  // console.log(updatedUser)
  res.json(updatedUser);
};

export const getAccountBalance = async (req, res) => {
  const user = await User.findById(req.user._id).exec();

  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: user.stripe_account_id,
    });
    // console.log('BALANCE ===>', balance)
    res.json(balance);
  } catch (err) {
    console.log(err);
  }
};

export const payoutSetting = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).exec();

    const loginLink = await stripe.accounts.createLoginLink(
      user.stripe_account_id,
      {
        redirect_url: process.env.STRIPE_SETTING_REDIRECT_URL,
      }
    );
    // console.log("LOGIN LINK FOR PAYOUT SETTING", loginLink);
    res.json(loginLink);
  } catch (err) {
    console.log("STRIPE PAYOUT SETTING ERR", err);
  }
};

export const stripeSessionId = async (req, res) => {
  // console.log("you hit stripe session ID badass totor, here is it : ", req.body.productId)

  // 1. get productId from req.body
  const { productId } = req.body;
  // 2. find the product based on product id from db
  const item = await Product.findById(productId).populate("postedBy").exec();
  // 3. 10% charge as application fee
  const fee = (item.price * 10) / 100;
  // 4. create a session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    // 5. purchasing item details, it will be shown to user on checkout
    line_items: [
      {
        name: item.title,
        amount: item.price * 100, // c'est en centimes
        currency: "chf",
        quantity: 1,
      },
    ],
    // 6. create payment intent with application fee and destination charge 90%
    payment_intent_data: {
      application_fee_amount: fee * 100,
      // this seller can see his balance in our frontend dashboard
      transfer_data: {
        destination: item.postedBy.stripe_account_id,
      },
    },
    //success and cancel
    success_url: `${process.env.STRIPE_SUCCESS_URL}/${item.id}`,
    cancel_url: process.env.STRIPE_CANCEL_URL,
  });
  // 7. add this session object to user in the db
  await User.findByIdAndUpdate(req.user._id, { stripeSession: session }).exec();
  // 8. send  session id as response to frontend
  res.send({
    sessionId: session.id,
  });
};

export const stripeSuccess = async (req, res) => {
  try {
    // 1. get product ID from req.body
    const { productId } = req.body;
    // 2. find currently logged in user
    const user = await User.findById(req.user._id).exec();
    // 2.1 check is user has Stripe session
    if (!user.stripeSession) return;
    // 3. retrieve stripe session, bases on session id we previously save in user db
    const session = await stripe.checkout.sessions.retrieve(
      user.stripeSession.id
    );
    // 4. if session payment status id paid, create order
    if (session.payment_status === "paid") {
      // 5. check if order with that session id already exist by querying orders collection
      const orderExist = await Order.findOne({
        "session.id": session.id,
      }).exec();
      if (orderExist) {
        // 6. if order exist send success true
        res.json({ succes: true });
      } else {
        // 7. else create new order and send success true
        let newOrder = await new Order({
          product: productId,
          session,
          orderedBy: user._id,
        }).save();
        // 8. remove user's stripeSession
        await User.findByIdAndUpdate(user._id, {
          $set: { stripeSession: {} },
        });
        res.json({ success: true });
      }
    }
  } catch (err) {
    console.log("STRIPE SUCCESS ERR", err);
  }
};
