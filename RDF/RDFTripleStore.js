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
  }
}