/**
 * Recognizer Application
 * 
 * This file contains the application code, including setting up, RTC messaging and actual game display 
 */

"use strict";

/**
 * Generate authentication code for the peer-to-peer RTC
 */
function generateOneTimePad(length) {
	for(var c = ''; c.length < 40;)
		c += Math.random().toString(16).substr(2, 1);
	return c; // we can do that because c is hoisted out of the loop
}

/**
 * Parse the query string and extract the value of the requested param name
 * @param name The query string parameter to search for
 * @returns The first decoded query string value with the requested name, or undefined
 */
function getQueryStringParam(name) {
	return (window.location.search.replace(/^\?/,'').split('&').map(function(comp){
		return comp.split('=').map(function(val){
			return decodeURIComponent(val);
		});
	}).find(function(kv){
		return kv[0] == name;
	}) || [])[1];
}

function initPubNub(errHandler) {
	return PUBNUB.init({
		publish_key: 'pub-c-a92702b5-1b49-4964-81c4-39d58adf19e3',
		subscribe_key: 'sub-c-3e8bc75c-dc8f-11e5-9c7b-02ee2ddab7fe',
		error: errHandler
	});
}

/**
 * "server" side of the communication channel - this is where the display is connected
 * @param code Code to authenticate the manager with
 * @return {@GameServer}
 */
function GameServer(code) {
	this.pubnub = initPubNub(this.errorHandler.bind(this, 'pubnub.server.reg'))
	this.pubnub.subscribe({
		channel: 'geekcoil.recognizer.' + code,
		message: this.handleMessage.bind(this),
		error: this.errorHandler.bind(this, 'pubnub.subscribe'),
	});
	return this;
}

GameServer.prototype.errorHandler = function(location, error) {
	console.log("Error from",location,":", error);
};

/**
 * Handle message from manager
 * @param message message object
 */
GameServer.prototype.handleMessage = function(message) {
	switch (message.action) {
	case 'connect':
		if (this.onconnect)
			this.onconnect();
		break;
	case 'start':
		if (this.onstart)
			this.onstart(message.src);
		break;
	case 'pause':
		if (this.onpause)
			this.onpause();
		break;
	case 'resume':
		if (this.onresume)
			this.onresume();
		break;
	case 'reset':
		if (this.onreset)
			this.onreset();
		break;
	case 'skip':
		if (this.onskip)
			this.onskip();
		break;
	}
}

/**
 * "client side of the communication channel - this is where the management screen is connected
 * @param code Access code for the server
 * @return {@GameManager}
 */
function GameManager(code) {
	this.pubnub = initPubNub(this.errorHandler.bind(this, 'pubnub.manager.reg'));
	this.pubnubChannel = 'geekcoil.recognizer.' + code;
	return this;
}

GameManager.prototype.errorHandler = function(location, error) {
	console.log("Error from",location,":", error);
};

/**
 * Notify the display that we are connected
 */
GameManager.prototype.connect = function() {
	this.pubnub.publish({
		channel: this.pubnubChannel,
		message: { action: 'connect' },
		callback : function(m){ console.log(m); }
	});
};

/**
 * Start a pattern recognition
 * @param image path to image to animate on the display
 */
GameManager.prototype.start = function(image) {
	this.pubnub.publish({
		channel: this.pubnubChannel,
		message: { action: 'start', src: image },
		callback : function(m){ console.log(m); }
	});
};

/**
 * Pause the pattern recognition
 */
GameManager.prototype.pause = function() {
	this.pubnub.publish({
		channel: this.pubnubChannel,
		message: { action: 'pause' },
		callback : function(m){ console.log(m); }
	});
};

/**
 * Resume the pattern recognition
 */
GameManager.prototype.resume = function() {
	this.pubnub.publish({
		channel: this.pubnubChannel,
		message: { action: 'resume' },
		callback : function(m){ console.log(m); }
	});
};

GameManager.prototype.reset = function() {
	this.pubnub.publish({
		channel: this.pubnubChannel,
		message: { action: 'reset' },
		callback : function(m){ console.log(m); }
	});
};

GameManager.prototype.skip = function() {
	this.pubnub.publish({
		channel: this.pubnubChannel,
		message: { action: 'skip' },
		callback : function(m){ console.log(m); }
	});
};

/**
 * Main control mechanis, including setting up screens
 * 
 * @returns {@G}
 */
function GameControl() {
	this.channelCode = this.getManagerCode();
	if (this.channelCode) {
		// setup manager screen
		this.conn = new GameManager(this.channelCode);
		this.loadManager();
		window.setTimeout((function(){
			this.conn.connect();
		}).bind(this), 4);
	} else {
		// show intro and wait for manager
		if (!(this.channelCode = getQueryStringParam('force')))
			this.channelCode = generateOneTimePad(40);
		this.conn = new GameServer(this.channelCode)
		this.showIntro(this.channelCode);
	}
	return this;
}

/**
 * Look up the manager's code, if this is the manager device
 * @returns Manager code if this is the manager device, undefined otherwse
 */
GameControl.prototype.getManagerCode = function() {
	return getQueryStringParam('manage');
};

/**
 * Load the list of available patterns and start the UI
 */
GameControl.prototype.loadManager = function() {
	$('#manager #play-button').click(this.managerPlayPressed.bind(this));
	$('#manager #reset-button').click(this.managerResetPressed.bind(this));
	$('#manager #pause-button').click(this.managerPausePressed.bind(this));
	$('#manager #ff-button').click(this.managerFastForwardPressed.bind(this))
	jQuery.getJSON('/patterns.json', (function(data) {
		this.patterns = data;
		this.renderPatternList(this.showManager.bind(this));
	}).bind(this));
};

GameControl.prototype.renderPatternList = function(next) {
	$('#pattern-list').append($('<div>').attr('class','pattern')
			.append($('<img>').attr('src','images/dice.png'))
			.append($('<p>').append("Random!")).click(this.startRandomPlay.bind(this))
	);
	for (var name in this.patterns) {
		$('#pattern-list').append($('<div>').attr('class','pattern')
				.append($('<img>').attr('src', this.getImagePath(name)))
				.append($('<p>').append(name)).click(this.startPlay.bind(this,name))
				);
	}
	next();
};

/**
 * Compose a path to the image for the named pattern
 * @param name Name of the pattern to lookup
 * @returns {String} relative path to the pattern's image
 */
GameControl.prototype.getImagePath = function(name) {
	return 'images/' + this.patterns[name] + '.png';
};

/**
 * Show the pattern list
 */
GameControl.prototype.showManager = function() {
	$('#manager').show(0, (function() {
		$('#manager #gameplay').hide(0);
		$('#pattern-list').show(0);
	}).bind(this));
};

/**
 * Start a pattern at random
 */
GameControl.prototype.startRandomPlay = function() {
	var names = Object.keys(this.patterns);
	this.startPlay(names[Math.floor(Math.random() * names.length)]);
};

/**
 * Start a game with the selected pattern
 * @param name Name of the pattern (key in the pattern list)
 */
GameControl.prototype.startPlay = function(name) {
	$('#manager #pattern-list').hide(0,(function(){
		$('#manager #gameplay').show((function(){
			this.showGameplay(name);
		}).bind(this));
	}).bind(this));
};

/**
 * Present the game manager screen and hook up its controls
 */
GameControl.prototype.showGameplay = function(name) {
	this.playing = false;
	this.currentPattern = name;
	$('#manager #title').html(name);
	$('#manager #play-button').show(0);
	$('#manager').slideDown(2000);
};

GameControl.prototype.managerPausePressed = function(){
	this.conn.pause();
	$('#manager #pause-button').hide(0,function(){
		$('#manager #play-button').show(0);
		$('#manager #ff-button').show(0);
	});
};

GameControl.prototype.managerResetPressed = function() {
	this.conn.reset();
	this.currentPattern = null;
	this.playing = false;
	$('#manager #play-button').hide(0);
	$('#manager #pause-button').hide(0);
	$('#manager #ff-button').hide(0);
	$('#manager #reset-button').hide(0,this.showManager.bind(this));
};

GameControl.prototype.managerFastForwardPressed = function() {
	$('#manager #play-button').hide(0);
	$('#manager #pause-button').hide(0);
	$('#manager #ff-button').hide(0);
	this.conn.skip();
};

GameControl.prototype.managerPlayPressed = function() {
	$('#manager #ff-button').hide(0);
	if (this.playing) {
		this.conn.resume();
	} else {
		console.log("Starting a game using",this.currentPattern);
		this.conn.start(this.getImagePath(this.currentPattern));
		this.playing = true;
		$('#manager #reset-button').show(0);
	}
	$('#manager #play-button').hide(0,function(){
		$('#manager #pause-button').show(0);
	});
};

/**
 * Present the intro screen on the display client
 * @param code Access code for the display
 */
GameControl.prototype.showIntro = function(code) {
	var url = window.location.protocol + '//' + window.location.host + window.location.pathname + '?manage=' + encodeURIComponent(code);
	new QRCode(document.getElementById('startcode'), {
		text: url,
		width: 256,
		height: 256,
		colorDark : "#000000",
		colorLight : "#ffffff",
		correctLevel : QRCode.CorrectLevel.H
	});
	this.conn.onconnect = this.startGame.bind(this);
	$('#intro').slideDown(2800);
};

/**
 * Start the game's display
 */
GameControl.prototype.startGame = function() {
	$('#intro').hide();
	$('#game').show();
	var canvas = $('#pattern')[0],
		size = parseInt($( window ).height() * 0.85);
	this.ctx = canvas.getContext("2d");
	this.ctx.canvas.width = size;
	this.ctx.canvas.height = size;
	// turn off image aliasing
	this.ctx.msImageSmoothingEnabled = false;
	this.ctx.mozImageSmoothingEnabled = false;
	this.ctx.webkitImageSmoothingEnabled = false;
	this.ctx.imageSmoothingEnabled = false;
	
	this.conn.onstart = this.startPattern.bind(this);
	this.conn.onreset = this.resetGame.bind(this);
	this.conn.onskip = this.skipToTheEnd.bind(this);
};

GameControl.prototype.startPattern = function(image) {
	this.game = new Game(this.ctx, image);
	this.conn.onpause = this.game.pause.bind(this.game); 
	this.conn.onresume = this.game.start.bind(this.game);
};

GameControl.prototype.resetGame = function() {
	if (this.game) {
		this.game.reset();
		this.game = null;
	}
	this.conn.onpause = null;
	this.conn.onresumt = null;
};

GameControl.prototype.skipToTheEnd = function() {
	if(this.game) {
		this.game.skipToTheEnd();
	}
};

/**
 * Game display management class
 * @param context Context of canvas used to draw the recognizer patterns
 * @returns Game object
 */
function Game(context, imgsrc) {
	this.current_size = 6;
	this.animation_speed = 1250; // interframe delay in ms 
	this.ctx = context;
	this.width = this.ctx.canvas.width;
	this.height = this.ctx.canvas.height;
	this.pausing = false;
	this.srcimg = new Image();
	this.srcimg.src = imgsrc;
	$(this.srcimg).load(this.start.bind(this));
	return this;
};

Game.prototype.reset = function() {
	this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
	this.pausing = true;
	this.current_size = 6;
};

Game.prototype.skipToTheEnd = function() {
	this.current_size = this.width;
	this.pausing = false;
	this.redraw();
	this.pausing = true;
};

Game.prototype.pause = function() {
	this.pausing = true;
};

/**
 * Start to render patterns periodically
 */
Game.prototype.start = function(){
	this.pausing = false;
	window.setTimeout(this.redraw.bind(this), this.animation_speed);
};

/**
 * Draw the pattern on to the canvas, handle pausing and setting up
 * the next frame of the animation
 */
Game.prototype.redraw = function() {
	if (this.pausing)
		return;
	console.log("Drawing at " + parseInt(this.current_size / this.width * 100) + '%');
	this.ctx.drawImage(this.srcimg, 0, 0, this.current_size, this.current_size);
	this.ctx.drawImage(this.ctx.canvas, 0, 0, this.current_size, this.current_size, 0, 0, this.width, this.height);
	this.current_size = this.current_size + 2;
	if (this.current_size < this.width && !this.pausing) 
		this.start();
};

// start the application
$(function(){
	window.gameControl = new GameControl();
});
