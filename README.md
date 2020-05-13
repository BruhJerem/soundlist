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
