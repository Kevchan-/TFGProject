var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uuid = require('uuid');
var fs = require('fs');
var verbose = true;

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname +'/public'));
app.use(express.static(__dirname +'/source'));

// views is directory for all template files
app.set('views', './views');
app.set('view engine', 'ejs');


app.get('/', function(request, response){
/*	if(verbose){
		var file = request.params[0];
		console.log('Express :: file requested : '+file);
	}*/

	response.render('pages/index');
});

/*app.get('/three.js', function(request, response){
	response.sendFile(path.join(__dirname,'source', 'three.min.js'));
});/*

io.on('connection', function(socket){
	socket.userid = uuid();
	socket.emit('onconnected', {id: socket.userid});

	console.log('socket.io:: player connected ' + socket.userid );

	socket.on('disconnect', function(){
		console.log('socket.io:: player disconnected ' + socket.userid );
	});

	socket.on('chat message', function(msg){
		io.emit('chat message', msg);
	});
});

http.listen(app.get('port'), function(){
	console.log('listening on *'+ app.get('port'));
});


/*var express = require('express');
var app = express();
var cool = require('cool-ascii-faces');
var pg = require('pg');
var io = require('socket.io');

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/times', function(request, response) {
    var result = ''
    var times = process.env.TIMES || 5
    for (i=0; i < times; i++)
      result += i + ' ';
  response.send(result);
});

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.get('/cool', function(request, response){
	response.send(cool());
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

app.get('/db', function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM test_table', function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err); }
      else
       { response.render('pages/db', {results: result.rows} ); }
    });
  });
});
*/