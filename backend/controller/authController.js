const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

// replace this with your DB logic (Prisma later)
const users = []; // temporary

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: Date.now(),
      email,
      password: hashedPassword,
      role: "user",
    };

    users.push(user);

    const token = generateToken(user);

    res.status(201).json({ token, user });
  } catch (error) {
    res.status(500).json({ message: "Error registering user" });
  }
};
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find((u) => u.email === email);

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: "Error logging in" });
  }
};
