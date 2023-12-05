var express = require('express');
var router = express.Router();
var userModel=require("./users");
var postModel= require("./post")
const passport = require('passport');
const localStrategy= require("passport-local");
const upload= require("./multer")
const profilepic =require("./multerfordp");

passport.use(new localStrategy(userModel.authenticate()));
// passport.authenticate(new localStrategy(userModel.authenticate()));


/* GET home page. */
router.get('/',ensureAuthenticated, function(req, res, next) {
 var error=req.flash('error')
//  console.log(error)
  res.render('index', {error});
});
router.get('/register',ensureAuthenticated,  function(req, res, next) {
  res.render('register', );
});

router.post('/login',
  passport.authenticate('local', {
     successRedirect: '/home', 
     failureRedirect: '/' ,
     failureFlash:true
    })
);
router.get('/logout', (req, res) => {
  req.logout(function(err){
    if(err) {
      return next(err);
    }
    res.redirect('/');
  });
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

function ensureAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) {
    // If the user is authenticated, proceed to the next middleware or route handler
    return next();
  } else {
    // If the user is not authenticated, redirect to the login page
    res.redirect('/home');
  }
}




router.get('/editprofile', isLoggedIn, async function(req, res, next) {
  const user= await userModel.findOne({username:req.session.passport.user})
  res.render('editprofile', {user});
});
router.post('/editprofile', isLoggedIn, async (req, res) => {
  const { fullname, username } = req.body;

  try {
    // Find the user by ID (you need to ensure you have user authentication and obtain the user ID)
    const userId = req.user.id; // Assuming you have stored user information in req.user after authentication
    const user = await userModel.findById(userId);

    // Update user information
    user.fullname = fullname;
    user.username = username;
    
    // Save the updated user
    await user.save();
    // Redirect back to the login page with a success message
    req.login(user, (err) => {
      if (err) {
        console.error(err);
        return res.render('error');
      }
      return res.redirect('/profile'); // Redirect to the user's profile page after updating
    });
  } catch (error) {
    console.error(error);
    res.render('error');
  }
});
// Define the route
router.get('/viewpost/:postId', isLoggedIn, async (req, res) => {

  try {
    const user = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
    // console.log(user)
    const postId = req.params.postId;
    const post = await postModel.findById(postId);
    // console.log(user)
    console.log(post)
    const postuser= await userModel.findById(post.user._id);
    // console.log(postuser)
    if (!post) {
      return res.status(404).render('not-found'); // Handle not found scenario
    }

    res.render('viewpost',{post,user,postuser});
  } catch (error) {
    console.error(error);
    res.render('error');
  }
});
router.get('/home', isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
    const loggedInUserId = req.user?.id || null;
    const posts = await postModel.find({ user: { $ne: loggedInUserId } }).populate('user');

    res.render('home', { user, posts });
  } catch (error) {
    console.error(error);
    res.render('error');
  }
});
router.get('/profile',isLoggedIn,async function(req, res, next) {
  const user= await userModel.findOne({username:req.session.passport.user}).populate("posts")
  // console.log(user)
  res.render('profile',{user});
});

router.post('/upload',isLoggedIn, upload.single('file'), async function (req, res, next) {
if(!req.file){
  return res.status(404).send("no file were given")
}
const user= await userModel.findOne({username:req.session.passport.user});
const postData= await postModel.create({
  title:req.body.title,
  caption: req.body.caption,
  image:req.file.filename,
  user:user._id,
});

  user.posts.push(postData._id);
  await user.save()
  console.log("uploding done")
  res.redirect("/profile");
});

router.post('/uploadprofile', isLoggedIn,  profilepic.single('file'), async (req, res) => {
  console.log(req.file)
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });
    if (!user) {
      return res.status(404).send('User not found.');
    }
    if (!req.file) {
      // No file was uploaded
      return res.status(400).send('No file uploaded.');
    }
    // Update the user's picture field with the filename
    user.dp = req.file.filename;
    // Save the updated user model
    await user.save();
    // Redirect to the profile page on success
    res.redirect('/profile');
  } catch (error) {
    console.error(error);

  }
});

router.post("/register", (req, res, next) => {
  const { username, fullname, email } = req.body;
  const newUser = new userModel({ username, fullname, email });

  // Assuming you're using passport-local-mongoose for user registration
  userModel.register(newUser, req.body.password).then(function(){
    passport.authenticate("local")(req, res, function () {
      res.redirect("/home");
    });
  }).catch((err) => {
    // Handle registration errors
    console.error(err);
    res.redirect("/register"); // Redirect to registration page on error
  });
});




module.exports = router;
