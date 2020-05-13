import csv
from rdflib.namespace import FOAF, RDF
from rdflib import URIRef, Graph, Literal, RDF, Namespace, RDFS


if __name__=='__main__':
	
	store = Graph()
	
	# Bind a few prefix, namespace pairs for pretty output	
	n = Namespace("http://example.org/Song/")
	store.bind("", n)	
	dbo = Namespace("http://dbpedia.org/ontology/")
	store.bind("dbo", dbo)
	dbp = Namespace("http://dbpedia.org/property/")
	store.bind("dbp", dbp)
	store.bind("foaf", FOAF)

	# Add Class
	store.add((URIRef(n+"Song"), RDF.type, RDFS.Class))

	# Add Propeties
	store.add((URIRef(n+"Track.Name"), RDF.type, URIRef(n+"Song")))
	# Artist.Name => dbo:artist
	# genre => dbo:MusicGenre
	store.add((URIRef(n+"Beats.Per.Minute"), RDF.type, URIRef(n+"Song")))
	store.add((URIRef(n+"Energy"), RDF.type, URIRef(n+"Song")))
	store.add((URIRef(n+"Danceability"), RDF.type, URIRef(n+"Song")))
	store.add((URIRef(n+"Loudness..dB"), RDF.type, URIRef(n+"Song")))
	store.add((URIRef(n+"Valence"), RDF.type, URIRef(n+"Song")))
	store.add((URIRef(n+"Length"), RDF.type, URIRef(n+"Song")))
	store.add((URIRef(n+"Acousticness"), RDF.type, URIRef(n+"Song")))
	store.add((URIRef(n+"Speechiness"), RDF.type, URIRef(n+"Song")))
	store.add((URIRef(n+"Popularity"), RDF.type, URIRef(n+"Song")))
	
	#open the cvs file to read
	with open('./top50.csv', 'r', encoding = "ISO-8859-1") as cvsfile:
		#read a csv file into a dictionary
		csv_reader = csv.DictReader(cvsfile, delimiter=',')
		
		#go through the rows in csv file
		for row in csv_reader:
			# Create an identifier to use as the subject for each song.
			name = dict(row)["Track.Name"]
			for ch in ['\\','`','*',' ','?','!','[',']','>','#','&','-','.','!','$','\'', ':', ',']:
				if ch in name:
					name = name.replace(ch, "_")
			song = URIRef(n + name)

			# Add triples using store's add method.
			# 
			store.add((song, RDF.type, URIRef(n+"Song")))

			if(dict(row)['Track.Name'] != ''):
				store.add((song, URIRef(n+"Track.Name"), Literal(dict(row)['Track.Name'])))
			
			if(dict(row)['Artist.Name'] != ''):
				store.add((song, dbo.artist, Literal(dict(row)['Artist.Name'])))

			if(dict(row)['Genre'] != ''):
				store.add((song, dbo.MusicGenre, Literal(dict(row)['Genre'])))

			if(dict(row)['Beats.Per.Minute'] != ''):
				store.add((song, URIRef(n+"Beats.Per.Minute"), Literal(dict(row)['Beats.Per.Minute'])))

			if(dict(row)['Energy'] != ''):
				store.add((song, URIRef(n+"Energy"), Literal(dict(row)['Energy'])))

			if(dict(row)['Danceability'] != ''):
				store.add((song, URIRef(n+"Danceability"), Literal(dict(row)['Danceability'])))

			if(dict(row)['Loudness..dB..'] != ''):
				store.add((song, URIRef(n+"Loudness..dB"), Literal(dict(row)['Loudness..dB..'])))
			
			if(dict(row)['Valence.'] != ''):
				store.add((song, URIRef(n+"Valence"), Literal(dict(row)['Valence.'])))
			
			if(dict(row)['Length.'] != ''):
				store.add((song, URIRef(n+"Length"), Literal(dict(row)['Length.'])))

			if(dict(row)['Acousticness..'] != ''):
				store.add((song, URIRef(n+"Acousticness"), Literal(dict(row)['Acousticness..'])))

			if(dict(row)['Speechiness.'] != ''):
				store.add((song, URIRef(n+"Speechiness"), Literal(dict(row)['Speechiness.'])))

			if(dict(row)['Popularity'] != ''):
				store.add((song, URIRef(n+"Popularity"), Literal(dict(row)['Popularity'])))
			
				
	# Serialize as Turtle
	rdffile = open('top50.ttl', 'wb')
	rdffile.write(store.serialize(format="turtle"))
		
	cvsfile.close()
	rdffile.close()