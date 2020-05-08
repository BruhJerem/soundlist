var fetch = require('isomorphic-fetch')
var SparqlHttp = require('sparql-http-client')
SparqlHttp.fetch = fetch

var endpoint = new SparqlHttp({endpointUrl: 'http://dbtune.org/jamendo/sparql/'})

module.exports = {
  querySparql: function() {
    // run query with promises
    var query = `
      SELECT ?artist ?name WHERE {
        ?artist foaf:name ?name .
      } 
      LIMIT 10
      `
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
}