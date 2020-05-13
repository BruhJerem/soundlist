var fetch = require('isomorphic-fetch')
var SparqlHttp = require('sparql-http-client')
SparqlHttp.fetch = fetch

var endpoint = new SparqlHttp({endpointUrl: 'http://dbtune.org/jamendo/sparql/'})

function sendQuery(query) {
  return new Promise((resolve, reject) => {
    endpoint.selectQuery(query).then(function (res) {
      return res.json()
    }).then(function (result) {
      console.log(result.results.bindings)
      resolve(result.results.bindings)
    }).catch(function (err) {
      console.error(err)
      reject(err.message)
    })
  })
}

module.exports = {
  querySparql: function() {
    // run query with promises
    var query = `
      SELECT ?artist ?name WHERE {
        ?artist foaf:name ?name .
      } 
      LIMIT 10
      `
      return sendQuery(query)
  },
  getAllInfosAboutArtist: function(artist) {
    console.log(`Get infos about ${artist}`)
    var query = `
      PREFIX ns1: <http://www.w3.org/1999/xhtml/vocab#>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      SELECT DISTINCT * WHERE {
        ?artist foaf:name ?name .
        ?artist foaf:img ?img .
        ?artist foaf:homepage ?homepage .
        filter(contains(?name, "${artist}"))
      } 
      limit 10
    `
      return sendQuery(query)
  }
}