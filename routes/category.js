var express = require('express');
const CategoryModel = require('../models/CategoryModel') ;
const MovieModel = require('../models/MovieModel');
var router = express.Router();

/* GET home page. */
router.get('/',async (req, res) => {

    var categoryList = await CategoryModel.find({});
    res.render('category/index', {categoryList, layout: 'admin'});
})
router.get('/delete/:id', async (req, res) =>
{
    await CategoryModel.findByIdAndDelete(req.params.id);
    res.redirect("/category");
})
//Add
router.get('/add', async(req, res) => {
   try {
      const movies = await MovieModel.find({}); // Truy vấn tất cả các phim từ cơ sở dữ liệu
      res.render('category/add', { movies, layout: 'admin' }); // Truyền danh sách phim và rạp chiếu vào template
   } catch (err) {
      res.send(err);
   }
 })
 
 //SQL: INSERT INTO category VALUES (..)
 router.post('/add', async (req, res) => {
    //get value by form : req.body
    var category = req.body;
    await CategoryModel.create(category);
    res.redirect('/category');
 })
 
 router.get('/edit/:id', async (req, res) => {
   var id = req.params.id;
   var category = await CategoryModel.findById(id);
   res.render('category/edit', { category, layout: "admin" });
})

router.post('/edit/:id', async (req, res) => {
   var id = req.params.id;
   var data = req.body;
   await CategoryModel.findByIdAndUpdate(id, data);
   res.redirect('/category');
})
 
router.delete('delete/:id', async(req,res)=>{
   var id = req.params.id;
   await CategoryModel.findByIdAndDelete(id);
   res.redirect('category');
})

module.exports = router;