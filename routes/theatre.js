var express = require('express');
const TheatreModel = require('../models/TheatreModel')
const Show = require("../models/ShowModel");
const MovieModel = require('../models/MovieModel');
var router = express.Router();
const { checkMultipleSession, checkSingleSession} = require('../middlewares/auth');

router.get('/',checkSingleSession, async (req, res) => {
   var theatreList = await TheatreModel.find({});
   res.render('theatre/index', { theatreList, layout: 'admin' });
})

router.get('/add',checkSingleSession, (req, res) => {
   res.render('theatre/add', { layout: 'admin' })
})

router.post('/add',checkSingleSession, async (req, res) => {
   try {
      const { name, address, phone, email } = req.body;
      const newTheatre = new TheatreModel({
         name,
         address,
         phone,
         email
      });
      await newTheatre.save();
      res.redirect('/theatre');
   } catch (err) {
      res.send(err);
   }
})

router.get('/delete/:id',checkSingleSession, async (req, res) => {
   await TheatreModel.findByIdAndDelete(req.params.id);
   res.redirect("/theatre");
});

router.get('/edit/:id',checkSingleSession, async (req, res) => {
   var theatre = await TheatreModel.findById(req.params.id);
   res.render('theatre/edit', { theatre, layout: 'admin' });

});

router.post('/edit/:id',checkSingleSession, async (req, res) => {
   try {
      const { name, address, phone, email } = req.body;
      await TheatreModel.findByIdAndUpdate(req.params.id, {
         name,
         address,
         phone,
         email
      });
      res.redirect('/theatre');
   } catch (err) {
      res.send(err);
   }
}
);
router.get('/add-show',checkSingleSession, async (req, res) => {
   try {
      const movies = await MovieModel.find({}); // Truy vấn tất cả các phim từ cơ sở dữ liệu
      const theatres = await TheatreModel.find({}); // Truy vấn tất cả các rạp chiếu từ cơ sở dữ liệu
      res.render('theatre/add-show', { movies, theatres, layout: 'admin' }); // Truyền danh sách phim và rạp chiếu vào template
   } catch (err) {
      res.send(err);
   }
});

router.post('/add-show', checkSingleSession, async (req, res) => {
   try {
      // Kiểm tra và xác thực dữ liệu đầu vào trước khi lưu vào cơ sở dữ liệu
      if (!req.body.movie || !req.body.theatre || !req.body.time || !req.body.date || !req.body.name) {
         return res.status(400).send('Missing required fields');
      }

      // Kiểm tra xem đã tồn tại show với cùng theatre, show name, date và time chưa
      const existingShow = await Show.findOne({
         theatre: req.body.theatre,
         name: req.body.name,
         date: req.body.date,
         time: req.body.time
      });

      if (existingShow) {
         req.session.errorMessage =
         "Movies are available at this showtime";
       return res.redirect("/theatre/add-show");
      }

      const newShow = new Show(req.body);
      await newShow.save();
      res.redirect('/theatre/add-show?success=true');
   } catch (err) {
      console.error(err);
      res.status(500).send('Error adding show');
   }
});

router.get('/get-all-shows',checkSingleSession, async (req, res) => {
   try {
      const shows = await Show.find({}).populate("theatre").populate("movie");
      res.render('theatre/shows', { shows, layout: 'admin' }); // Render view và truyền dữ liệu shows vào view
   } catch (err) {
      res.send(err);
   }
});
router.get('/deleteShow/:id',checkSingleSession, async (req, res) => {
   await Show.findByIdAndDelete(req.params.id);
   res.redirect("/theatre/get-all-shows");
})



module.exports = router;