TheSloth = function() {
	this.setupEvents();
	this.syncShowCache();
	this.syncShowAttendees();
	// this.pacify();
}
TheSloth.prototype = {
	constructor:  TheSloth,
	setupEvents: function() {
		console.log("Setting up events");
		var self = this;
		
		// Set up events
		API.on(API.CHAT, function(obj){
			var text = obj.message;
			
			for(t=0;t<self.simpleResponses.length;t++) {
					if (text.match(self.simpleResponses[t].trigger)) {
							self.insertChat(self.simpleResponses[t].response);
							return true; 
					}
			}
			
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
							var showlist_json = localStorage.getItem('showlist');
							var showlist = JSON.parse(showlist_json);
							$.each(showlist, function(showdate_index,venue_long) {
								if(showdate_index == showdate) {
									if(venue_long.length > 1) {
										self.insertChat("Setlist: <a href='http://phish.net/setlists/?d="+showdate+"' style='color:#009cdd' target='_blank'>"+venue_long.length+" shows on "+showdate+"</a>");
									} else {
										self.insertChat("Setlist: <a href='http://phish.net/setlists/?d="+showdate+"' style='color:#009cdd' target='_blank'>"+venue_long[0]+"</a>");
									}
								}
							});
						} else {
							console.log("Could not parse showdate in "+blob);
						}
					});
				} else if (text.match(/^!pnet:/)) {
                    var pnet_username = escape(text.substr(6));
                    var userid = obj.fromID;
                    var payload = { userid: userid, username: pnet_username };
                    console.log(payload);
					$.ajax({
						crossDomain:true,
						type: "GET",
						url: "http://stats.thephish.fm/api/update_pnet.php",
						data: payload,
						success: function(data){
							console.log(data);
							var json = JSON.parse(data);
							self.insertChat(json.response);
							self.syncShowAttendees();
						}
					});
   				} else if (text.match(/^!who(else)?/)) {
					var now_playing = API.getMedia();
					var blob = now_playing.author+now_playing.title;
					self.parseDate(blob, function(showdate) {
						if(showdate.length) {
							var show_attendee_json = localStorage.getItem('show_attendees');
							var show_attendees = JSON.parse(show_attendee_json);
							var found_attendees = false;
							$.each(show_attendees, function(showdate_index,attendees) {
								if(showdate_index == showdate) {
									found_attendees = true;
									var chat_text = "Show attendees: ";
									$.each(attendees, function(attendee_index, attendee) {
										console.log(attendee, attendee.url, attendee.name);
										chat_text = chat_text + "<a href='"+attendee.url+"' target='_blank' style='color:#009cdd'>"+attendee.name+"</a>, ";
										if(attendee_index == attendees.length-1) {
											self.insertChat(chat_text);								
										}
									});
								}
							});
							if(!found_attendees) {
								var chat_text = "I don't know anyone who attended this show.";
								self.insertChat(chat_text);
							}
						} else {
							console.log("Could not parse showdate in "+blob);
						}
					});
   				} else if (text.match(/^!countdown?/)) {
					$.ajax({
						crossDomain:true,
						type: "GET",
						url: "http://stats.thephish.fm/api/getCountdown.php",
						success: function(data){
							var json = JSON.parse(data);
							self.insertChat(json.response);
						}
					});
   				}

			}
			self.relayEvent("CHAT", obj, 'chat.php');
		});

        API.on(API.DJ_ADVANCE, function(obj){
 			self.relayEvent("DJ_ADVANCE", {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore()}, 'now_playing.php');
        });
		
		API.on(API.VOTE_UPDATE, function(obj){
 			self.relayEvent("NOW_PLAYING", {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore()}, 'now_playing.php');
 			self.relayEvent("VOTE_UPDATE", obj, 'vote_update.php');
		});
		
		API.on(API.WAIT_LIST_UPDATE, function(obj){
		});
		
		API.on(API.USER_JOIN, function(obj){
			self.relayEvent("USER_JOIN", obj, 'user_arrival_departure.php')
		});
		
		API.on(API.USER_LEAVE, function(obj){
			self.relayEvent("USER_LEAVE", obj, 'user_arrival_departure.php')
		});
		
		API.on(API.USER_SKIP, function(obj){
		});
		
		API.on(API.USER_FAN, function(obj){
		});
		
		API.on(API.DJ_UPDATE, function(obj){
		});
		
		API.on(API.CURATE_UPDATE, function(obj){
		});
		
		API.on(API.ROOM_SCORE_UPDATE, function(obj){
 			self.relayEvent("ROOM_SCORE_UPDATE", obj, 'room_score_update.php');
		});
		
		API.on(API.VOTE_SKIP, function(obj){
		});
		
		API.on(API.MOD_SKIP, function(obj){
 			self.relayEvent("MOD_SKIP", {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore()}, 'now_playing.php');
		});
		
		API.on(API.CHAT_COMMAND, function(obj){
		});
		
		API.on(API.HISTORY_UPDATE, function(obj){
 			self.relayEvent("NOW_PLAYING", {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore()}, 'now_playing.php');
 			self.relayEvent("HISTORY_UPDATE", obj, 'history_update.php');
		});


	},
	relayEvent: function(type, payload, endpoint) {
		data = { 
			"type" : type,
			"payload" : payload,
			"from" : API.getUser(),
			"media" : API.getMedia(),
			"current_dj" : API.getDJ(),
			"version" : "0.1.2"
		};
		if (type == 'USER_JOIN') {
			// Allow all users to relay this event
		} else if(data.from.permission < 2 && data.from.id != '522e0fb696fba524e5174326') {
			// Only room moderators can relay API data
			return false;
		}
		$.ajax({
			crossDomain:true,
			type: "POST",
			url: "http://stats.thephish.fm/api/" + endpoint,
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
	},
	simpleResponses: [
                { trigger: new RegExp('^!tips$','i'), response: '<a href="http://thephish.fm/tips/" target="_blank" style="color:#009cdd">http://thephish.fm/tips/</a>'},
                { trigger: new RegExp('^!(ext|extension|sloth)$','i'), response: '<a href="http://bit.ly/theSlothExt" target="_blank"  style="color:#009cdd">http://bit.ly/theSlothExt</a>'},
                { trigger: new RegExp('^!(bugs|bug|feature|features)$','i'), response: '<a href="https://github.com/ehedaya/theSloth/issues/new/" target="_blank"  style="color:#009cdd">https://github.com/ehedaya/theSloth/issues/new/</a>'},
                { trigger: new RegExp('^!stats$','i'), response: '<a href="http://stats.thephish.fm" target="_blank" style="color:#009cdd">http://stats.thephish.fm</a>'},
                { trigger: new RegExp('^!gifs$','i'), response: '<a href="http://tinyurl.com/ttgifs" target="_blank" style="color:#009cdd">http://tinyurl.com/ttgifs</a>'},
                { trigger: new RegExp('^!deg$','i'), response: '<a href="http://tinyurl.com/phishdeg" target="_blank" style="color:#009cdd">http://tinyurl.com/phishdeg</a>'},
                { trigger: new RegExp('^!m[e]{1,2}[t]{1,2}up[s]{0,1}$','i'), response: '<a href="http://thephish.fm/meettups" target="_blank" style="color:#009cdd">http://thephish.fm/meettups</a>'},
                { trigger: new RegExp('^!attendance$', 'i'), response: '<a href="http://thephish.fm/attendance" target="_blank" style="color:#009cdd">http://thephish.fm/attendance</a>'},
                { trigger: new RegExp('^!tickets$', 'i'), response: '<a href="http://thephish.fm/tickets" target="_blank" style="color:#009cdd">http://thephish.fm/tickets</a>'},
                { trigger: new RegExp('^!tease$', 'i'), response: '<a href="http://thephish.fm/tease" target="_blank" style="color:#009cdd">http://thephish.fm/tease</a>'},
                { trigger: new RegExp('^!draft$', 'i'), response: '<a href="http://thephish.fm/draft" target="_blank" style="color:#009cdd">http://thephish.fm/draft</a>'},
                { trigger: new RegExp('^!guest$', 'i'), response: '<a href="http://thephish.fm/guest" target="_blank" style="color:#009cdd">http://thephish.fm/guest</a>'},
                { trigger: new RegExp('^!(ss|secretsanta|secrettsantta|secrettsanta|secretsantta)$', 'i'), response: '<a href="http://thephish.fm/secrettstantta" target="_blank" style="color:#009cdd">http://thephish.fm/secrettstantta</a>'}
	],
	syncShowCache: function() {
		$.ajax({
			crossDomain:true,
			type: "GET",
			url: "http://stats.thephish.fm/api/getAllShows.php",
			success: function(response){
				console.log("Refreshed local show list");
				localStorage.removeItem('showlist');
				localStorage.setItem('showlist', response);
			},
			error: function(response) {
				error.log("Error retrieving show cache");
			}
		});
	},
	syncShowAttendees: function() {
		$.ajax({
			crossDomain:true,
			type: "GET",
			url: "http://stats.thephish.fm/api/getUsersAtShow.php",
			success: function(response){
				console.log("Refreshed show attendee list");
				localStorage.removeItem('show_attendees');
				localStorage.setItem('show_attendees', response);
			},
			error: function(response) {
				error.log("Error retrieving show cache");
			}
		});
	}
}

// Wait for the PlugAPI to be available before instantiating
function initialize() {
	if(typeof API != "undefined") {
			console.log('API connected.');
			theSloth = new TheSloth();
	} else {
			console.log('API not connected.  Retrying....');
		setTimeout(initialize, 1000);
	}
}

initialize();