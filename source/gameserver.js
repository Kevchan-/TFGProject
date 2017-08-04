var uuid = require('uuid');
var gameCode = require('./gamecore.js').gameCore;

function GameRoom(client){
	this.id = uuid(); 			//room id
	console.log("Room id: "+this.id);
	this.playerHost = client; 
	this.playerClients = {}; 	//create players here as clients join
	this.playerCount = 1; 		//there's only the host on creation
	this.active = false;

//	var newGame = gameCode(this);
	this.game = new gameCode(this); //the game logic class
	this.game.AddPlayer(client);

	this.AddPlayer = function(newPlayer){
		this.playerClients[newPlayer.userid] = newPlayer;
//		console.log(this.playerClients);
		if(this.game !== null){
			this.playerCount++;
			console.log("Player count: "+this.playerCount);
//			this.game.players[newPlayer.userid] = newPlayer;
			this.game.AddPlayer(newPlayer);
			newPlayer.gameRoom = this;
//			console.log("Player joined with id "+this.game.players[newPlayer.userid].id);
		}
		else{
			console.log("No game could be made");
		}
	}

	this.Disconnect = function(userId){
		this.playerCount--;
		this.game.ServerDeletePlayer(this.playerHost, userId);
	}
}


function GameServer(){
	this.games = {};	//gameRooms
	this.gameCount = 0;

	this.CreateGameRoom = function(client){
		var gameRoom = new GameRoom(client);
		//we store the room
		this.games [gameRoom.id] = gameRoom;
		console.log("Room id: "+this.games[gameRoom.id].id);
		this.gameCount++;
		client.gameRoom = gameRoom;
		client.hosting = true;
		client.send('h.'+client.userid);
	}

	this.OnDisconnection = function(client){	//when someone disconnected		
		var id = client.userid;
		var roomId = client.gameRoom.id;
		var room = client.gameRoom;


		if(client.hosting){ //if it's the host who left

			var newHost = false;

			console.log("HOST "+client.userid+" LEFT");
//search for new host (first one in the array of playerclients is the new host)
			for(var playerid in room.playerClients){
				if(!newHost){
					if(room.playerClients.hasOwnProperty(playerid)){
						if(room.playerClients[playerid]){
								newHost = true;
								room.playerHost = room.playerClients[playerid];
								delete room.playerClients[playerid];
								console.log("NEW HOST: "+room.playerHost.userid);
						}
					}
				}
				else{
					break;
				}
			}
//now we have the new host, so we notify them
			room.playerHost.hosting = true;
			room.playerHost.gameRoom = room;
			room.playerHost.send('h.'+room.playerHost.userid);
//delete player from room 
		}
		room.Disconnect(id);
		delete room.playerClients[client.userid];
	}

//will give the first client the host's id and the host the client's id, and will send the "ready" messages
	this.StartGame = function(gameRoom){
		if(gameRoom.playerHost){
			var clientId = Object.getOwnPropertyNames(gameRoom.playerClients)[0];
			gameRoom.playerHost.send('o.'+clientId);	//o for when other player joined
			gameRoom.playerHost.send('s.'+String(gameRoom.game.localTime).replace('.','-')); //s for start
			console.log("ServerTime :"+gameRoom.game.localTime);
		}
		for(var playerid in gameRoom.playerClients){
			if(gameRoom.playerClients.hasOwnProperty(playerid)){
				if(gameRoom.playerClients[playerid]){
					gameRoom.playerClients[playerid].send('j.' + gameRoom.playerHost.userid);	//j for when clients (not the host) join, we also pass them the host's id
					gameRoom.playerClients[playerid].send('s.'+String(gameRoom.game.localTime).replace('.','-'));	//must send the date in string format. also gotta replace the dots with a dash bc of the parsing system on the gamecore class
				}
			}
			else continue;
		}
		gameRoom.active = true;
		gameRoom.game.active = true;
		gameRoom.game.Update(new Date().getTime());
	}


	this.OnPlayerJoin = function(gameRoom, client){	//we inform everyone that this new player joined, including the player
		var existingIds = ''; //id of players already there
		var counter = 1;

		if(gameRoom.playerHost){
			gameRoom.playerHost.send('o.'+client.userid);	//o for when other player joined
			existingIds = gameRoom.playerHost.userid;
		}
		for(var playerid in gameRoom.playerClients){
			if(gameRoom.playerClients.hasOwnProperty(playerid)){
				if(gameRoom.playerClients[playerid]){
					if(playerid != client.userid){
						gameRoom.playerClients[playerid].send('o.'+client.userid);
						existingIds = existingIds+','+gameRoom.playerClients[playerid].userid;
						counter++;
					}
				}
			}
		}
		console.log("id array of "+counter+" ids: "+existingIds);
		client.send('j.'+existingIds);	//informing the player itself it joined and send them the existing players
		client.send('s');
	}



	this.FindGameRoom = function(client){
		console.log("________________________");
		if(this.gameCount >0){
			var joined = false;
			//console.log(this.games);
			for(var gameid in this.games){
				if(this.games.hasOwnProperty(gameid)){
					if(this.games[gameid]){
						console.log("room id: "+this.games[gameid].id);
						var room = this.games[gameid];
						joined = true;
						//console.log("client clients: "+room.playerClients);
						room.AddPlayer(client);
						if(this.games[gameid].playerCount == 2){ //the game starts when a second player enters, next joining players will enter with the game started
							this.StartGame(this.games[gameid]);	
						}
						else if(this.games[gameid].playerCount > 2){	//the game is already started so we only inform the players each time a new one joins
							this.OnPlayerJoin(this.games[gameid], client);
						}
					}
				}
				else continue;
			}
			if(!joined){
				this.CreateGameRoom(client);
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
		else if(messageType == 'i'){
			this.OnInput(client, messageParts);
		}
	}

	this.OnInput = function(client, messageParts){
		var inputCommands = messageParts[1].split('-');
		var inputTime = messageParts[2].replace('-','.');
		var inputSequence = messageParts[3];

		if(client.gameRoom.game){
			client.gameRoom.game.ServerInputHandler(client, inputCommands, inputTime, inputSequence);
		}else{
			console.log("incorrect client");
		}
	}
}

module.exports.server = GameServer;
