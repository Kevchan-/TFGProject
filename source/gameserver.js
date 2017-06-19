var uuid = require('uuid');
var gameCode = require('./gamecore.js').gameCore;

function GameRoom(client){
	this.id = uuid(); 			//room id
	console.log("Room id: "+this.id);
	this.playerHost = client; 
	this.playerClients = {}; 	//create players here as clients join
	this.playerCount = 1; 		//there's only the host on creation

//	var newGame = gameCode(this);
	this.game = new gameCode(this); //the game logic class
	this.game.AddPlayer(client);
//	this.game.

	this.AddPlayer = function(newPlayer){
		this.playerClients[newPlayer.userid] = newPlayer;
//		console.log(this.playerClients);
		if(this.game !== null){
			this.playerCount++;
			console.log("Player count: "+this.playerCount);
//			this.game.players[newPlayer.userid] = newPlayer;
			this.game.AddPlayer(newPlayer);
//			console.log("Player joined with id "+this.game.players[newPlayer.userid].id);
		}
		else{
			console.log("No existing game");
		}
	}
}

var firstRoomId;

function GameServer(){
	this.games = {};
	this.gameCount = 0;

	this.CreateGameRoom = function(client){
		var gameRoom = new GameRoom(client);
		//we store the room
		firstRoomId = gameRoom.id;
		this.games [gameRoom.id] = gameRoom;
		console.log("Room object: "+this.games[firstRoomId]);
		console.log("Room id after creating: "+this.games[firstRoomId].id);
		this.gameCount++;
		client.gameRoom = gameRoom;
	}

	this.FindGameRoom = function(client){
		if(this.gameCount >0){
			var joined = false;
			//console.log(this.games);
			for(var gameid in this.games){
				if(this.games.hasOwnProperty(gameid)){
					console.log("room id: "+this.games[gameid].id);
					var room = this.games[gameid];
					joined = true;
					//console.log("client clients: "+room.playerClients);
					room.AddPlayer(client);

				}
				else continue;
			}
		}
		else{
			this.CreateGameRoom(client);
		}
	}

	this.OnMessage = function(client, message){
		var messageParts = message.split('.');
		var messageType  = messageParts[0];

		if(messageType == 'p'){
			//messageParts[1] contains the date in which the ping packet was sended
			client.send('p.' + messageParts[1]); //sending 's.p', s for 
		}
	}
}

module.exports.server = GameServer;
