const express = require('express');
const expressHandlebars = require('express-handlebars');
const bodyParser = require('body-parser');
const Handlebars = require("handlebars");
const bcrypt = require('bcryptjs');
var path = require('path')
var jwt = require('jsonwebtoken');

const secret = 'ABCDEFGHIJ'


var sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/database.db')
//const salt = bcrypt.genSaltSync(10);
const salt = "$2a$10$jUzKmW3tJj/LHWMbLmDrNe"
const port = 8080
const api_link = '/api/v1/'
const app = express();

// RDF
var rdfModule = require('./RDF/RDFTripleStore.js');
var createRDF = rdfModule.createTable;
var queryRdf = rdfModule.queryRdf;
var getInfoAboutSong = rdfModule.getInfoAboutSong;

// Creation of SONG_DB Database
createRDF()

// SPARQL
var sparqlModule = require('./sparql/query-sparql.js');
var querySparql = sparqlModule.querySparql;
var getAllInfosAboutArtist = sparqlModule.getAllInfosAboutArtist;


Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

app.use(bodyParser.urlencoded({extended: false}))
app.use(express.static(path.join(__dirname, 'public')));

var session = require('express-session');

app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge: 600000 }
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
    "description" text,
    "user_id" INTEGER,
    "public" boolean
  );`);
  console.log('Creation table songs if not exist...')
  db.run(`CREATE TABLE IF NOT EXISTS "songs" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "playlist_id" INTEGER NOT NULL,
    "name" text NOT NULL,
    "artist" text NOT NULL
  );`);
});
app.use(express.static(path.join(__dirname, 'public')));

app.engine('hbs', expressHandlebars({
  defaultLayout: 'main.hbs',
  layoutsDir: __dirname + '/views/layouts/',
}))

let checkConnection = (req, res, next) => {
  userId = req.session.userId;
	if(userId == null){
		res.redirect("/");
		return;
  }
  next()
};

app.get('/rdf/test', function(req, res) {
  const rdf = queryRdf()
  rdf.then((list) => {
    res.render('rdf-list.hbs', {rdf: list})
  }).catch((err) => {
    res.render('rdf-list.hbs', {err: err})
  })
})

app.get('/sparql/test', function(req, res) {
  const sparql = querySparql()
  sparql.then((list) => {
    res.render('sparql-list.hbs', {list: list})
  }).catch((err) => {
    res.render('sparql-list.hbs', {err: err})
  })

})

app.get('/', function(req, res) {
  var user =  req.session.user;
  userId = req.session.userId;
  console.log(userId)
  if (userId) {
    var sql="SELECT * FROM PLAYLIST WHERE user_id='"+userId+"' ORDER BY name;";
    db.all(sql, function(err, playlist){
      if (err) {
        console.log(err)
        return;
      }
      res.render('dashboard.hbs', {user: user, profile: user, indexPage: true, playlist: playlist})
    });
  } else {
    res.render('home.hbs')
  }
})

app.post('/', function (req, res) {
  message = 'Thank you, we get back to you shortly.';
  res.render("home.hbs", {message: message});
})

app.get('/about', function(req, res) {
  userId = req.session.userId;
	if(userId == null){
		res.redirect("/");
		return;
  }
  res.render('about.hbs')
})

app.get('/contact', function(req, res) {
  userId = req.session.userId;
	if(userId == null){
		res.redirect("/");
		return;
  }
  res.render('contact.hbs')
})

app.post('/contact', function (req, res) {
  message = 'Thank you, we get back to you shortly.';
  userId = req.session.userId;
	if(userId == null){
		res.render("home.hbs", {message: message});
		return;
  }
  res.render('contact.hbs', {message: message})
})

app.get('/list/users', checkConnection, function(req, res) {
  var user =  req.session.user;
  userId = req.session.userId;
  var sql="SELECT id, user_name FROM USERS WHERE NOT id='"+userId+"' ORDER BY user_name;";
  db.all(sql, function(err, results){
    if (err) {
      console.log(err)
      return;
    }
    console.log(results)
    res.render('user-list.hbs', {user: user, users:results})
  });

})

app.get('/dashboard/:id', checkConnection, function(req, res){
  const id = req.params.id;
  // CHeck if connected
  var user =  req.session.user;

  var sql="SELECT id, user_name FROM USERS WHERE id='"+id+"';";
  db.all(sql, function(err, results){
    if (err) {
      console.log(err)
      return;
    }
    sql="SELECT * FROM PLAYLIST WHERE user_id='"+id+"' AND public='true' ORDER BY name;";
    db.all(sql, function(err, playlist){
      if (err) {
        console.log(err)
        return;
      }
      console.log(playlist)
      res.render('dashboard.hbs', {user: user, profile: results[0], playlist: playlist})
    });
  });
})

app.get('/playlist/:id', checkConnection, function(req, res) {
  userId = req.session.userId;
  // // If not connected
  
  var user =  req.session.user;
  const playlistId = req.params.id;
  // indexPage is if the playlist is current user
  var indexPage = false
  var sql="SELECT * FROM PLAYLIST WHERE id='"+playlistId+"';";
  db.all(sql, function(err, playlists){
    if (err) {
      console.log(err)
      return;
    }
    const playlist = playlists[0]
    // Check if the playlist is owned by the current user
    if (playlist.user_id == userId) {
      indexPage = true
    }
    // Check that the playlist is not public, only userId can access
    if (playlist.public == "false" && playlist.user_id != userId) {
      res.redirect('/')
      return;
    }
    var sql="SELECT * FROM SONGS WHERE playlist_id='"+playlistId+"';";
    db.all(sql, function(err, songs){
      if (err) {
        console.log(err)
        return;
      }
      console.log(songs)
      res.render('playlist-songs.hbs', {user: user, playlist: playlist, songs: songs, indexPage: indexPage})
      return;
    })
  })
})

app.post('/song/add', checkConnection, (req, res) => {
  var playlist_id =  req.query.playlist_id
  var post  = req.body;
  var song_name= post.song_name;
  var artist = post.artist
  console.log(song_name)
  if (song_name == '') {
    res.redirect('/playlist/'+playlist_id)
    return;
  }
  if (artist == '') {
    res.redirect('/playlist/'+playlist_id)
    return;
  }
  var sql = "INSERT INTO `SONGS` (`name`,`playlist_id`, `artist`) VALUES ('" + song_name + "', '" + playlist_id + "', '" + artist + "')";
  var query = db.prepare(sql)
  query.run(function(err) {
    if (err) {
      console.log(err)
      return;
    } else {
      console.log(post)
      res.redirect('/playlist/'+playlist_id)
    }
  })
})

app.post('/song/update/:id', checkConnection, (req, res) => {
  var song_id = req.params.id
  var sql="SELECT * FROM SONGS WHERE id='"+song_id+"';";
  db.all(sql, function(err, songs){
    if (err) {
      console.log(err)
      return;
    }
    var song = songs[0]
    var post  = req.body;
    var song_name= post.song_name || song.song_name;
    var artist= post.artist || song.artist;
    var sql = "UPDATE SONGS SET name='" + song_name + "', artist='" + artist + "' WHERE id=" + song_id + ";";
    console.log(sql)
    var query = db.prepare(sql)
    query.run(function(err) {
      if (err) {
        console.log(err)
        return;
      } else {
        res.redirect('back');
      }
    })
    //res.redirect('/playlist/'+playlist_id)
  })
})
app.get('/playlist/song/:id', checkConnection, (req, res) => {
  var id = req.params.id
  var sql="SELECT * FROM SONGS WHERE id='"+id+"';";
    db.all(sql, function(err, songs){
      if (err) {
        console.log(err)
        return;
      }
      songs = songs[0]
      console.log(songs)
      getInfoAboutSong(songs.name, songs.artist).then((result) => {
        console.log(result[0])
        getAllInfosAboutArtist(songs.artist).then((resultsArtist) => {
          console.log(resultsArtist[0])
          res.render('song-detail.hbs', {infos: result[0], resultsArtist: resultsArtist[0], songName: songs.name, artist: songs.artist})
        }).catch((err) => {
          res.render('song-detail.hbs', {err: err})
        })
      }).catch((err) => {
        console.log(err)
        res.render('song-detail.hbs', {err: err})
      })
    })
})

app.get('/song/delete/:id', checkConnection, (req, res) => {
  console.log('Song deleted')
  var song_id = req.params.id
  userId = req.session.userId;
  console.log(song_id)
  // Security: check that the playlist_id => user_id is current userId
  var sql="SELECT * FROM SONGS WHERE id='"+song_id+"';";
  db.all(sql, function(err, songs){
    if (err) {
      console.log(err)
      return;
    }
    var song = songs[0]
    if (!song) {
      res.redirect('back')
      return
    }
    var playlist_id = song.playlist_id
    var sql="SELECT * FROM PLAYLIST WHERE id='"+playlist_id+"';";
    db.all(sql, function(err, playlists){
      if (err) {
        console.log(err)
        return;
      }
      var playlist = playlists[0]
      // Check if user_id of playlist == currentId
      if (playlist.user_id == userId) {
        // Here we can proceed the delete
        var sql="DELETE FROM SONGS WHERE id="+song_id;
        db.all(sql, function(err, results){
          if (err) {
            console.log(err)
            return
          }
          console.log('Song got deleted')
          res.redirect('back')
        })
      } else {
        res.redirect('/')
      }
    })
  })
})

app.post('/playlist/add', checkConnection, function(req, res) {
  userId = req.session.userId;
  if(req.method == "POST"){
    var post  = req.body;
    var name= post.playlist_name;
    var description = post.description || ''
    var public= post.public;
    if (!public)
      public = false
    else
      public = true
    var sql = "INSERT INTO `PLAYLIST` (`name`,`user_id`,`public`, `description`) VALUES ('" + name + "', '" + userId + "', '" + public + "', '" + description + "')";
    var query = db.prepare(sql)
    query.run(function(err) {
      if (err) {
        console.log(err)
        return;
      } else {
        res.redirect('/')
      }
    })
  }
})

app.post('/playlist/update/:id', checkConnection, function(req, res) {
  userId = req.session.userId;
  const id = req.params.id;
  if(req.method == "POST"){
    var sql="SELECT * FROM PLAYLIST WHERE id='"+id+"';";
    db.all(sql, function(err, playlist){
      if (err) {
        console.log(err)
        return;
      }
      if (playlist[0].user_id != userId) {
        res.redirect('back');
        return
      }
      var post  = req.body;
      var name= post.playlist_name || playlist[0].name;
      var description = post.description || playlist[0].description
      var public= post.public;
      if (!public)
        public = false
      else
        public = true
      sql = "UPDATE PLAYLIST SET name='" + name + "', description='" + description +"', public='" + public + "' WHERE id=" + id + ";";
      var query = db.prepare(sql)
      query.run(function(err) {
        if (err) {
          console.log(err)
          return;
        } else {
          res.redirect('back');
        }
      })
    });
  }
})

app.get('/playlist/delete/:id', checkConnection, function(req, res) {
  const id = req.params.id;
  const userId = req.session.userId;
  // SECURITY
  // Check that the playlist user_id === current id
  var sql="SELECT * FROM PLAYLIST WHERE id='"+id+"';";
  db.all(sql, function(err, results){
    if (err) {
      console.log(err)
      return;
    }
    const playlist = results[0]

    if (playlist.user_id == userId) {
      // Here we can proceed the delete
      var sql="DELETE FROM PLAYLIST WHERE id='"+id+"';";
      db.all(sql, function(err, results){
        if (err) {
          console.log(err)
          res.redirect('/')
          return;
        }
        console.log('Playlist '+ playlist.name + ' got delete')
        res.redirect('/')
      })
    } else {
      res.redirect('/')
    }
  })
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
      var sql="SELECT id, first_name, last_name, user_name, password FROM USERS WHERE user_name='"+name+"' and password='"+hash+"';";
      db.get(sql, function(err, results){ 
        if(results){
          req.session.userId = results.id;
          req.session.user = results;
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
    console.log('Profile deleted')
    var sql="DELETE FROM USERS WHERE id='"+userId+"';";
    db.all(sql, function(err, results){
      if (err) {
        console.log(err)
        res.redirect('/logout')
        return;
      }
      res.redirect('/logout')
    });
  } else {
    res.redirect('/logout')
  }
})

// API PART

let checkToken = (req, res, next) => {
  let token = req.headers['x-access-token'] || req.headers['authorization']; // Express headers are auto converted to lowercase
  if (!token) {
    return res.status(401).send({
      success: 'false',
      message: 'no authorization'
    });
  }
  if (token.startsWith('Bearer ')) {
    // Remove Bearer from string
    token = token.slice(7, token.length);
  }

  if (token) {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        return res.json({
          success: false,
          message: 'token is not valid'
        });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    return res.json({
      success: false,
      message: 'auth token is not supplied'
    });
  }
};

app.post(api_link+'oauth/login', (req, res) => {
  if(req.method == "POST"){
    const params = req.query;
    var name= params.user_name;
    var pass= params.password;

    // Check
    if (!name) {
      return res.status(400).send({
        success: 'false',
        message: 'no user_name'
      });
    }

    if (!pass) {
      return res.status(400).send({
        success: 'false',
        message: 'no password'
      });
    }

    var hash = bcrypt.hashSync(pass, salt);
    var sql="SELECT id, first_name, last_name, user_name, password FROM USERS WHERE user_name='"+name+"' and password='"+hash+"';";
    db.get(sql, function(err, results){ 
      console.log(results)
      if(results){
        jwt.sign({
          id: results.id
        }, secret, { expiresIn: '1h' }, function(error, token) {
          if (error) {
            return res.status(400).send({
              success: 'false',
              message: error,
            });
          }
          return res.status(200).send({
            success: 'true',
            message: 'connected',
            token: 'Bearer ' +token
          });
        });
      }
      else{
        console.log(err)
        return res.status(400).send({
          success: 'false',
          message: 'wrong credentials'
        });
      }
    });
  } else {
    return res.status(400).send({
      success: 'false',
      message: 'an error'
    });
  }
})

app.post(api_link+'oauth/register', (req, res) => {
  if(req.method == "POST"){
      var post  = req.query;
      var name= post.user_name;
      var pass= post.password;
      var fname= post.first_name;
      var lname= post.last_name;

      if (!name) {
        return res.status(400).send({
          success: "false",
          message: "no user_name"
        }) 
      }
      if (!pass) {
        return res.status(400).send({
          success: "false",
          message: "no password"
        }) 
      }
      if (!fname) {
        return res.status(400).send({
          success: "false",
          message: "no first_name"
        }) 
      }
      if (!lname) {
        return res.status(400).send({
          success: "false",
          message: "no last_name"
        }) 
      }

      var hash = bcrypt.hashSync(pass, salt);

      var sql = "INSERT INTO `users`(`first_name`,`last_name`,`user_name`, `password`) VALUES ('" + fname + "','" + lname + "','" + name + "','" + hash + "')";

      var query = db.prepare(sql)
      query.run(function(err) {
        if (err) {
          console.log(err)
          return res.status(400).send({
            success: "false",
            message: "username already taken"
          })
        } else {
          return res.status(200).send({
            success: "true",
            message: "account created"
          })
        }
      })
  } else {
    return res.status(400).send({
      success: "false",
      message: "an error has occured"
    })
  }
})

app.get(api_link + 'playlist', checkToken, (req, res) => {
  var userId = req.decoded.id
  var sql="SELECT * FROM PLAYLIST WHERE user_id='"+userId+"' ORDER BY name;";
  db.all(sql, function(err, playlist){
    if (err) {
      return res.status(400).send({
        success: 'false',
        message: err
      });
    }
    res.status(200).send({
      success: 'true',
      message: 'playlist retrieved successfully',
      playlist: playlist
    })
  })
});

app.post(api_link + 'playlist/add', checkToken, (req, res) => {
  var userId = req.decoded.id
  const post = req.query;
  var name= post.playlist_name;
  var description = post.description || ''
  var public= post.public;
  
  if (!name) {
    return res.status(400).send({
      success: 'false',
      message: 'no playlist_name'
    });
  }
  if (!public)
    public = false
  else
    public = true
  var sql = "INSERT INTO `PLAYLIST` (`name`,`user_id`,`public`, `description`) VALUES ('" + name + "', '" + userId + "', '" + public + "', '" + description + "')";
  var query = db.prepare(sql)
  query.run(function(err) {
    if (err) {
      return res.status(400).send({
        success: 'false',
        message: err
      })
    } else {
      return res.status(200).send({
        success: 'true',
        message: 'playlist added successfully'
      })
    }
  })
});

app.delete(api_link + 'playlist/delete', checkToken, (req, res) => {
  const id = req.query.playlist_id;
  var userId = req.decoded.id

  if (!id) {
    return res.status(400).send({
      success: 'false',
      message: 'no playlist_id'
    });
  }

  // SECURITY
  // Check that the playlist user_id === current id
  var sql="SELECT * FROM PLAYLIST WHERE id='"+id+"';";
  db.all(sql, function(err, results){
    if (err) {
      return res.status(400).send({
        success: 'false',
        message: err
      });
    }
    const playlist = results[0]
    if (!playlist) {
      return res.status(400).send({
        success: 'false',
        message: "playlist not found"
      });
    }

    if (playlist.user_id == userId) {
      // Here we can proceed the delete
      var sql="DELETE FROM PLAYLIST WHERE id='"+id+"';";
      db.all(sql, function(err, results){
        if (err) {
          return res.status(400).send({
            success: 'false',
            message: err
          });
        }
        console.log('Playlist '+ playlist.name + ' got delete')
        return res.status(200).send({
          success: 'true',
          message: 'playlist succesful delete'
        });
      })
    } else {
      return res.status(400).send({
        success: 'false',
        message: 'playlist is not yours'
      });
    }
  })
});

app.post(api_link + 'playlist/update', checkToken, (req, res) => {
  const id = req.query.playlist_id;
  var userId = req.decoded.id

  if (!id) {
    return res.status(400).send({
      success: 'false',
      message: 'no playlist_id'
    });
  }

  var sql="SELECT * FROM PLAYLIST WHERE id='"+id+"';";
  db.all(sql, function(err, playlist){
    if (err) {
      console.log(err)
      return;
    }
    if (playlist[0].user_id != userId) {
      return res.status(400).send({
        success: 'false',
        message: 'playlist is not yours'
      });
    }
    var post  = req.query;
    var name= post.name || playlist[0].name;
    var description = post.description || playlist[0].description
    var public= post.public;
    if (!public)
      public = false
    else
      public = true
    sql = "UPDATE PLAYLIST SET name='" + name + "', description='" + description +"', public='" + public + "' WHERE id=" + id + ";";
    var query = db.prepare(sql)
    query.run(function(err) {
      if (err) {
        return res.status(400).send({
          success: 'false',
          message: err
        });
      } else {
        return res.status(200).send({
          success: 'true',
          message: 'playlist updated'
        });
      }
    })
  });

});

app.get(api_link + 'song', checkToken, (req, res) => {
  var userId = req.decoded.id
  const playlistId = req.query.playlist_id;
  
  if (!playlistId){
    return res.status(400).send({
      success: 'false',
      message: 'no playlist_id'
    });
  }

  var sql="SELECT * FROM PLAYLIST WHERE id='"+playlistId+"';";
  db.all(sql, function(err, playlists){
    if (err) {
      return res.status(400).send({
        success: 'false',
        message: err
      });
    }
    const playlist = playlists[0]
    // Check if the playlist is owned by the current user
    if (playlist.user_id == userId) {
      indexPage = true
    }
    // Check that the playlist is not public, only userId can access
    if (playlist.public == "false" && playlist.user_id != userId) {
      return res.status(400).send({
        success: 'false',
        message: 'playlist not public'
      });
    }
    var sql="SELECT * FROM SONGS WHERE playlist_id='"+playlistId+"';";
    db.all(sql, function(err, songs){
      if (err) {
        return res.status(400).send({
          success: 'false',
          message: err
        });
      }
      return res.status(200).send({
        success: 'true',
        message: 'songs retrieved successfully',
        songs: songs
      });
    })
  })
})

app.post(api_link+'song/add', checkToken, (req, res) => {
  var playlist_id =  req.query.playlist_id
  var post  = req.query;
  var song_name= post.song_name;
  if (!playlist_id) {
    return res.status(400).send({
      success: 'false',
      message: 'no playlist_id'
    });
  }
  if (!song_name) {
    return res.status(400).send({
      success: 'false',
      message: 'no song_name'
    });
  }
  var sql = "INSERT INTO `SONGS` (`name`,`playlist_id`) VALUES ('" + song_name + "', '" + playlist_id + "')";
  var query = db.prepare(sql)
  query.run(function(err) {
    if (err) {
      return res.status(400).send({
        success: 'false',
        message: err
      });
    } else {
      return res.status(200).send({
        success: 'true',
        message: 'song add successful'
      });
    }
  })
})

app.post(api_link+'song/update', checkToken, (req, res) => {
  var post  = req.query;
  var song_name= post.song_name;
  var song_id = post.song_id

  if (!song_id) {
    return res.status(400).send({
      success: 'false',
      message: 'no song_id'
    });
  }

  if (!song_name) {
    return res.status(400).send({
      success: 'false',
      message: 'no song_name'
    });
  }
  var sql = "UPDATE SONGS SET name='" + song_name + "' WHERE id=" + song_id + ";";
  var query = db.prepare(sql)
  query.run(function(err) {
    if (err) {
      return res.status(400).send({
        success: 'false',
        message: err
      });
    } else {
      return res.status(200).send({
        success: 'true',
        message: 'song updated'
      });
    }
  })
})

app.delete(api_link+'song/delete', checkToken, (req, res) => {
  var song_id = req.query.song_id
  var userId = req.decoded.id

  // Security: check that the playlist_id => user_id is current userId
  var sql="SELECT * FROM SONGS WHERE id='"+song_id+"';";
  db.all(sql, function(err, songs){
    if (err) {
      return res.status(400).send({
        success: 'false',
        message: err
      });
    }
    var song = songs[0]
    if (!song) {
      return res.status(400).send({
        success: 'false',
        message: 'song not found'
      });
    }
    var playlist_id = song.playlist_id
    var sql="SELECT * FROM PLAYLIST WHERE id='"+playlist_id+"';";
    db.all(sql, function(err, playlists){
      if (err) {
        return res.status(400).send({
          success: 'false',
          message: err
        });
      }
      var playlist = playlists[0]
      // Check if user_id of playlist == currentId
      if (playlist.user_id == userId) {
        // Here we can proceed the delete
        var sql="DELETE FROM SONGS WHERE id="+song_id;
        db.all(sql, function(err, results){
          if (err) {
            return res.status(400).send({
              success: 'false',
              message: err
            });
          }
          return res.status(200).send({
            success: 'true',
            message: 'song deleted'
          });
        })
      } else {
        return res.status(400).send({
          success: 'false',
          message: 'this song is not yours'
        });
      }
    })
  })
})

app.listen(port)
console.log("Listening on port " + port + " ...");

// CHECK BY DELETE PLAYLIST IF PLAYLIST EXISTS !!!!