var express = require("express");
const mongoose = require("mongoose");
const MovieModel = require("../models/MovieModel");
const CategoryModel = require("../models/CategoryModel");
const Show = require("../models/ShowModel");
var router = express.Router();
const {
  checkMultipleSession,
  checkSingleSession,
} = require("../middlewares/auth");

// Hàm để lấy ngày hiện tại
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  let month = now.getMonth() + 1;
  let day = now.getDate();

  // Đảm bảo định dạng mm/dd/yyyy
  if (month < 10) {
    month = "0" + month;
  }
  if (day < 10) {
    day = "0" + day;
  }

  return `${year}-${month}-${day}`;
}

/* GET home page. */
router.get("/", checkSingleSession, async (req, res) => {
  var movieList = await MovieModel.find({}).populate("categories").sort({releaseDate: -1});
  res.render("movie/index", { movieList, layout: "admin" });
});

// Route để hiển thị danh sách phim
router.get("/list", async (req, res) => {
   try {
     const isLoggedIn = req.session.userId && req.session.username;

     const categoryList = await CategoryModel.find();
 
     // Lấy danh sách phim
     const movieList = await MovieModel.find().populate("categories").sort({ releaseDate: -1 });
 
     // Chọn layout dựa trên trạng thái đăng nhập
     const layout = isLoggedIn ? "layout" : "layout1";
 
     res.render("movie/list_movie", { categoryList, movieList, layout });
   } catch (error) {
     console.error("Error fetching movie list:", error);
     res.status(500).render("error", { message: "Internal Server Error" });
   }
 });
 
 // Route để tìm kiếm phim theo category
 router.post("/search-by-category", async (req, res) => {
   try {
     // Lấy category được chọn từ request body
     const selectedCategory = req.body.category;
 
     // Tìm kiếm phim dựa trên category được chọn
     const movieList = await MovieModel.find({
       categories: selectedCategory,
     }).populate("categories");
 
     // Lấy danh sách các category
     const categoryList = await CategoryModel.find();
 
     // Chọn layout dựa trên trạng thái đăng nhập
     const layout = req.session.userId && req.session.username ? "layout" : "layout1";
 
     res.render("movie/list_movie", {
       categoryList,
       movieList,
       selectedCategory,
       layout,
     });
   } catch (error) {
     console.error("Error searching movies by category:", error);
     res.status(500).render("error", { message: "Internal Server Error" });
   }
 });
 

// View movie details
router.get(
  "/detail/:id",
  async (req, res) => {
    try {
      const movieId = req.params.id;
      const isLoggedIn = req.session.userId && req.session.username
      const movie = await MovieModel.findById(movieId).populate("categories");
      const layout = isLoggedIn ? "layout" : "layout1";
      res.render("movie/detail", { layout, movie, currentDate: getCurrentDate() });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Route API để lấy giờ chiếu dựa trên ngày đã chọn
router.get(
  "/api/showtimes",
  checkMultipleSession(["user", "admin"]),
  async (req, res) => {
    try {
      const movieId = req.query.movieId;
      const selectedDate = req.query.date;
      // Lấy thông tin về các suất chiếu của bộ phim, được lọc theo ngày đã chọn
      const shows = await Show.find({
        movie: movieId,
        date: {
          $gte: selectedDate,
          $lt: new Date(new Date(selectedDate).getTime() + 24 * 60 * 60 * 1000),
        },
      }).populate("theatre");

      res.json(shows);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// edit
router.get("/delete/:id", checkSingleSession, async (req, res) => {
  await MovieModel.findByIdAndDelete(req.params.id);
  res.redirect("/movie");
});
// Route để hiển thị form thêm mới phim
router.get("/add", async (req, res) => {
  try {
    const categories = await CategoryModel.find();
    res.render("movie/add", { categories, layout: "admin" });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).render("error", { message: "Internal Server Error" });
  }
});

// Route để xử lý thêm một bộ phim mới
router.post("/add", async (req, res) => {
  try {
    // Lấy dữ liệu từ request body
    const {
      name,
      director,
      description,
      actors,
      releaseDate,
      duration,
      trailerURL,
      language,
      image,
      categories,
    } = req.body;

    // Tạo một bộ phim mới và lưu vào cơ sở dữ liệu
    const movie = await MovieModel.create({
      name,
      director,
      description,
      actors,
      releaseDate,
      duration,
      trailerURL,
      language,
      image,
      categories,
    });
    res.redirect("/movie");
  } catch (error) {
    console.error("Error adding movie:", error);
    res.status(500).render("error", { message: "Internal Server Error" }); // Render view error.hbs
  }
});

router.get("/edit/:id", checkSingleSession, async (req, res) => {
  var id = req.params.id;
  var category = await CategoryModel.find();
  var movie = await MovieModel.findById(id);
  res.render("movie/edit", { movie, category, layout: "admin" });
});

router.post("/edit/:id", checkSingleSession, async (req, res) => {
  var id = req.params.id;
  var data = req.body;
  await MovieModel.findByIdAndUpdate(id, data);
  res.redirect("/movie");
});

router.post("/search", checkSingleSession, async (req, res) => {
  var kw = req.body.keyword;
  var movieList = await MovieModel.find({ name: new RegExp(kw, "i") });
  res.render("movie/index", { movieList, layout: "admin" });
});



module.exports = router;
