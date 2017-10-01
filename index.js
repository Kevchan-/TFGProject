var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uuid = require('uuid');
var box2D = require("box2dweb");
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
});*/
var gameserverCode = require('./source/gameserver.js').server;
var gameServer;

io.on('connection', function(socket){
	socket.userid = uuid();
	socket.emit('onConnected', {id: socket.userid});
	
	console.log('socket.io:: player connected ' + socket.userid);

	if(gameServer == null){
		gameServer = new gameserverCode();
	}
	gameServer.FindGameRoom(socket);

	socket.on('disconnect', function(){
		console.log('socket.io:: player disconnected ' + socket.userid );
		io.emit('onDisconnected', socket.userid);
		gameServer.OnDisconnection(socket);
	});

	socket.on('chat message', function(msg){
//		io.emit('chat message', msg);
	});

	socket.on('message', function(message){
		gameServer.OnMessage(socket, message);
	});


});

http.listen(app.get('port'), function(){
	console.log('listening on *'+ app.get('port'));
});
