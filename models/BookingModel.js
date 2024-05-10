const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        show: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "shows",
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
        },
        seats: {
            type: Array,
            required: true,
        },
        totalPrice : {
            type: Number,
            required: true
        },
    },
    { timestamps: true }
);

const Booking = mongoose.model('booking', bookingSchema);

module.exports = Booking;
