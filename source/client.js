var game = {};

window.addEventListener("keydown", function(e) {
    // space and arrow keys
    if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);

window.onload = function(){
	console.log("Rendering");
    game = new GameCore();
    game.Update(new Date().getTime());
}
