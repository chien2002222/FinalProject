const mongoose = require('mongoose')
var theatreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

//Note: tham số cuối cùng bắt buộc phải là tên của collection (table) trong DB
var TheatreModel = mongoose.model('theatre', theatreSchema, 'theatre')
module.exports = TheatreModel