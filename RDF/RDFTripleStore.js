const { Connection, query } = require('stardog');
const conn = new Connection({

  username: 'admin',
  password: 'admin',
  endpoint: 'http://localhost:5820',

});
module.exports = {
  queryRdf: function() {
    return new Promise((resolve, reject) => {
      query.execute(conn, 
        'SONG_DB', 
        `SELECT ?i ?name
        WHERE
        {
          ?i :Track.Name ?name.
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
        'SONG_DB', 
        `
        prefix dbo: <http://dbpedia.org/ontology/>
        SELECT *
        WHERE
        {
          ?i :Track.Name ?name.
          ?i :Acousticness ?acousticness.
          ?i dbo:MusicGenre ?genre.
          ?i :Popularity ?popularity.
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