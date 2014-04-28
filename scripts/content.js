TheSloth = function() {
	this.setupEvents();
	this.syncShowCache();
	this.syncShowAttendees();
	this.fetchSimpleResponses();
}
TheSloth.prototype = {
	constructor:  TheSloth,
	setupEvents: function() {
		var self = this;
		self.logger("Setting up events");
		
		// Set up events
		API.on(API.CHAT, function(obj){
			var text = obj.message;
			console.log(obj);
			
			for(t=0;t<self.simpleResponses.length;t++) {
				if (text.match(self.simpleResponses[t].trigger)) {
					self.insertChat(self.simpleResponses[t].response, obj);
					return true; 
				}
			}
			
			if(text.match(/^##/i)) {
				// Log a note
				obj.track_time = API.getTimeElapsed();
				self.relayEvent("CHAT", obj, 'chat.php');
			} else if (text.match(/^!/i)) {
				// Chat command
				if(text.match(/^!setlist$/i)) {
					self.logger('Responding to !setlist');
					// Fetch setlist information and insert into chat
					self.parsePhishShowdate(function(showdate) {
						var showlist_json = localStorage.getItem('showlist');
						var showlist = JSON.parse(showlist_json);
						if(showdate) {
							if(showlist[showdate].length > 1) {
								self.insertChat("Setlist: http://phish.net/setlists/?d="+showdate+" "+showlist[showdate].length+" shows on "+showdate, obj);
							} else {
								self.insertChat("Setlist: http://phish.net/setlists/?d="+showdate+" ("+showlist[showdate][0]+")", obj);
							}
						} else {
							self.logger("Did not return showdate", showdate);
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
							self.logger(data);
							var json = JSON.parse(data);
							self.insertChat(json.response, obj);
							self.syncShowAttendees();
						}
					});
   				} else if (text.match(/^!who(else)?/)) {
					self.parsePhishShowdate(function(showdate) {
						var show_attendee_json = localStorage.getItem('show_attendees');
						var show_attendees = JSON.parse(show_attendee_json);
						if(show_attendees[showdate] && show_attendees[showdate].length) {
							var attendees = show_attendees[showdate].join(", ");
							var chat_text = "Show attendees: " + attendees;
						} else {
							var chat_text = "I don't know anyone who attended this show.";
						}
						self.insertChat(chat_text, obj);
   					});
   				} else if (text.match(/^!countdown/)) {
					var user = API.getUser();
					if(user.id == obj.fromID) {
						$.ajax({
							crossDomain:true,
							type: "GET",
							url: "http://stats.thephish.fm/api/getCountdown.php",
							success: function(data){
								var json = JSON.parse(data);
								self.insertChat(json.response, obj);
							}
						});
					}
   				} else if (text.match(/^!(replay|event)/)) {
					var user = API.getUser();
					if(user.id == obj.fromID) {
						$.ajax({
							crossDomain:true,
							type: "GET",
							url: "http://stats.thephish.fm/api/get_next_replay.php",
							success: function(data){
								var json = JSON.parse(data);
								if(json.success) {
									self.insertChat(json.response, obj);
								} else {
									console.warn("Error in !replay response", data);
								}
							}
						});
					}
   				} else if (text.match(/^!(tdg|ghost)$/)) {
					self.parsePhishShowdate(function(showdate) {
						if(showdate) {
							var now_playing = API.getMedia();
							var blob = now_playing.author+now_playing.title;
							if(blob.match(/ghost/i)) {
								var response = "You might be able to read about this ghost here: http://lawnmemo.com/" + showdate;
							} else {
								var response = "This play does not appear to contain any :ghost:s";
							}
						} else {
							var response = "Showdate not detected";
						}
						self.insertChat(response, obj);
					});
   				} else if (text.match(/^!song/)) {
					self.parsePhishShowdate(function(showdate) {
						var now_playing = API.getMedia();
						var current_dj = API.getDJ()
						var message = current_dj.username+" is playing "+now_playing.author+" "+now_playing.title;
   						if(showdate.length) {
							message +=  " ("+showlist[showdate][0]+" http://stats.thephish.fm/"+showdate+" )";
   						}
   						self.insertChat(message, obj);
					});
   				} else if (text.match(/^!groove$/)) {
					var user = API.getUser();
					if(user.id == obj.fromID) {
						$.ajax({
							crossDomain:true,
							type: "GET",
							url: "http://stats.thephish.fm/api/getGrooveStatus.php",
							success: function(data){
								console.log('groove',data);
								var json = JSON.parse(data);
								if(json.success) {
									var groove_status = json.groove_open ? "Open Mike's Groove" : "Last Mike's Groove";
									var started_or_ended = json.groove_open ? "started" : "ended";
									var started_or_ended_since = json.groove_open ? json.start_since : json.end_since;
									var duration = json.duration_time;
	
									var response = groove_status + '  ' + started_or_ended + ' ' + started_or_ended_since + '. Song count ' + json.songs.list.length + ', duration ' + duration;
									self.insertChat(response, obj);
								} else {
									console.warn("Error in !groove", data);
								}
							}
						});
					}
   				} else if (text.match(/^!last$/)) {
					var user = API.getUser();
					if(user.id == obj.fromID) {
						$.ajax({
							crossDomain:true,
							type: "GET",
							data: {
								"include_show_link" : true,
								"media_id" : API.getMedia().id
							},
							url: "http://stats.thephish.fm/api/getLastPlayedByShow.php",
							success: function(data){
								var json = JSON.parse(data);
								if(json.success) {
									self.insertChat(json.response, obj);
								} else {
									console.warn("Error in !last", data);
								}
							}
						});
   					}
   				} else if (text.match(/^!phishtracks$/)) {
					self.parsePhishShowdate(function(showdate) {
						if(showdate.length) {
							self.insertChat('http://www.phishtracks.com/shows/'+showdate, obj);
						} else {
							self.insertChat('I don\'t know the showdate', obj);
						}
					});
   				}


			}
			self.relayEvent("CHAT", obj, 'chat.php');
		});

        API.on(API.DJ_ADVANCE, function(obj){
        	console.log('DJ ADVANCE', obj);
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
	parsePhishShowdate: function(callback) {
		var self = this;
		var now_playing = API.getMedia();
		if(!now_playing) {
			return false;
		}
		var blob = now_playing.author+now_playing.title;
		var showlist_json = localStorage.getItem('showlist');
		var showlist = JSON.parse(showlist_json);
		this.parseDate(blob, function(showdate) {
			if(showdate.length) {
				var found_show = false;
				$.each(showlist, function(showdate_index,venue_long) {
					if(showdate_index == showdate) {
						found_show = true;
						callback(showdate);
					}
				});
				if(!found_show) {
					callback(false);
				}
			} else {
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
			"version" : "0.5.18"
		};
				
		if (data.from.permission < 2 && data.from.id != '522e0fb696fba524e5174326') {
			// Only room moderators can relay API data
			return false;
		}
		$.ajax({
			crossDomain:true,
			type: "POST",
			url: "http://stats.thephish.fm/api/" + endpoint,
			data: data,
			success: function(response){
				console.log(data, response, JSON.parse(response));
				var response_JSON = JSON.parse(response);
				if(response_JSON.to_be_spoken && response_JSON.to_be_spoken.length) {
					self.insertChat(response_JSON.to_be_spoken, {"fromID" : API.getUser()});
				}
			}
		});
	},
	insertChat: function(message, chatObj) {
		var user = API.getUser();
		if(user.id == chatObj.fromID) {
			API.sendChat(message);
		}
	},	
	simpleResponses: [],
	fetchSimpleResponses: function() {
		var $this = this;
		$.getJSON('http://stats.thephish.fm/api/getSimpleResponses.php', function(responses) {
			var updatedSimpleResponses = [];
			_.each(responses, function(a) { 
				updatedSimpleResponses.push(
					{
						'trigger': new RegExp(a.regexp, 'i'), 
						'response': a.response 
					}
				); 
			});
			console.log('Updated simple responses');
			$this.simpleResponses = updatedSimpleResponses;
		});
	},
	syncShowCache: function() {
		var self = this;
		$.ajax({
			crossDomain:true,
			type: "GET",
			url: "http://stats.thephish.fm/api/getAllShows.php",
			success: function(response){
				self.logger("Refreshed local show list");
				localStorage.removeItem('showlist');
				localStorage.setItem('showlist', response);
			},
			error: function(response) {
				error.log("Error retrieving show cache");
			}
		});
	},
	syncShowAttendees: function() {
		var self = this;
		$.ajax({
			crossDomain:true,
			type: "GET",
			url: "http://stats.thephish.fm/api/getUsersAtShow.php",
			success: function(response){
				self.logger("Refreshed show attendee list");
				localStorage.removeItem('show_attendees');
				localStorage.setItem('show_attendees', response);
			},
			error: function(response) {
				error.log("Error retrieving show cache");
			}
		});
	},
	logger: function(message) {
		console.log("theSloth: "+message);
	}
}

// Wait for the PlugAPI to be available before instantiating
function initialize() {
	if(typeof API != "undefined") {
			console.log('theSloth: API connected.');
			theSloth = new TheSloth();
	} else {
			console.warn('theSloth: API not connected.  Retrying....');
		setTimeout(initialize, 1000);
	}
}

initialize();