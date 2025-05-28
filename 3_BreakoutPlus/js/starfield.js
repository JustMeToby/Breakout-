/*
	Starfield lets you take a div and turn it into a starfield.

*/

//	Define the starfield class.
function Starfield() {
	this.fps = 60;
	this.canvas = null;
	this.width = '650';
	this.height = '450';
	this.minVelocity = 125;
	this.maxVelocity = 550;
	this.stars = 150;
	this.intervalId = 0;
}

//	The main function - initialises the starfield.
Starfield.prototype.initialise = function(div) {
	var self = this;

	//	Store the div.
	this.containerDiv = div;
	self.width = '650';
	self.height = '450';

	window.addEventListener('resize', function resize(event) {
		self.width = '650';
		self.height = '450';
		self.canvas.width = '650';
		self.canvas.height = '450';
		self.draw();
	});

	//	Create the canvas.
	var canvas = document.createElement('canvas');
	div.appendChild(canvas);
	this.canvas = canvas;
	this.canvas.width = '650';
	this.canvas.height = '450';
};

Starfield.prototype.start = function() {

	//	Create the stars.
	var stars = [];
	for(var i=0; i<this.stars; i++) {
		stars[i] = new Star(Math.random()*this.width, Math.random()*this.height, Math.random()*3+1,
		 (Math.random()*(this.maxVelocity - this.minVelocity))+this.minVelocity);
	}
	this.stars = stars;

	var self = this;
	//	Start the timer.
	this.intervalId = setInterval(function() {
		self.update();
		self.draw();	
	}, 1000 / this.fps);
};

Starfield.prototype.stop = function() {
	clearInterval(this.intervalId);
};

Starfield.prototype.update = function() {
	var dt = 1 / this.fps;

	for(var i=0; i<this.stars.length; i++) {
		var star = this.stars[i];
		star.y += dt * star.velocity;
		//	If the star has moved from the bottom of the screen, spawn it at the top.
		if(star.y > this.height) {
			this.stars[i] = new Star(Math.random()*this.width, 0, Math.random()*3+1, 
		 	(Math.random()*(this.maxVelocity - this.minVelocity))+this.minVelocity);
		}
	}
};

Starfield.prototype.draw = function() {

	//	Get the drawing context.
	var ctx = this.canvas.getContext("2d");

	//	Draw the background.
 	ctx.fillStyle = '#000000';
	ctx.fillRect(0, 0, this.width, this.height);

	//	Draw stars.
	ctx.fillStyle = '#ffffff';
	for(var i=0; i<this.stars.length;i++) {
		var star = this.stars[i];
		ctx.fillRect(star.x, star.y, star.size, star.size);
	}
};

function Star(x, y, size, velocity) {
	this.x = x;
	this.y = y; 
	this.size = size;
	this.velocity = velocity;
}
