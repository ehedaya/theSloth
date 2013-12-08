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
							self.insertChat(self.simpleResponses[t].response, obj.chatID);
							return true; 
					}
			}
			
			if(text.match(/^##/i)) {
				// Log a note
				obj.track_time = API.getTimeElapsed();
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
							var found_show = false;
							$.each(showlist, function(showdate_index,venue_long) {
								if(showdate_index == showdate) {
									if(venue_long.length > 1) {
										found_show = true;
										self.insertChat("Setlist: http://phish.net/setlists/?d="+showdate+" "+venue_long.length+" shows on "+showdate, obj.chatID);
									} else {
										found_show = true;
										self.insertChat("Setlist: http://phish.net/setlists/?d="+showdate, obj.chatID);
									}
								}
							});
							if(!found_show) {
								self.insertChat("No Phish show on "+showdate, obj.chatID);
							}
						} else {
							self.insertChat("No showdate in "+blob);
						}
					});
				} else if (text.match(/^!pnet:/)) {
                    var pnet_username = escape(text.substr(6));
                    var userid = obj.fromID;
                    var payload = { userid: userid, username: pnet_username };
					$.ajax({
						crossDomain:true,
						type: "GET",
						url: "http://stats.thephish.fm/api/update_pnet.php",
						data: payload,
						success: function(data){
							console.log(data);
							var json = JSON.parse(data);
							self.insertChat(json.response, obj.chatID);
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
										chat_text = chat_text + attendee.name+" ";
										if(attendee_index == attendees.length-1) {
											self.insertChat(chat_text, obj.chatID);								
										}
									});
								}
							});
							if(!found_attendees) {
								var chat_text = "I don't know anyone who attended this show.";
								self.insertChat(chat_text, obj.chatID);
							}
						} else {
							console.warn("Could not parse showdate in "+blob);
						}
					});
   				} else if (text.match(/^!countdown/)) {
					$.ajax({
						crossDomain:true,
						type: "GET",
						url: "http://stats.thephish.fm/api/getCountdown.php",
						success: function(data){
							var json = JSON.parse(data);
							self.insertChat(json.response, obj.chatID);
						}
					});
   				} else if (text.match(/^!(replay|event)/)) {
					$.ajax({
						crossDomain:true,
						type: "GET",
						url: "http://stats.thephish.fm/api/get_next_replay.php",
						success: function(data){
							var json = JSON.parse(data);
							if(json.success) {
								self.insertChat(json.response, obj.chatID);
							} else {
								console.warn("Error in !replay", data);
							}
						}
					});
   				} else if (text.match(/^!song/)) {
   					now_playing = API.getMedia();
   					var showlist_json = localStorage.getItem('showlist');
   					showlist = JSON.parse(showlist_json);
   					var blob = now_playing.author+now_playing.title;
   					self.parseDate(blob, function(showdate) {
   						var message = "Now playing: "+now_playing.author+" "+now_playing.title;
   						if(showdate.length) {
							message +=  " ("+showlist[showdate][0]+")";
   						}
   						self.insertChat(message, obj.chatID);
   					});
   				}

			}
			self.relayEvent("CHAT", obj, 'chat.php');
		});

        API.on(API.DJ_ADVANCE, function(obj){
			self.parsePhishShowdate(function(showdate) {
				self.relayEvent('DJ_ADVANCE', {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore(), "showdate": showdate }, 'now_playing.php');
			});
        });
		
		API.on(API.VOTE_UPDATE, function(obj){
			self.parsePhishShowdate(function(showdate) {
				self.relayEvent('VOTE_UPDATE', {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore(), "showdate": showdate }, 'now_playing.php');
			});
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
 			self.relayEvent("CURATE_UPDATE", obj, 'curate_update.php');
		});
		
		API.on(API.ROOM_SCORE_UPDATE, function(obj){
 			self.relayEvent("ROOM_SCORE_UPDATE", obj, 'room_score_update.php');
		});
		
		API.on(API.VOTE_SKIP, function(obj){
		});
		
		API.on(API.MOD_SKIP, function(obj){
			self.parsePhishShowdate(function(showdate) {
				self.relayEvent('MOD_SKIP', {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore(), "showdate": showdate }, 'now_playing.php');
			});
		});
		
		API.on(API.CHAT_COMMAND, function(obj){
		});
		
		API.on(API.HISTORY_UPDATE, function(obj){
			self.parsePhishShowdate(function(showdate) {
				self.relayEvent('HISTORY_UPDATE', {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getRoomScore(), "showdate": showdate }, 'now_playing.php');
			});
 			self.relayEvent("HISTORY_UPDATE", obj, 'history_update.php');
		});


	},
	parsePhishShowdate: function(callback) {
		var now_playing = API.getMedia();
		var blob = now_playing.author+now_playing.title;
		var showlist_json = localStorage.getItem('showlist');
		var showlist = JSON.parse(showlist_json);
		this.parseDate(blob, function(showdate) {
			if(showdate.length) {
				var found_show = false;
				$.each(showlist, function(showdate_index,venue_long) {
					if(showdate_index == showdate) {
						found_show = true;
						console.log(showdate);
						callback(showdate);
					}
				});
				if(!found_show) {
					console.error("No Phish show on "+showdate);
					callback(false);
				}
			} else {
 				console.info("No showdate parsed in "+blob);
 				callback(false);
			}
		});
	},
	relayEvent: function(type, payload, endpoint) {
		var self = this;
		data = { 
			"type" : type,
			"payload" : payload,
			"from" : API.getUser(),
			"media" : API.getMedia(),
			"current_dj" : API.getDJ(),
			"version" : "0.3.1"
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
			success: function(response){
				console.log(response);
				response = JSON.parse(response);
				
				// Attempt to speak the currently playing track if it hasn't been announced
				if(endpoint == 'now_playing.php') {
					var message = "Now playing: "+data.media.author+" "+data.media.title;
					if(payload.showdate.length) {
						var showlist_json = localStorage.getItem('showlist');
						var showlist = JSON.parse(showlist_json);
						message +=  " ("+showlist[payload.showdate][0]+")";
					}
//					console.log(message, response.media_hash);
					self.insertChat(message, response.media_hash);
				}
			}
		});
	},
	insertChat: function(message, chatID) {
		var user = API.getUser();
		$.ajax({
			crossDomain:true,
			type: "GET",
			data: {event_hash: chatID, userid: user.id},
			url: "http://stats.thephish.fm/api/getReplyPermission.php",
			success: function(response){
				json = JSON.parse(response);
				if(json.success && json.permission) {
					API.sendChat(message);
				}
			},
			error: function(response) {
				error.log("Error requesting reply permission");
			}
		});
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
                { trigger: new RegExp('^!tips$','i'), response: 'http://thephish.fm/tips/'},
                { trigger: new RegExp('^!(about|commands|sloth)$','i'), response: 'https://github.com/ehedaya/theSloth/wiki/Commands'},                
                { trigger: new RegExp('^!(ext|extension)$','i'), response: 'http://bit.ly/theSlothExt'},
                { trigger: new RegExp('^!(bugs|bug|feature|features)$','i'), response: 'https://github.com/ehedaya/theSloth/issues/new/'},
                { trigger: new RegExp('^!stats$','i'), response: 'http://stats.thephish.fm'},
                { trigger: new RegExp('^!gifs$','i'), response: 'http://tinyurl.com/ttgifs'},
                { trigger: new RegExp('^!deg$','i'), response: 'http://tinyurl.com/phishdeg'},
                { trigger: new RegExp('^!m[e]{1,2}[t]{1,2}up[s]{0,1}$','i'), response: 'http://thephish.fm/meettups'},
                { trigger: new RegExp('^!attendance$', 'i'), response: 'http://thephish.fm/attendance'},
                { trigger: new RegExp('^!tickets$', 'i'), response: 'http://thephish.fm/tickets'},
                { trigger: new RegExp('^!tease$', 'i'), response: 'http://thephish.fm/tease'},
                { trigger: new RegExp('^!draft$', 'i'), response: 'http://thephish.fm/draft'},
                { trigger: new RegExp('^!(ss|secretsanta|secrettsantta|secrettsanta|secretsantta)$', 'i'), response: 'http://thephish.fm/secrettstantta'},
                { trigger: new RegExp('^!replayroom$', 'i'), response: 'http://thephish.fm/replayroom'}
                
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
			console.warn('API not connected.  Retrying....');
		setTimeout(initialize, 1000);
	}
}

initialize();