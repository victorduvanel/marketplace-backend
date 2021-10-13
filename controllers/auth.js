import User from "../models/user";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    console.log(req.body);
    const { name, email, password } = req.body;
    // ==> validation
    if (!name) return res.status(400).send("Le nom est requis");
    if (!password || password.lenght < 6)
      return res
        .status(400)
        .send(
          "Le mot de passe est requis et doit contenir 6 caractères minimum"
        );
    let userExist = await User.findOne({ email }).exec();
    if (userExist) return res.status(400).send("Cet email est déjà utilisé");
    // ==> Register
    const user = new User(req.body);

    await user.save();
    console.log("YOUHOU, UTILISATEUR CRÉÉ", user);
    return res.json({ ok: true });
  } catch (err) {
    console.log("Impossible de créer ce compte", err);
    return res.status(400).send("Oups, merci de ré-essayer");
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    //check if user with this email exist
    let user = await User.findOne({ email }).exec();
    if (!user)
      return res
        .status(400)
        .send("Aucun utilisateur avec cet email n'a été trouvé");
    // compare password
    user.comparePassword(password, (err, match) => {
      console.log("COMPARE PASSORD IN LOGIN ERROR", err);
      if (!match || err)
        return res.status(400).send("Le password est incorrect");
      // GENERATE TOKEN
      let token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          stripe_account_id: user.stripe_account_id,
          stripe_seller: user.stripe_seller,
          stripeSession: user.stripeSession,
        },
      });
    });
  } catch (err) {
    console.log("LOGIN ERROR", err);
    res.status(400).send("Signin failed");
  }
};
