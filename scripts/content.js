TheSloth = function() {
	this.setupEvents();
	// this.pacify();
}
TheSloth.prototype = {
	constructor:  TheSloth,
	setupEvents: function() {
		console.log("Setting up events", this);
		var self = this;
		try {
			window.addEventListener("message", function(data) { 
				//console.log("Generic event", data); 
			});
		} catch(e) {
			console.warn("Error ", data);
		}
		
		// Set up events
		API.on(API.CHAT, function(obj){
//  			self.relayEvent("CHAT", { "media" : API.getMedia(), "chat": obj}, 'chat.php');
 			self.relayEvent("NOW_PLAYING", {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore()}, 'now_playing.php');
			self.relayEvent("CHAT", obj, 'chat.php');
		});

        API.on(API.DJ_ADVANCE, function(obj){
 			self.relayEvent("NOW_PLAYING", {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore()}, 'now_playing.php');
// 			self.relayEvent("DJ_ADVANCE", obj, 'scrobble.php');
        });
		API.on(API.VOTE_UPDATE, function(obj){
			//self.relayEvent("VOTE_UPDATE", {"vote": obj, "now_playing": API.getMedia()}, 'vote_update.php');
 			self.relayEvent("NOW_PLAYING", {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore()}, 'now_playing.php');
 			self.relayEvent("VOTE_UPDATE", obj, 'vote_update.php');
		});
		API.on(API.WAIT_LIST_UPDATE, function(obj){
			console.log(obj);
// 			self.relayEvent("WAIT_LIST_UPDATE", obj, 'scrobble.php');
		});
		API.on(API.USER_JOIN, function(obj){
			self.relayEvent("USER_JOIN", obj, 'user_arrival_departure.php')
		});
		API.on(API.USER_LEAVE, function(obj){
			console.log('user_leave', obj);
			self.relayEvent("USER_LEAVE", obj, 'user_arrival_departure.php')
		});
		API.on(API.USER_SKIP, function(obj){
			console.log(obj);
// 			self.relayEvent("USER_SKIP", obj, 'scrobble.php');
		});
		API.on(API.USER_FAN, function(obj){
			console.log(obj);
// 			self.relayEvent("USER_FAN", obj, 'scrobble.php');
		});
		API.on(API.DJ_UPDATE, function(obj){
			console.log(obj);
// 			self.relayEvent("DJ_UPDATE", obj, 'scrobble.php');
		});
		API.on(API.CURATE_UPDATE, function(obj){
			console.log(obj);
// 			self.relayEvent("CURATE_UPDATE", obj, 'scrobble.php');
		});
		API.on(API.ROOM_SCORE_UPDATE, function(obj){
// 			self.relayEvent("ROOM_SCORE_UPDATE", obj, 'scrobble.php');
 			self.relayEvent("ROOM_SCORE_UPDATE", obj, 'room_score_update.php');
// 			self.relayEvent("NOW_PLAYING", {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore()}, 'now_playing.php');
		});
		API.on(API.VOTE_SKIP, function(obj){
// 			self.relayEvent("VOTE_SKIP", obj, 'scrobble.php');
		});
		API.on(API.MOD_SKIP, function(obj){
// 			self.relayEvent("MOD_SKIP", obj, 'scrobble.php');
		});
		API.on(API.CHAT_COMMAND, function(obj){
// 			self.relayEvent("CHAT_COMMAND", obj, 'scrobble.php');
		});
		API.on(API.HISTORY_UPDATE, function(obj){
// 			self.relayEvent("HISTORY_UPDATE", obj, 'history_update.php');
		});


	},
	relayEvent: function(type, payload, endpoint) {
		data = { 
			"type" : type,
			"payload" : payload,
			"from" : API.getUser(),
			"media" : API.getMedia(),
			"current_dj" : API.getDJ()
		};
		$.ajax({
			crossDomain:true,
			type: "POST",
			url: "http://staging.stats.thephish.fm/api/" + endpoint,
			data: data,
			success: function(data){
				console.log(data);
			}
		});
	},
	pacify: function() {
//		console.log("Pacifying");
// 		$('body').css('background-image', 'url(http://i.imgur.com/X8XJV03.png )') ;
// 		$("#playback .background img").remove();	
	}
}

// Initialize
	setTimeout(function() {
		if(API) {
			console.log('API connected.');
			theSloth = new TheSloth();
		} else {
			console.log('API not connected.  Retrying....');
		}
		}, 1000);
