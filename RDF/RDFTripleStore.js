const { Connection, query } = require('stardog');
const conn = new Connection({

  username: 'admin',
  password: 'admin',
  endpoint: 'http://localhost:5820',

});
module.exports = {
  queryRdf: function() {
    query.execute(conn, 
      'SONG_DB', 
      `SELECT ?genre
        WHERE
        {
          ?i <http://dbpedia.org/ontology/MusicGenre> ?genre .
        }`,
    'application/sparql-results+json', {

      limit: 10,
      offset: 0,
    
    }).then(({ body }) => {
      console.log(body.results.bindings);
    }).catch((err) => {
      console.log(err)
    })
  }
}