var express = require('express');
var router = express.Router();
const MovieModel = require('../models/MovieModel');


/* GET home page. */
// sort({ releaseDate: -1 }).
router.get('/', async (req, res) => {
      // Lấy danh sách 3 phim mới nhất từ cơ sở dữ liệu
      const isLoggedIn = req.session.userId && req.session.username;
      const movieList = await MovieModel.find().sort({ releaseDate: -1 }).limit(4);
      const layout = isLoggedIn ? 'layout' : 'layout1';
    res.render('index', { movieList, layout });
 })

 router.get('/contact', async (req, res) => {
 
  const isLoggedIn = req.session.userId && req.session.username;
  const layout = isLoggedIn ? 'layout' : 'layout1';
  res.render('contact', { layout});
})

router.get('/admin', async (req, res) => {
  var movieList = await MovieModel.find({});
  res.render('admin', { movieList, layout : 'admin' });
})


module.exports = router;
