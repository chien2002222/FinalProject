const mongoose = require('mongoose');

const showSchema = new mongoose.Schema({
    name : {
        type: String,
        required: true
    },
    date : {
        type: Date,
        required: true
    },
    time : {
        type: String,
        required: true
    },
    movie : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'movie',
        required: true
    },
    ticketPrice : {
        type: Number,
        required: true
    },
    totalSeats : {
        type: Number,
        required: true
    },
    bookedSeats : {
        type: Array,
        default: []
    },
    theatre : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'theatre',
        required: true
    },
} , { timestamps: true });

const Show = mongoose.model('shows', showSchema);

module.exports = Show;