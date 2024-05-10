const mongoose = require('mongoose')
var MovieSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    director: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    actors: {
        type: String,
        required: true,
    },
    releaseDate: {
        type: String,
        required: true,
    },
    duration: {
      type: String,
      required: true,
    },
    trailerURL: {
        type: String,
        required: true,
    },
    language: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'category' }] // Reference
  },
  { timestamps: true }
);
//Note: tham số cuối cùng bắt buộc phải là tên của collection (table) trong DB
var MovieModel = mongoose.model('movie', MovieSchema, 'movie')
module.exports = MovieModel