var playerCode = {};

var frame_time = 60/1000; // run the local game at 16ms/ 60hz

if('undefined' != typeof(global)){
 	frame_time = 45; //on server we run at 45ms, 22hz
	playerCode = require('./player.js').player;
}
else
{
    var lastTime = 0;
    var vendors = [ 'ms', 'moz', 'webkit', 'o' ];

    for ( var x = 0; x < vendors.length && !window.requestAnimationFrame; ++ x ) {
        window.requestAnimationFrame = window[ vendors[ x ] + 'RequestAnimationFrame' ];
        window.cancelAnimationFrame = window[ vendors[ x ] + 'CancelAnimationFrame' ] || window[ vendors[ x ] + 'CancelRequestAnimationFrame' ];
    }

    if ( !window.requestAnimationFrame ) {
        window.requestAnimationFrame = function ( callback, element ) {
//        	console.log("ok");
            var currTime = Date.now(), timeToCall = Math.max( 0, frame_time - ( currTime - lastTime ) );
            var id = window.setTimeout( function() { callback( currTime + timeToCall ); }, timeToCall );
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if ( !window.cancelAnimationFrame ) {
        window.cancelAnimationFrame = function ( id ) { clearTimeout( id ); };
    }
};




Number.prototype.fixed = function(n) { n = n || 3; return parseFloat(this.toFixed(n)); };
GameCore.prototype.lerp = function(p, n, t) { var _t = Number(t); _t = (Math.max(0, Math.min(1, _t))).fixed(); return (p + _t * (n - p)).fixed(); };
    //Simple linear interpolation between 2 vectors
GameCore.prototype.v_lerp = function(v,tv,t) { return { x: this.lerp(v.x, tv.x, t), y:this.lerp(v.y, tv.y, t) }; };


function GameCore(gameRoom){
	//if gameRoom is null it means it's not being called from server, rather from client
	this.room = gameRoom;
	this.server = false;	//is this ran by the server or not
	this.players = {};
	this.host = {}; //serverside only, if not the first player added from the browser will be "selfPlayer". host is also in the vector, unlike selfPlayer
	this.selfPlayer = {};	//clientside only, if not called from the client then the first player added from the server will be in the vector
	this.playerCount = 0;
	this.matrix = new Array(20);

	this.active = false;	//when game starts this turns true

	this.world = {
		width: 720,
		height: 480
	}

	if(this.room){
		this.server = true;	//if there's no room as argument it's bc its not the server
	}	

	for(var i=0; i<20; i++) {
	    this.matrix[i] = new Array(20);
	    for(var j = 0; j < 20; j++){
	    	if(!this.server){
	    		this.matrix[i][j] = MakeSquare(i, j);
	    	}
	    }
	}
	console.log("Server: "+this.server);

	this.ClientCreateConfiguration = function(){
		this.naiveApproach = false;
		this.clientPrediction 	= false;
		this.inputSequence 		= 0;
		this.clientSmoothing 	= true;
		this.clientSmooth 		= 25;

		this.netPing 		= 0.001;	//travel time for a packet to the server and back to the client
		this.netLatency		= 0.001;	//latency between client and server (ping/2)
		this.lastPingTime	= 0.001;	//the last time we sent a ping
		this.fakeLag		= 0;		//if were simulating lag, this applies only to the input client. prolly wont use
		this.fakeLagTime	= 0;		

		this.netOffset		= 100;		//100ms latency between server and client interpolation for the rest of clients
		this.bufferSize		= 2;		//size of the server history to keep for rewinding/interpolating
		this.targetTime		= 0.01;		//the time where we want to be in the server timeline
		this.oldestTick 	= 0.01;		//last time tick we have in the buffer

		this.clientTime = 0.01;
		this.serverTime	= 0.01;

		this.deltaTime	= 0.016;
		this.fps		= 0;		//this is (1/this.deltaTime)
		this.update_Time = 0.000;

		this.lit = 0;
		this.lit = new Date().getTime();
	}

	this.Update = function(time){

		if(typeof(time) == "undefined"){
			time = Date.now();
			console.log("update time is undefined");
		}
		else{
//			console.log("time: "+time);
		}

		if(this.lastFrameTime){
			this.deltaTime = ((time - this.lastFrameTime)/1000.0).fixed();
//			console.log(this.deltaTime);
		}
		else{
			this.deltaTime = 0.016;
		}
		this.lastFrameTime = time;

		if(this.active){
			if(this.server){
				this.ServerUpdate();
			}
			else{
//				console.log("Client update");
				this.ClientUpdate();
				this.PrintDebugData();

				Render(this.deltaTime);
			}
		}
		
		if(this.server){
			this.animationFrame = setTimeout(this.Update.bind(this, Date.now()), frame_time);
		}else{
			this.animationFrame = window.requestAnimationFrame(this.Update.bind(this), this.viewport);
		}
	}

	this.PrintDebugData = function(){
/*		renderer.getContext("2d").clearRect(0, 0, 252, 144);
		renderer.getContext("2d").fillText("fps: "+this.fpsAverage,10,10);
		renderer.getContext("2d").fillText("localTime: "+this.localTime,10,30);
		renderer.getContext("2d").fillText("netPing: "+this.netPing,10,50);
		renderer.getContext("2d").fillText("clientTime: "+this.clientTime,10,70);
		renderer.getContext("2d").fillText("serverTime: "+this.serverTime,10,90);
		renderer.getContext("2d").fillStyle="#FF0000";
		renderer.getContext("2d").fillRect(100, 50, 1, 1);*/
	}

	this.CreateTimer = function(){
		setInterval(function(){
			this.localDeltaTime = new Date().getTime() - this.previousLocalDeltaTime;
			this.previousLocalDeltaTime = new Date().getTime();
			this.localTime += this.localDeltaTime/1000.0;
		}.bind(this), 4);
	}	

	this.CreatePhysicsSimulation = function(){
		setInterval(function(){
			this.physicsDeltaTime = (new Date().getTime() - this.previousPhysicsDeltaTime)/1000.0;
			this.previousPhysicsDeltaTime = new Date().getTime();
			this.UpdatePhysics();
		}.bind(this), 15);	
	}

	this.UpdatePhysics = function(){
		if(this.active){
		    if(this.server) {
		    	this.ServerUpdatePhysics();
		    } else {
		    	this.ClientUpdatePhysics();
		    }
		}
	}

	this.ClientUpdatePhysics = function(serverUpdate){
		var message = "";
		if(typeof(serverUpdate) != 'undefined'){
			message = "su/";
		}else{
			message = "cu/";
		}

		if(this.clientPrediction){

			this.selfPlayer.oldState.pos.x = this.selfPlayer.currentState.pos.x;
			this.selfPlayer.oldState.pos.y = this.selfPlayer.currentState.pos.y;
			if(message == "cu/"){
				var movement = this.ProcessInput(this.selfPlayer);
				this.selfPlayer.currentState.pos.x = this.selfPlayer.oldState.pos.x + movement.x;
				this.selfPlayer.currentState.pos.y = this.selfPlayer.oldState.pos.y + movement.y;
			}
			else{

			}
			if(this.selfPlayer.currentState.pos.x != this.selfPlayer.oldState.pos.x || this.selfPlayer.currentState.pos.y != this.selfPlayer.oldState.pos.y){
	//			if(this.selfPlayer.currentState.pos.x < this.selfPlayer.oldState.pos.x || this.selfPlayer.currentState.pos.y < this.selfPlayer.oldState.pos.y){
					//console.log("pu/ pos: "+this.selfPlayer.currentState.pos.x+", "+this.selfPlayer.currentState.pos.y);
//					console.log("pu/ mov: "+movement.x+", "+movement.y);
	//			}
			}

			this.selfPlayer.stateTime = this.localTime;
		}else{
			this.selfPlayer.oldState.pos.x = this.selfPlayer.currentState.pos.x;
			this.selfPlayer.oldState.pos.y = this.selfPlayer.currentState.pos.y;
			var movement = this.ProcessInput(this.selfPlayer);
//			console.log(message+"input: "+movement.x.toFixed(2)+", "+movement.y.toFixed(2));
			this.selfPlayer.currentState.pos.x = this.selfPlayer.currentState.pos.x + movement.x;
			this.selfPlayer.currentState.pos.y = this.selfPlayer.currentState.pos.y + movement.y;

			this.selfPlayer.stateTime = this.localTime;			
		}
	}

	this.ClientCreatePingTimer = function(){
		setInterval(function(){
			this.lastPingTime = new Date().getTime() -this.fakeLag;
			this.socket.send('p.' + (this.lastPingTime));	//sends the date to the server
		}.bind(this), 1000);
	}

	this.ClientOnConnected = function(data){	//client itself connected
		console.log("Connected");
		this.selfPlayer.state = 'connected';
		this.selfPlayer.online = true;
		this.selfPlayer.id = data.id;
	}


	this.ClientOnPing = function(data){
		var newDate = new Date().getTime();
		var oldDate = parseFloat(data);
		this.netPing = Math.abs(newDate - oldDate);
		this.netLatency = this.netPing/2;
	}

	this.ClientOnHost = function(){
		console.log("You're hosting the game & waiting for a player to join and start the game");

		this.selfPlayer.host = true;
		this.selfPlayer.state = 'hosting & waiting for a player to join';
	}

	this.ClientOnJoin = function(data){	//when selfPlayer player joins
		var ids = data.split(',');
		this.selfPlayer.host = false;
		this.selfPlayer.state = "Joined a game & waiting for the start";
		console.log("Array of "+ids.length+" ids: "+ids);
		for(var i = 0; i < ids.length; i++){
			if(ids[i] !== this.selfPlayer.id){
				this.AddPlayer(null, ids[i]);
			}
		}

		console.log("You joined a game with now "+this.playerCount+" players");
	}

	this.ClientOnOtherJoined = function(data){	//when another player joins (receiving host id on parameter)
		console.log("Another player joined");
		this.AddPlayer(null, data);
	}

	this.ClientOnGameStart = function(data){
		console.log("NOW PLAYING");

		var serverTime = parseFloat(data.replace('-','.'));	//we pass this back to proper date format and then parse it to float
		console.log("Server time: "+serverTime);

		this.active = true;	//IMPORTANT, IT LETS THE GAMELOOP RUN
		this.localTime = serverTime + this.netLatency;

		this.selfPlayer.state = "local_pos";
		if(this.selfPlayer.hosting){
			this.selfPlayer.state = "local_pos(hosting)"
		}
		
		for(var playerid in this.players){
			if(this.players.hasOwnProperty(playerid)){
				this.players[playerid].state = "local_pos";
			}
			else{
				continue;
			}
		}
	}

	this.ClientOnMessage = function(data){
		var messageParts = data.split('.');
		var command = messageParts[0];
		var commandData = messageParts[1] || null;	//if theres not command data in the string, set it null
		switch(command){
			case 'p':
				this.ClientOnPing(commandData);
				break;
			case 'h':
				this.ClientOnHost();
				break;
			case 'j':
				this.ClientOnJoin(commandData);
				break;
			case 'o':
				this.ClientOnOtherJoined(commandData);
				break;
			case 's':
				this.ClientOnGameStart(commandData);
		}
	}

	this.ClientOnDisconnected = function(data){	//when other player disconnects
		var id = data;

		console.log("players in the array:"+Object.keys(this.players).length);
		console.log("SOMEONE DISCONNECTED");
		
		//search for the player that disconnected in the 

		if(this.players[id]){
			this.players[id].DeleteModel();
			delete this.players[id];
		}
		this.playerCount--;

		console.log("players in the array:"+Object.keys(this.players).length);
	}


	this.ClientConnectToServer = function(){
		this.socket = io();	//this is what trigers the connection event on the server and the connect event coming next here

		console.log("socket initialized" );
		//not connected still, rather "in a status that is connecting to the server"
		this.socket.on('connect', function(){
        	this.selfPlayer.state = 'connecting';
        	console.log('Connecting...');
        }.bind(this));

		this.socket.on('onDisconnected', this.ClientOnDisconnected.bind(this));
    	this.socket.on('onServerUpdate', this.ClientOnServerUpdate.bind(this));	
		this.socket.on('onConnected', this.ClientOnConnected.bind(this));
//		this.socket.on('error', );
		this.socket.on('message', this.ClientOnMessage.bind(this));
	}

	this.ClientInputHandler = function(){
		var xDir = 0;
		var yDir = 0;
		var input = [];

		if(this.keyboard.pressed('A')||this.keyboard.pressed('left')){
			xDir = -1;
			input.push('l');
		}
		else if(this.keyboard.pressed('D')||this.keyboard.pressed('right')){
			xDir = 1;
			input.push('r');
		}
		else if(this.keyboard.pressed('S')||this.keyboard.pressed('down')){
			yDir = -1;
			input.push('d');
		}				
		else if(this.keyboard.pressed('W')||this.keyboard.pressed('up')){
			yDir = 1;
			input.push('u');
		}

		if(input.length>0){
			this.inputSequence += 1;

			this.selfPlayer.inputs.push({
				inputs 	: input,
				time 	: this.localTime.toFixed(3),
				sequence: this.inputSequence
			});

//			console.log("cu/ "+this.selfPlayer.inputs.length+" inputs on client array");

			var serverPacket = 'i.';
			serverPacket += input.join('-')+'.';
			serverPacket += this.localTime.toFixed(3).replace('.','-') + '.';
			serverPacket += this.inputSequence;

			this.socket.send(serverPacket);

//			console.log("Sent");
		}
	}

	this.ClientProcessNetUpdates = function(){
		if(this.serverUpdates.length > 0){
			var currentTime = this.clientTime;
			var target = null;
			var previous = null;

			for(var i = 0; i<this.serverUpdates.length; i++){
				var point = this.serverUpdates[i];
				var nextPoint = this.serverUpdates[i+1];
	
/*				console.log(point["time"]+" n update time");
				console.log(this.clientTime+" clientTime");
				console.log(nextPoint["time"]+" n+1 update time");*/
	
				//compare our time with the server times
				if(currentTime > point["time"] && currentTime < nextPoint["time"]){
					target = nextPoint;
					previous = point;
//					console.log("target & previous positions found");
					break;
				}
			}
			if(target && previous){
				this.targetTime = target.time;

				var difference = this.targetTime - currentTime;
				var maxDifference = parseFloat((target.time - previous.time).toFixed(3));
				var timePoint = parseFloat((difference/maxDifference).toFixed(3));	//value/target will give us the 0 to 1 range we need for lerp

				var latestServerUpdate = this.serverUpdates[this.serverUpdates.length-1];

/*				for(var playerId in this.players){
					if(this.players.hasOwnProperty(playerId)){
						console.log("ids in players array: "+playerId);
					}
				}*/

				if(this.clientSmoothing){
					for(var playerId in this.players){
						if(this.players.hasOwnProperty(playerId)){
//								console.log(playerId);
//								console.log(this.selfPlayer.id);								

							if (playerId != this.selfPlayer.id) {//updating only others
//								console.log(playerId);
//								console.log(this.selfPlayer.id);					
								var serverPos 	= latestServerUpdate[playerId+".pos"];
								var targetPos 	= target[playerId+".pos"];
								var pastPos 	= previous[playerId+".pos"];

								if(typeof(pastPos) != 'undefined' && typeof(targetPos) != 'undefined'){
						//			console.log("Updating others position: "+previous[playerId+".pos"].x+", "+previous[playerId+".pos"].y);
//									console.log("pastpos of "+playerId+": "+previous[playerId+".pos"]);
									var otherPosition = this.v_lerp(pastPos, targetPos, timePoint);
									var finalOtherPosition = this.v_lerp(this.players[playerId].pos, otherPosition, this.physicsDeltaTime*this.clientSmooth);
								//	console.log("Player "+playerId+" position: "+finalOtherPosition.x+", "+finalOtherPosition.y);
			//						if(this.players[playerId].pos.x != finalOtherPosition.x || this.players[playerId].pos.y != finalOtherPosition.y){
						//				console.log("Updating others position: "+ finalOtherPosition.x+", "+finalOtherPosition.y);
			//						}
									this.players[playerId].SetPos(finalOtherPosition.x, finalOtherPosition.y, false);									
								}
							}
						}else{
							continue;
						};
					}
				}

/*				if(!this.clientPrediction){

					this.ClientUpdatePhysics();
					this.ClientUpdateLocalPosition();
				}*/

				if(!this.clientPrediction && !this.naiveApproach){
					//console.log("using net only");

					var myServerPosition = latestServerUpdate[this.selfPlayer.id+".pos"];
					var myTargetPosition = target[this.selfPlayer.id+".pos"];
					var myPastPosition = previous[this.selfPlayer.id+".pos"];

					var localTarget = this.v_lerp(myPastPosition, myTargetPosition, timePoint);

					if(this.clientSmoothing){
						var finalPosition = this.v_lerp(this.selfPlayer.pos, localTarget, this.physicsDeltaTime*this.clientSmooth);
						this.selfPlayer.SetPos(finalPosition.x, finalPosition.y, true);
					}
				}else{
//					console.log("2 is ok");
				}
			}
		}
	}

	this.ClientUpdateLocalPosition = function(serverUpdate){
//		renderer.fillText("caca",10,10);
		var message = "";
		if(typeof(serverUpdate) != "undefined"){
			message = "su/";
		}else{
			message = "cu/"
		}
		if(this.clientPrediction){
			var time = (this.localTime - this.selfPlayer.stateTime) / this.physicsDeltaTime;
//			var destination = this.v_lerp(this.selfPlayer.pos, this.selfPlayer.currentState.pos, this.clientSmooth*this.physicsDeltaTime);
			this.selfPlayer.SetPos(this.selfPlayer.currentState.pos.x, this.selfPlayer.currentState.pos.y, true); 
			//if(this.selfPlayer.oldState.pos.x != this.selfPlayer.currentState.pos.x || this.selfPlayer.oldState.pos.y != this.selfPlayer.currentState.pos.y)
				//console.log(message+" pos: "+this.selfPlayer.pos.x+", "+this.selfPlayer.pos.y);
//			this.selfPlayer.SetPos(destination.x, destination.y); 
		}else{
//			var time = (this.localTime - this.selfPlayer.stateTime) / this.physicsDeltaTime;
//			this.selfPlayer.SetPos(this.selfPlayer.currentState.pos.x, this.selfPlayer.currentState.pos.y, true); 
		}
	}

	this.ClientRefreshFPS = function(){
		if(typeof(this.fpsAverageCounter) == 'undefined'){
			this.fpsAverageCounter = 10;
		}

		//updates the fps every 10 frames by calculating the average
		this.fps = 1/this.deltaTime;
		this.fpsAverageAccumulator += this.fps;
		this.fpsAverageCounter++;

		if(this.fpsAverageCounter >= 10){
			this.fpsAverage = this.fpsAverageAccumulator/10;

			this.fpsAverageCounter = 1;
			this.fpsAverageAccumulator = this.fps;
		}
	}

	//we correct the position we predicted by snapping to the net position
	this.ClientNetPredictionCorrection = function(){
		if(this.serverUpdates.length > 0){
			var latestUpdate = this.serverUpdates[this.serverUpdates.length-1];
			var myServerPos = latestUpdate[this.selfPlayer.id+".pos"];
			var myLastServerInput = latestUpdate[this.selfPlayer.id+".inputSeq"];

//			console.log("cu/last server input index: "+myLastServerInput);

			if(myLastServerInput){
				var lastInputSeqIndex = -1;

				for(var i = 0; i < this.selfPlayer.inputs.length; ++i){
					if(this.selfPlayer.inputs[i].sequence == myLastServerInput){
//						console.log("update time: "+latestUpdate["time"]+", pos: "+myServerPos.x+", "+myServerPos.y);
						lastInputSeqIndex = i;
						break;
//						console.log("cu/player sequence indexes: "+this.selfPlayer.inputs[i].sequence)
					}
				}

//				console.log("cu/last index sequence index "+lastInputSeqIndex);

				if(lastInputSeqIndex != -1){
//					console.log("input time and pos: "+this.selfPlayer.inputs[lastInputSeqIndex].time+". Pos: "+this.selfPlayer.inputs[lastInputSeqIndex].pos.x+", "+this.selfPlayer.inputs[lastInputSeqIndex].pos.y);
					var numberToClear = Math.abs(lastInputSeqIndex - (-1));
					this.selfPlayer.inputs.splice(0, numberToClear);

					this.selfPlayer.currentState.pos.x = myServerPos.x;
					this.selfPlayer.currentState.pos.y = myServerPos.y;
					//console.log("su/ net prediction - new currentState pos: "+myServerPos.x+", "+myServerPos.y+", input seq "+ latestUpdate[this.selfPlayer.id+".inputSeq"]+"- on "+latestUpdate['time']+"s");
					this.selfPlayer.lastInputSeq = lastInputSeqIndex;

					this.ClientUpdatePhysics("serverUpdate");
					this.ClientUpdateLocalPosition("serverUpdate");
				}else{
	//				console.log("server update not found")
				}				
			}

		}else{
			return;
		}
	}

	this.ClientOnServerUpdate = function(data){

		this.serverTime = data.time;
		this.clientTime = this.serverTime - (this.netOffset/1000);

		if(this.naiveApproach){
		
			var index = this.selfPlayer.id+".pos";
			this.selfPlayer.SetPos(data[index].x, data[index].y, true);

			console.log("naive approach");

	//		console.log(data[this.selfPlayer.id+'.pos']);

			for(var playerId in this.players){
				if(this.players.hasOwnProperty(playerId)){
					index = playerId+".pos";
	//				console.log("INDEX: "+index);
					this.players[playerId].SetPos(data[index].x, data[index].y, false);
				}
				else continue;
			}
		}else{
			this.serverUpdates.push(data);

			//limit for the updates (in seconds). 60fps*seconds = number of samples
			if(this.serverUpdates.length /*one srvrupdate per frame*/>= (60*this.bufferSize)){
				this.serverUpdates.splice(0, 1); 	//we delete the oldest one
			}

			//if clientTime gets behind the time when the last tick happened, a snap occurs to the last tick
			this.oldestTick = this.serverUpdates[0].time;

			if(this.clientPrediction){
				this.ClientNetPredictionCorrection();
			}else{

			}

	//		console.log(data);
		}
	}

	this.ClientUpdate = function(){
		this.ClientInputHandler();
		if(!this.naiveApproach){
			this.ClientProcessNetUpdates();
		}
		this.ClientUpdateLocalPosition();//using client prediction
		this.ClientRefreshFPS();
	}

	this.MovementVectorFromDirection = function(x, y){

			//console.log("Physics delta time"+this.physicsDeltaTime);

	    return {
//	        x : parseFloat((x * (this.playerSpeed * 0.015)).toFixed(3)),
//	        y : parseFloat((y * (this.playerSpeed * 0.015)).toFixed(3))

	        x : parseFloat((x * (this.playerSpeed * this.physicsDeltaTime)).toFixed(3)),
	        y : parseFloat((y * (this.playerSpeed * this.physicsDeltaTime)).toFixed(3))	        
	    };
	}

	this.ProcessInput = function(player, serverUpdate){
		var message = "";
		if(typeof(serverUpdate) != 'undefined'){
			message = "su/";
		}else{
			message = "cu/";
		}

		var xDir = 0;
		var yDir = 0;
		var il = player.inputs.length;

		if(player.inputs.length > 0){

			for(var i = 0; i < il; ++i){

				if(message == "cu/"){
				//	console.log(message+"inputs "+i+": "+player.inputs[i].inputs);
				}

				if(player.inputs[i].sequence <= player.lastInputSeq) continue;

				var input = player.inputs[i].inputs;

				for(var j = 0; j < input.length; ++j){
					var key = input[j];
					switch(key){
						case "l":
							xDir = -1;
							break;
						case "r":
							xDir = 1;
							break;
						case "d":
							yDir = -1;
							break;
						case "u":
							yDir = 1;
							break;
					}
				}
				if(message == 'cu/'){
//					if(this.selfPlayer.id == player.id){
			//			console.log("pu/ input seq & time: "+player.inputs[i].sequence+", "+player.inputs[i].time);
					var message2;
/*					var err = new Error("pu/ call stack"); 	 
				    Error.stackTraceLimit = 4;
				    console.log(err.stack);*/

//					console.log("pu/ caller:"+arguments.callee.caller.toString());
						if(this.selfPlayer.id == player.id){
							message2 = 'pu/ self input time & seq: ';
						}else{
							message2 = 'pu/ input time & seq of '+i+': ';
						}

						//console.log(message2+player.inputs[i].time+", "+player.inputs[i].sequence);
//					}
				}else{
					//console.log("input time & seq: "+player.inputs[i].sequence+", "+player.inputs[i].time);
				}
			}
		}

//		console.log(message+"Dir: "+xDir+", "+yDir);

		var	direction = this.MovementVectorFromDirection(xDir, yDir);

//		console.log("movement "+direction.x+", "+direction.y);

		if(il > 0){
			player.lastInputSeq = player.inputs[il-1].sequence;	//last sequence on array
			if(message == "su/"){
//				console.log(message+" last input seq "+player.inputs[player.inputs.length-1].sequence);
			}
			player.lastInputTime = player.inputs[il-1].time;	//time of the last sequence
		}
		return (direction);
	}


	this.SetRoom = function(room){
		this.room = gameRoom;
	}

	this.ServerUpdatePhysics = function(){
		for(playerId in this.players){
			if(this.players.hasOwnProperty(playerId)){
				var playerOldPos = this.players[playerId].oldState.pos;
				var playerPos = this.players[playerId].pos;
				playerOldPos.x = playerPos.x;
				playerOldPos.y = playerPos.y;

				var newDir = this.ProcessInput(this.players[playerId], "serverUpdate");

				playerPos.x = this.players[playerId].oldState.pos.x + newDir.x;
				playerPos.y = this.players[playerId].oldState.pos.y + newDir.y;

				if(playerOldPos.x != playerPos.x || playerOldPos.y != playerPos.y){
					//console.log("pos: "+playerPos.x+", "+playerPos.y);
				}

				this.recordPos = {	x: playerPos.x,
									y: playerPos.y 	};

//				console.log("pos: "+playerPos.x.toFixed(3)+", "+playerPos.y.toFixed(3)+", Dir: "+newDir.x+", "+newDir.y);
				this.players[playerId].inputs = [];
			}
			else continue;
		}
	}

	this.ServerDeletePlayer = function(newHost, deletedPlayerId){	//deletes the player
		this.playerCount--;

		this.host = newHost;
		if(this.players[deletedPlayerId]){	//if it was a client
			//delete from the client list
			delete this.players[deletedPlayerId];
		}
	}


	this.ServerUpdate = function(){
		this.serverTime = this.localTime;

		var state = {};
		var playerCounter = 1;

		for(var playerId in this.players){
			if(this.players.hasOwnProperty(playerId)){
				state[playerId+".pos"] = this.players[playerId].pos;
				state[playerId+".inputSeq"] = this.players[playerId].lastInputSeq;

			//	console.log("server time: "+this.serverTime+", pos: "+this.players[playerId].pos.x+", "+this.players[playerId].pos.y);
//				console.log("last input sequence: "+state[playerId+".pos"].x+", "+state[playerId+".pos"].y);
			}
			else continue;
		}

		state["time"] = this.serverTime;

		this.lastState = state;

		for(var playerId in this.players){
			if(this.players.hasOwnProperty(playerId)){
				this.players[playerId].instance.emit('onServerUpdate', this.lastState);
			}
			else continue;
		}
//		console.log("__________________________________________");
	}

	this.ServerInputHandler = function(client, inputCommands, inputTime, inputSequence){
		var playerClient = null; 
		if(client.host){
			playerClient = this.host;
		}else{
			playerClient = this.players[client.userid];			
		}

	//	console.log("Player id "+playerClient.instance.userid+" sended "+inputCommands);

		playerClient.inputs.push({
			inputs 	: inputCommands,
			time 	: inputTime,
			sequence: inputSequence
		});
	}

	this.AddPlayer = function(player, playerId){	//playerId for when player not getting passed (clientside)
		if(this.server){
			this.players[player.userid] = new playerCode(this, player);	
			if(this.playerCount == 0){
				this.host = this.players[player.userid];
				this.players[player.userid].host = true;
			}
		}else{
			console.log("players in array before adding player:"+Object.keys(this.players).length);
			if(this.playerCount == 0){	//creating the self player bc its the first one (will get its id on connection)
				this.selfPlayer = new Player(this, null);
				console.log("Player n"+(this.playerCount+1)+" added");
			}
			else{	//creating rest of players as they join in the players vector
				console.log("added player n"+(this.playerCount+1));
				this.players[playerId] = new Player(this, null);
			}
			console.log("players in array after adding player:"+Object.keys(this.players).length);
		}
		this.playerCount++;
	}

	this.playerSpeed = 15;

	//timers for physics
	this.physicsDeltaTime = 0.0001;
	this.previousPhysicsDeltaTime = new Date().getTime();

	//timers for precision over the net (server and client)
	this.localTime = 0.016; 
	this.localDeltaTime = new Date().getTime();
	this.previousLocalDeltaTime = new Date().getTime();
	this.fpsAverage = 30;

	this.CreatePhysicsSimulation();
	this.CreateTimer();

	if(this.server){
		this.serverTime = 0;
		this.lastState = {};
	}
	else{
		this.AddPlayer(null);

		this.keyboard = new THREEx.KeyboardState();
		this.ClientCreateConfiguration();
		this.ClientConnectToServer();
		this.ClientCreatePingTimer();
		this.serverUpdates = [];
	}
}

if( 'undefined' != typeof global ) {
	module.exports.gameCore = global.GameCore = GameCore;
}