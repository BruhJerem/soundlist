
# Soundlist By Bruhwiler Jérémie

## Project

SoundList is a music playlist manager where the user can share his playlists to his friends, family, or more! Thanks to this platform, you can manage your playlists and add songs that you always wanted to listen. This platform that is more like an internal database, have also a way to interact with different devices. This means, with SoundList it is possible to develop a mobile application using the data of the platform and interact with it without navigating on the website. This allows to developer to create their own mobile application, or website, to interact with SoundList. The developer can easily integrate our API with our documentation.
This Web App also uses RDF Triple Store and SPARQL.

## Setup
Run this in your console

    stardog-admin server start
    npm install
    node app.js

The Web app will run on [localhost:8080](localhost:8080)

To try if it works, you can go to [localhost:8080/rdf/test](localhost:8080/rdf/test) and [localhost:8080/sparql/test](localhost:8080/sparql/test) 

The don't forget to close stardog

    stardog-admin server stop

## REST API
soundlist-report

REST API

The REST API is a very smart way to interact with the web application or with new devices. When the server is running on your machine, the server is running on localhost:8080. The base route of the api can be called with the following URL: base link + “/api/v1/” + route that you want to call + parameters.

For example: localhost:8080/api/v1/login?user_name=1234&password=1234 Different responses code:

-   - Status code 200 if the request was carried out successfully.
    
-   - Status code 401 if the Authorization header is missing, or if the Access Token is invalid, or if the
    
    user is not authorized to create a new playlist for that account.
    
-   - Status code 400 if anything is wrong (e.g. missing password, etc.)
    
    All the details of the routes can be found in the [documentation](https://documenter.getpostman.com/view/5496386/SzYUZg9M?version=latest).

soundlist-report

## Linked Open Data

In this part of the project, there are two different and distinct sections. In the first part, we will see how I implemented the 3-star open linked data of songs to set up an RDF triple store for Soundlist. In the second part, we will see the implementation of 5 star open linked data of music.

### RDF Triple Store

With the download of the Top 50 Spotify Songs in 2019 file, we've translated the CSV file into RDF using a python script that can be found in `RDF/CSV2RDF.py.` This script generates a .ttl file.

For the creation of the RDF store, the use of spardog was used. After doing the 
`stardog-admin server start` command, we have a SONG_DB database that contains the data in the .ttl file.

The implementation of the RDF Triple Store in nodejs can be found under `./RDF/RDFTripleStore.js`. We find all the queries used to retrieve the data we want to receive for the song name and artist. The query returns Acousticness, MusicGenre, Popularity and the artist.

### Using Open Linked Data

For this part, Soundlist uses Jamendo (Links to an external site.) which is a large repository of Creative Commons licensed music. This part helped us to find information about the artists we put in a playlist. To use this, we have all the script that can be found in `./sparql/query-sparql.js`.
