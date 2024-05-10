const express = require("express");
const router = express.Router();
const Booking = require("../models/BookingModel"); // Import model
const Show = require("../models/ShowModel"); // Import model
const {
  checkMultipleSession,
  checkSingleSession,
} = require("../middlewares/auth");
const Movie = require("../models/MovieModel");
const paypal = require("paypal-rest-sdk");
const QRCode = require("qrcode");
const nodemailer = require("nodemailer");
const fs = require("fs");

// Function để gửi email chứa ảnh mã QR dưới dạng tệp đính kèm
async function sendQRCodeEmail(userEmail, { url, fileName }) {
  try {
    // Tạo một transporter để gửi email
    let transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "dvcinema87@gmail.com", 
        pass: "jckw ypip nwih pdek", 
      },
    });

    // Tạo email
    let info = await transporter.sendMail({
      from: "dvcinema87@gmail.com",
      to: userEmail, 
      subject: "Your Booking QR Code", 
      html: "<p>Thank you for your booking!</p>", // Nội dung email
      attachments: [
        {
          filename: fileName, // Tên của tệp đính kèm
          content: url.split(",")[1], // Dữ liệu của tệp đính kèm (loại bỏ phần header base64)
          encoding: "base64", // Phương pháp mã hóa dữ liệu
        },
      ],
    });

    console.log("Email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

paypal.configure({
  mode: "sandbox", //sandbox or live
  client_id:
    "AS6wP87P64mC00UQU1YUEeNJqpWHnf832rqD_lFWH-dX2e7WSG_PUz9OwwuAFx8VOiLCKN6grlHusDsg",
  client_secret:
    "EFfCVcfcNYlvBLDU3cufBbl-4rkXQ8Ydl5MCzxnrnSjjk4zeArVuozPADMj0E0pUwCF6m6VthIlLbL-Z",
});

async function checkSeatsAvailability(showId, selectedSeats) {
  try {
    const show = await Show.findById(showId);
    const bookedSeats = show.bookedSeats;

    // Kiểm tra từng ghế đã chọn xem có trong bookedSeats không
    const unavailableSeats = selectedSeats.filter((seat) =>
      bookedSeats.includes(seat)
    );
    return unavailableSeats.length === 0; // Trả về true nếu tất cả các ghế đều khả dụng, ngược lại trả về false
  } catch (error) {
    throw new Error(`Error checking seat availability: ${error.message}`);
  }
}
//  trang xác nhận đặt vé
router.get(
  "/book-show/:showId",
  checkMultipleSession(["user", "admin"]),
  async (req, res) => {
    try {
      const show = await Show.findById(req.params.showId);
      res.render("book/bookingConfirmation", { booking: { show: show } }); 
    } catch (error) {
      res.render("error", { message: error.message });
    }
  }
);

// xác nhận đặt vé và chuẩn bị thanh toán PayPal
router.post(
  "/book-show/:showId",
  checkMultipleSession(["user", "admin"]),
  async (req, res) => {
    try {
      const showId = req.params.showId;
      const selectedSeats = req.body.seats;
      const userId = req.session.userId;

      const show = await Show.findById(showId);

      // Kiểm tra trạng thái của các ghế đã chọn
      const bookedSeats = show.bookedSeats;
      const alreadyBookedSeats = selectedSeats.filter((seat) =>
        bookedSeats.includes(seat)
      );
      if (alreadyBookedSeats.length > 0) {
        return res.status(400).json({
          message: `Seats ${alreadyBookedSeats.join(", ")} are already booked.`,
        });
      }

      // Tính toán tổng giá vé
      const totalPrice = selectedSeats.length * show.ticketPrice;

      req.session.bookingInfo = {
        showId,
        selectedSeats,
        userId,
        totalPrice,
      };

      res.status(200).json({
        message: "Booking confirmed.",
        bookingInfo: req.session.bookingInfo,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Endpoint để xử lý yêu cầu thanh toán PayPal
router.post(
  "/pay",
  checkMultipleSession(["user", "admin"]),
  async (req, res) => {
    try {
      const create_payment_json = {
        intent: "sale",
        payer: {
          payment_method: "paypal",
        },
        redirect_urls: {
          return_url: "http://localhost:8000/booking/success", // URL để xử lý thanh toán thành công
          cancel_url: "http://localhost:8000/booking/cancel", // URL để xử lý hủy thanh toán
        },
        transactions: [
          {
            item_list: {
              items: [
                {
                  name: "Ticket",
                  sku: "001",
                  price: req.session.bookingInfo.totalPrice.toString(), // Giá vé, lấy từ thông tin đặt vé trong session
                  currency: "USD",
                  quantity: 1,
                },
              ],
            },
            amount: {
              currency: "USD",
              total: req.session.bookingInfo.totalPrice.toString(), // Tổng giá vé, lấy từ thông tin đặt vé trong session
            },
            description: "Booking ticket", // Mô tả thanh toán
          },
        ],
      };

      // Tạo thanh toán PayPal
      paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
          res.status(500).json({ message: error.message });
        } else {
          for (let i = 0; i < payment.links.length; i++) {
            if (payment.links[i].rel === "approval_url") {
              res.json({ approval_url: payment.links[i].href }); // Trả về URL phê duyệt của PayPal để người dùng chuyển tiếp
              break;
            }
          }
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.get("/success", async (req, res) => {
  try {
    // Lấy thông tin đặt vé từ session
    const bookingInfo = req.session.bookingInfo;
    if (!bookingInfo) {
      return res
        .status(400)
        .json({ message: "Booking information not found." });
    }
    // Kiểm tra sự khả dụng của các ghế đã chọn trong cơ sở dữ liệu
    const seatsAvailable = await checkSeatsAvailability(
      bookingInfo.showId,
      bookingInfo.selectedSeats
    );
    if (!seatsAvailable) {
      // Nếu có ghế trùng, trả về thông báo lỗi và chuyển hướng người dùng về trang booking
      return res.render("book/error", {
        message: "Some selected seats are already booked.",
      });
    }
    const userEmail = req.session.email;
    // Lấy thông tin từ query string
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    // Thực hiện execute payment
    const execute_payment_json = {
      payer_id: payerId,
      transactions: [
        {
          amount: {
            currency: "USD",
            total: bookingInfo.totalPrice.toString(), // Sử dụng tổng giá vé từ thông tin đặt vé trong session
          },
        },
      ],
    };

    // Thực hiện execute payment của PayPal
    paypal.payment.execute(
      paymentId,
      execute_payment_json,
      async function (error, payment) {
        if (error) {
          console.error(error.response);
          throw error;
        } else {
          console.log(JSON.stringify(payment));

          const showDetails = await getShowDetails(bookingInfo.showId);
          // Lưu thông tin đặt vé vào cơ sở dữ liệu
          const { showId, selectedSeats, userId, totalPrice } = bookingInfo;
          const show = await Show.findById(showId);
          for (let i = 0; i < selectedSeats.length; i++) {
            show.bookedSeats.push(selectedSeats[i]);
          }
          await show.save();

          const booking = new Booking({
            show: showId,
            seats: selectedSeats,
            user: userId,
            totalPrice: totalPrice,
          });
          await booking.save();
          // Tạo mã QR cho thông tin đặt vé
          QRCode.toDataURL(
            JSON.stringify(bookingInfo),
            async function (err, url) {
              if (err) {
                console.error("Error generating QR code:", err);
                throw err;
              } else {
                // Tạo tên ngắn cho tệp mã QR
                const qrCodeFileName = "QRCode.png";
                // Gửi email chứa mã QR với tên tệp ngắn
                await sendQRCodeEmail(userEmail, {
                  url,
                  fileName: qrCodeFileName,
                });
                console.log("Email sent with QR code.");

                // Xóa thông tin đặt vé khỏi session
                delete req.session.bookingInfo;
                // Render trang 'success' với URL của mã QR
                res.render("book/success", {
                  qrCodeUrl: url,
                  layout: "loginregister_layout",
                });
              }
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Error executing payment:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/cancel", (req, res) => res.send("Cancelled (Đơn hàng đã hủy)"));

//get show detail
async function getShowDetails(showId) {
  try {
    const show = await Show.findById(showId).populate("movie theatre");
    return show;
  } catch (error) {
    throw new Error(`Error fetching show details: ${error.message}`);
  }
}

// getAllBookingsByUser function
const getAllBookingsByUser = async (userId) => {
  try {
    const bookings = await Booking.find({ user: userId }).populate({
      path: "show",
      populate: {
        path: "movie theatre",
        select: "name",
      },
    });
    const bookingsWithQR = await Promise.all(
      bookings.map(async (booking) => {
        const bookingDetails = {
          showId: booking.show._id,
          seats: booking.seats,
          totalPrice: booking.totalPrice,
          movie: booking.show.movie.name,
          theatre: booking.show.theatre.name,
        };

        // Tạo đối tượng JSON chứa thông tin đặt vé, phim và rạp chiếu
        const bookingDetailsStr = JSON.stringify(bookingDetails);

        // Tạo mã QR cho chuỗi JSON
        const qrCodeUrl = await new Promise((resolve, reject) => {
          QRCode.toDataURL(bookingDetailsStr, (err, url) => {
            if (err) {
              console.error("Error generating QR code:", err);
              reject(err);
            } else {
              resolve(url);
            }
          });
        });

        return {
          ...booking._doc,
          qrCodeUrl: qrCodeUrl,
        };
      })
    );

    return bookingsWithQR;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Endpoint để lấy toàn bộ booking của user và render template
router.get(
  "/bookings",
  checkMultipleSession(["user", "admin"]),
  async (req, res) => {
    try {
      // Lấy userId từ session
      const userId = req.session.userId;

      // Gọi hàm lấy toàn bộ booking của user
      let bookings = await getAllBookingsByUser(userId);
      // Sắp xếp bookings theo thời gian đặt vé giảm dần
      bookings = bookings.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      // Render template với dữ liệu booking
      res.render("book/getAllByUser", { bookings });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

module.exports = router;
