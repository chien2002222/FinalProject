var express = require("express");
var router = express.Router();
var UserModel = require("../models/UserModel");
const nodemailer = require("nodemailer");
var BookingModel = require("../models/BookingModel");
var MovieModel = require("../models/MovieModel");

//import "bcryptjs" library
var bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  checkMultipleSession,
  checkSingleSession,
} = require("../middlewares/auth");
const { error } = require("console");
var salt = 8; //random value

// get all user
router.get("/", checkSingleSession, async (req, res) => {
  try {
    var userList = await UserModel.find({ role: "user" });
    res.render("auth/index", { userList, layout: "admin" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

//Profile page
router.get('/profile', async (req, res) => {
  try {
      const userId = req.session.userId; // Lấy ID của người dùng từ session
      const user = await UserModel.findById(userId);

      if (!user) {
          return res.status(404).send('User not found');
      }
      // Render template của trang profile và truyền thông tin người dùng vào
      res.render('auth/profile', { user });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  }
});

router.get('/edit', async(req,res)=>{
  try {
    const userId = req.session.userId; // Lấy ID của người dùng từ session
    const user = await UserModel.findById(userId);

    if (!user) {
        return res.status(404).send('User not found');
    }
    // Render template của trang profile và truyền thông tin người dùng vào
    res.render('auth/edit', { user });
} catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
}
})


router.post('/edit', async(req,res)=>{
  try{
      const userID = req.session.userId; // Lấy ID của người dùng từ session
      const { username, email } = req.body; // Lấy thông tin người dùng mới từ request body
      
      // Kiểm tra xem người dùng có tồn tại không
      const user = await UserModel.findById(userID);
      if (!user) {
          return res.status(404).send('User not found');
      }
      // Cập nhật thông tin người dùng
      user.username = username;
      user.email = email;
      // Lưu thông tin người dùng đã cập nhật vào cơ sở dữ liệu
      await user.save();

      // Redirect người dùng đến trang profile sau khi chỉnh sửa thành công
      res.redirect('/auth/profile');
  }catch(err){
      // Xử lý lỗi
      console.error('Error:', err);
      res.status(500).send('Internal Server Error');
  }
})

//Disable account
router.post("/disable-user/:userId", checkSingleSession, async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).send("User not found");
    }

    user.isEnable = false;
    await user.save();

    res.redirect("/auth/");
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

//enable user
router.post("/enable-user/:userId", checkSingleSession, async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).send("User not found");
    }

    user.isEnable = true;
    await user.save();

    res.redirect("/auth/");
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});



router.get("/dashboard", checkSingleSession, async (req, res) => {
  try {
    // Đếm số lượng người dùng, số lượng đặt vé và số lượng phim
    const userCount = await UserModel.countDocuments({});
    const bookingCount = await BookingModel.countDocuments({});
    const movieCount = await MovieModel.countDocuments({});

    // Lấy danh sách các booking
    const bookings = await BookingModel.find({});

    // Tính tổng tiền từ các booking
    let totalRevenue = 0;
    bookings.forEach((booking) => {
      totalRevenue += booking.totalPrice;
    });
    res.render("auth/dashboard", {
      movieCount,
      bookingCount,
      userCount,
      totalRevenue,
      layout: "admin",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/register", (req, res) => {
  res.render("auth/register", { layout: "loginregister_layout" });
});

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, repassword } = req.body;

    // Kiểm tra xem mật khẩu và mật khẩu nhập lại có khớp nhau không
    if (password !== repassword) {
      return res.render("auth/register", {
        layout: "loginregister_layout",
        errorMessage: "Password incorrect",
      });
    }
     // Kiểm tra xem mật khẩu có ít nhất 6 kí tự và phải có cả chữ và số
     const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
     if (!passwordRegex.test(password)) {
       return res.render("auth/register", {
         layout: "loginregister_layout",
         errorMessage: "Password must have at least 6 characters, including at least 1 letter and 1 number",
       });
     }
    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.render("auth/register", {
        layout: "loginregister_layout",
        errorMessage: "Email already exists",
      });
    }
    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new UserModel({
      username,
      email,
      password: hashedPassword,
      role: "user",
    });
    await newUser.save();

    res.redirect("/auth/login");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/login", (req, res) => {
  res.render("auth/login", { layout: "loginregister_layout" });
});

router.post("/login", async (req, res) => {
  try {
    var userLogin = req.body;
    var user = await UserModel.findOne({ email: userLogin.email });

    if (!user || !user.isEnable) {
      req.session.errorMessage =
        "The account name or password is incorrect or the account has not been activated.";
      return res.redirect("/auth/login");
    }

    var hash = bcrypt.compareSync(userLogin.password, user.password);
    if (hash) {
      req.session.userId = user._id;
      req.session.username = user.username;
      req.session.email = user.email;
      req.session.role = user.role;
      if (user.role === "admin") {
        res.redirect("/auth/dashboard");
      } else {
        res.redirect("/");
      }
    } else {
      req.session.errorMessage = "Account email or password is incorrect.";
      res.redirect("/auth/login");
    }
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

router.get("/forgot-password", (req, res) => {
  res.render("auth/forgot-password", { layout: "loginregister_layout" });
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "dvcinema87@gmail.com",
    pass: "jckw ypip nwih pdek",
  },
});
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.redirect("/auth/forgot-password");
    }
    const newPassword = generateRandomPassword();
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedNewPassword;
    await user.save();
    await sendResetEmail(email, newPassword);
    res.redirect("/auth/login");
  } catch (err) {
    res.send(err);
  }
});

async function sendResetEmail(email, newPassword) {
  const mailOptions = {
    from: "dvcinema87@gmail.com",
    to: email,
    subject: "Password Reset",
    text: `The new password is: ${newPassword}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

function generateRandomPassword() {
  // Tạo mật khẩu ngẫu nhiên ở đây, ví dụ:
  return Math.random().toString(36).slice(-8); // Mật khẩu gồm 8 ký tự ngẫu nhiên
}

module.exports = router;
