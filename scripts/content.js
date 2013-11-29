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
			var text = obj.message;
			
			if(text.match(/^##/i)) {
				// Log a note
				self.relayEvent("CHAT", obj, 'chat.php');
			} else if (text.match(/^!/i)) {
				// Chat command
				if(text.match(/^!setlist/i)) {
					// Fetch setlist information and insert into chat
					var now_playing = API.getMedia();
					var blob = now_playing.author+now_playing.title;
					self.parseDate(blob, function(showdate) {
						if(showdate.length) {
							$.ajax({
								crossDomain:true,
								type: "GET",
								url: "http://staging.stats.thephish.fm/api/getShow.php",
								data: { date : showdate },
								success: function(data){
									json = JSON.parse(data);
									console.log(json);
									if(json.success && json[0]) {
										self.insertChat("Setlist: <a href='http://phish.net/setlists/?d="+json[0].showdate+"' style='color:#009cdd' target='_blank'>"+json[0].venue_long+"</a>");
									} else {
										self.insertChat(json.reason);
									}
								}
							});
						}
					});
				}
			}
 			self.relayEvent("NOW_PLAYING", {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore()}, 'now_playing.php');
			self.relayEvent("CHAT", obj, 'chat.php');
		});

        API.on(API.DJ_ADVANCE, function(obj){
 			self.relayEvent("NOW_PLAYING", {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore()}, 'now_playing.php');
        });
		API.on(API.VOTE_UPDATE, function(obj){
			//self.relayEvent("VOTE_UPDATE", {"vote": obj, "now_playing": API.getMedia()}, 'vote_update.php');
 			self.relayEvent("NOW_PLAYING", {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore()}, 'now_playing.php');
 			self.relayEvent("VOTE_UPDATE", obj, 'vote_update.php');
		});
		API.on(API.WAIT_LIST_UPDATE, function(obj){
			console.log(obj);
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
		});
		API.on(API.USER_FAN, function(obj){
			console.log(obj);
		});
		API.on(API.DJ_UPDATE, function(obj){
			console.log(obj);
		});
		API.on(API.CURATE_UPDATE, function(obj){
			console.log(obj);
		});
		API.on(API.ROOM_SCORE_UPDATE, function(obj){
 			self.relayEvent("ROOM_SCORE_UPDATE", obj, 'room_score_update.php');
		});
		API.on(API.VOTE_SKIP, function(obj){
		});
		API.on(API.MOD_SKIP, function(obj){
		});
		API.on(API.CHAT_COMMAND, function(obj){
		});
		API.on(API.HISTORY_UPDATE, function(obj){
 			self.relayEvent("HISTORY_UPDATE", obj, 'history_update.php');
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
	},
	insertChat: function(message) {
		$('#chat-messages').append('<div class="message">'+message+'</div>');
	},
	parseDate: function(blob, callback) {
        var r = /[0-9]{1,4}[\-\/\s\.\\]{1,2}[0-9]{1,2}[\-\/\s\.\\]{1,2}[0-9]{1,4}/;
        var showdate = blob.match(r); 
        if (showdate) {
                var d = Date.parse(showdate[0]);
                if (d) {
                        var d2 = d.toString('yyyy-MM-dd');
                        callback(d2);
                } else {
                        callback(false);
                }
        }  else {
                callback(false);
        }
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
