const { Connection, query, db } = require('stardog');
const fs = require('fs');
const path = require("path");

Array.prototype.contains = function(element){
  return this.indexOf(element) > -1;
};

const wrapWithResCheck = fn => res => {
  if (!res.ok) {
    throw new Error(
      `Something went wrong. Received response: ${res.status} ${res.statusText}\n${res.body.message}`
    );
  }
  return fn(res);
};
const conn = new Connection({

  username: 'admin',
  password: 'admin',
  endpoint: 'http://localhost:5820',

});
const dbName = 'SONG_DB'
const data = fs.readFileSync(path.join(__dirname, "top50.ttl"), "utf8");
const logSuccess = () => console.log(`Created ${dbName}.`);
const logFailure = failureReason => console.error(failureReason);

checkIfDataBaseExists = (name) => {
  return new Promise((resolve, reject) => {
    db.list(conn).then((res) => {
      if (res.body.databases.contains(name))
        resolve(true)
      else
        resolve(false)
    }).catch((e) => reject(e))
  })
}

const insertQuery = `insert data { ${data} }`;

module.exports = {
  createTable: function() {
    checkIfDataBaseExists(dbName).then((exists) => {
      if (!exists) {
        db.create(conn, dbName)
        .then(wrapWithResCheck(() => query.execute(conn, dbName, insertQuery)))
        .then(logSuccess)
        .catch(logFailure)
      }
    }).catch((e) => console.error(e.message));
  },
  queryRdf: function() {
    return new Promise((resolve, reject) => {
      query.execute(conn, 
        dbName, 
        `SELECT ?i ?name
        WHERE
        {
          ?i <http://example.org/Song/Track.Name> ?name.
        }`,
      'application/sparql-results+json', {
  
        limit: 10,
        offset: 0,
      
      }).then(({ body }) => {
        console.log(body.results.bindings);
        resolve(body.results.bindings)
      }).catch((err) => {
        console.error(err)
        reject(err.message)
      })
    });
  },
  getInfoAboutSong: function(songName, artist) {
    return new Promise((resolve, reject) => {
      query.execute(conn, 
        dbName, 
        `
        prefix dbo: <http://dbpedia.org/ontology/>
        SELECT *
        WHERE
        {
          ?i <http://example.org/Song/Track.Name> ?name.
          ?i <http://example.org/Song/Acousticness> ?acousticness.
          ?i dbo:MusicGenre ?genre.
          ?i <http://example.org/Song/Popularity> ?popularity.
          ?i dbo:artist ?artist.
          FILTER regex(?name, "${songName}")
          FILTER regex(?artist, "${artist}")
        }
        `,
      'application/sparql-results+json', {
  
        limit: 10,
        offset: 0,
      
      }).then(({ body }) => {
        console.log(body.results.bindings);
        resolve(body.results.bindings)
      }).catch((err) => {
        console.error(err)
        reject(err.message)
      })
    });
  }
}