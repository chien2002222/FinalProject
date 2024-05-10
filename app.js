var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const { formatDate } = require('./routes/untils');
const hbs = require('hbs');
hbs.registerHelper('formatDate', formatDate);

var indexRouter = require('./routes/index');
var categoryRouter = require('./routes/category');
var movieRouter = require('./routes/movie');
var authRouter = require('./routes/auth');
var theatreRouter = require('./routes/theatre');
var bookingRouter = require('./routes/booking');

var app = express();

//import "express-session" library for authentication
var session = require('express-session');
//Set session timeout
const timeout = 1000* 60 * 60 * 24;
//config session middleware
app.use(session({
  secret: "alien_is_existed_or_not",
  saveUninitialized:false,
  cookie :{maxAge : timeout},
  resave:false
})); 

//config mongo
var mongoose = require('mongoose')
const database = "mongodb+srv://doanvanchien06022002:chien2002@cinema.hgcs4ay.mongodb.net/";
// connect mongodb
mongoose.connect(database)
.then(()=> console.log('Connected to database'))
.catch(err => console.log('Error' +err));

var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//make session value available in view
//IMPORTANT: put this before setting router url
app.use((req, res, next) => {
  res.locals.username = req.session.username;
  res.locals.errorMessage = req.session.errorMessage;
  next();
});

// const { checkLoginSession } = require('./middlewares/auth');
// app.use('/movie', checkLoginSession);

app.use('/', indexRouter);
app.use('/movie', movieRouter);
app.use('/auth', authRouter);
app.use('/theatre', theatreRouter);
app.use('/booking', bookingRouter);
app.use('/category', categoryRouter);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
