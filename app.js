const express = require('express');
const expressHandlebars = require('express-handlebars');
const bodyParser = require('body-parser');

const bcrypt = require('bcryptjs');

var sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/database.db')
//const salt = bcrypt.genSaltSync(10);
const salt = "$2a$10$jUzKmW3tJj/LHWMbLmDrNe"
const port = 8080
const app = express();

app.use(bodyParser.urlencoded({extended: false}))
app.use(express.static('public'));

var session = require('express-session');
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge: 60000 }
}))

db.serialize(function() {
  console.log('Creation table users if not exist...')
  db.run(`CREATE TABLE IF NOT EXISTS "users" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "first_name" text NOT NULL,
    "last_name" text NOT NULL,
    "user_name" text NOT NULL UNIQUE,
    "password" text NOT NULL
  );`);
  console.log('Creation table playlist if not exist...')
  db.run(`CREATE TABLE IF NOT EXISTS "playlist" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "name" text NOT NULL,
    "user_id" INTEGER,
    "public" boolean
  );`);
  console.log('Creation table songs if not exist...')
  db.run(`CREATE TABLE IF NOT EXISTS "songs" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "playlist_id" INTEGER NOT NULL,
    "name" text NOT NULL
  );`);
});
 
app.engine('hbs', expressHandlebars({
  defaultLayout: 'main.hbs',
  layoutsDir: __dirname + '/views/layouts/',
}))

app.get('/', function(req, res) {
  var user =  req.session.user;
  userId = req.session.userId;
  if (userId) {
    res.render('dashboard.hbs', {user: user, profile: user})
    return;
  }
  res.render('home.hbs')
})

app.get('/list/users', function(req, res) {
  var user =  req.session.user;
  userId = req.session.userId;
	
	if(userId == null){
		res.redirect("/");
		return;
  }
  
  var sql="SELECT id, user_name FROM USERS WHERE NOT id='"+userId+"' ORDER BY user_name;";
  db.all(sql, function(err, results){
    if (err) {
      console.log(err)
    }
    console.log(results)
    res.render('user-list.hbs', {user: user, users:results})
  });

})

app.get('/dashboard/:id', function(req, res){
  const id = req.params.id;
  // CHeck if connected
  var user =  req.session.user;
  userId = req.session.userId;
	
	if(userId == null){
		res.redirect("/");
		return;
	}
  var sql="SELECT id, user_name FROM USERS WHERE id='"+id+"';";
  db.all(sql, function(err, results){
    if (err) {
      console.log(err)
      return;
    }
    console.log(results)
    res.render('dashboard.hbs', {user: user, profile: results[0]})
  });
})

app.get('/logout', function(req, res) {
  req.session.destroy(function(err) {
    res.redirect("/")
 })
})

// Login page

app.get('/login/', function(req, res){
  var user =  req.session.user;
  userId = req.session.userId;
	
	if(userId){
		res.redirect("/");
		return;
	}
  res.render("login.hbs")
})

app.post('/login', function(req, res) {
  var message = '';
  var sess = req.session; 

  if(req.method == "POST"){
      var post  = req.body;
      var name= post.user_name;
      var pass= post.password;
      var hash = bcrypt.hashSync(pass, salt);
      console.log(hash)
      var sql="SELECT id, first_name, last_name, user_name, password FROM USERS WHERE user_name='"+name+"' and password='"+hash+"';";
      db.get(sql, function(err, results){ 
        if(results){
          req.session.userId = results.id;
          req.session.user = results;
          console.log(results.id);
          console.log(results)
          res.redirect('/');
        }
        else{
            message = 'Wrong Credentials.';
            console.log(err)
            res.render('login.hbs',{message: message});
        }
                
      });
  } else {
      res.render('login.hbs',{message: message});
  }         
})

app.get('/register/', function(request, response){
  response.render("register.hbs")
})

app.post('/register', function(req, res) {
  message = '';
  if(req.method == "POST"){
      var post  = req.body;
      var name= post.user_name;
      var pass= post.password;
      var fname= post.first_name;
      var lname= post.last_name;

      console.log(post)

      var hash = bcrypt.hashSync(pass, salt);

      var sql = "INSERT INTO `users`(`first_name`,`last_name`,`user_name`, `password`) VALUES ('" + fname + "','" + lname + "','" + name + "','" + hash + "')";

      var query = db.prepare(sql)
      query.run(function(err) {
        if (err) {
          console.log(err)
          message = "Username already taken.";
          res.render('register.hbs',{message: message});
        } else {
          message = "Succesfully! Your account has been created.";
          console.log(post)
          res.render('register.hbs',{message: message});
        }
      })
  } else {
    message = "An error has occured.";
    res.render('register.hbs',{message: message});
  }
})

app.get('/profile', function(req, res){
  var user =  req.session.user;
  userId = req.session.userId;
	
	if(userId == null){
		res.redirect("/");
		return;
	}
  
  var user =  req.session.user;
  res.render('profile.hbs', {user: user})
})

app.post('/profile/update', function(req, res){
  var user =  req.session.user;
  var post  = req.body;
  var encryptedPass = user.password;
  if (post.password)
    encryptedPass = bcrypt.hashSync(post.password, salt);

  var name= post.user_name || user.user_name;
  var fname= post.first_name || user.first_name;
  var lname= post.last_name || user.last_name;
  var sql = "UPDATE USERS SET user_name = '" + name + "', first_name= '" + fname +"', last_name='" + lname + "', password='" + encryptedPass + "' WHERE id = " + req.session.userId + ";";

  var query = db.prepare(sql)
  query.run(function(err) {
    if (err) {
      console.log(err)
      message = "This username is already taken.";
      res.render('profile.hbs',{user: user, message: message});
      return;
    }
    message = "Succesfully! Your account has been updated.";
    var sql="SELECT * FROM USERS WHERE id='"+req.session.userId+"';";
    db.get(sql, function(err, results){
      if (err) {
        console.log(err)
        return;
      }
      req.session.user = results;
      res.render('profile.hbs',{user: results, message: message});
    })
  });
})


app.get('/profile/delete/', function(req, res){
  const userId = req.session.userId;
  if (userId) {
    console.log('Got deleted')
    var sql="DELETE FROM USERS WHERE id='"+userId+"';";
    db.all(sql, function(err, results){
      if (err) {
        console.log(err)
        res.redirect('/logout')
        return;
      }
      console.log(results)
      res.redirect('/logout')
    });
  } else {
    res.redirect('/logout')
  }
})


app.listen(port)
console.log("Listening on port " + port + " ...");