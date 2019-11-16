TheSloth = {
//	constructor:  TheSloth,
	setupEvents: function() {
		var self = this;
		("Setting up events");

		// Set up events
		API.on(API.CHAT, function(obj){
			var text = obj.message;
			console.debug("theSloth: Chat event", obj);

			for(t=0;t<self.simpleResponses.length;t++) {
				if (text.match(self.simpleResponses[t].trigger)) {
					self.insertChat(self.simpleResponses[t].response, obj);
					console.debug("theSloth: Matched simple response");
					return true;
				}
			}

			if(text.match(/^##/i)) {
				// Log a note
				console.debug("theSloth: Sending note");
				obj.track_time = API.getTimeElapsed();
				self.relayEvent("CHAT", obj, 'chat.php');
			} else if (text.match(/^!/i)) {
				// Chat command
				console.debug("theSloth: Chat command detected");
				if(text.match(/^!setlist$/i)) {
					console.debug('theSloth: Responding to !setlist');
					// Fetch setlist information and insert into chat
					self.parsePhishShowdate(function(showdate) {
						var showlist_json = sessionStorage.getItem('showlist');
						var showlist = JSON.parse(showlist_json);
						if(showdate) {
							if(showlist[showdate].length > 1) {
								self.insertChat("Setlist: https://phish.net/setlists/?d="+showdate+" "+showlist[showdate].length+" shows on "+showdate, obj);
							} else {
								self.insertChat("Setlist: https://phish.net/setlists/?d="+showdate+" ("+showlist[showdate][0]+")", obj);
							}
						} else {
							console.debug("theSloth: Could not find showdate", showdate);
						}
					});
					} else if (text.match(/^!pnet:/)) {
						console.debug('theSloth: Responding to !pnet:');
	          var pnet_username = escape(text.substr(6));
	          var userid = obj.uid;
	          var payload = { userid: userid, username: pnet_username };
						$.ajax({
							crossDomain:true,
							type: "GET",
							url: "https://stats.thephish.fm/api/update_pnet.php",
							data: payload,
							success: function(data){
								(data);
								var json = JSON.parse(data);
								self.insertChat(json.response, obj);
								self.syncShowAttendees();
							}
						});
   				} else if (text.match(/^!who(else)?/)) {
   					console.debug("theSloth: !who(else)?");
						var show_attendee_json = sessionStorage.getItem('show_attendees');
						var show_attendees = JSON.parse(show_attendee_json);
						var chat_text;
   					if(self.now_playing_showdate) {
							console.log("theSloth: Found current song showdate");
   						var showdate = self.now_playing_showdate;
							if(show_attendees[showdate] && show_attendees[showdate].length) {
								var attendees = show_attendees[showdate].join(", ");
								chat_text = "Show attendees: " + attendees;
							} else {
							  chat_text = "I don't know anyone who attended this show.";
							}
							self.insertChat(chat_text, obj);
   					} else {
							console.log("theSloth: Trying to parse current showdate");
							self.parsePhishShowdate(function(showdate) {
								if(show_attendees[showdate] && show_attendees[showdate].length) {
									var attendees = show_attendees[showdate].join(", ");
									chat_text = "Show attendees: " + attendees;
								} else {
									chat_text = "I don't know anyone who attended this show.";
								}
								self.insertChat(chat_text, obj);
							});
						}
   				} else if (text.match(/^!countdown/)) {
   					console.debug("theSloth: Countdown");
						var user = API.getUser();
						if(user.id == obj.uid) {
							$.ajax({
								crossDomain:true,
								type: "GET",
								url: "https://stats.thephish.fm/api/getCountdown.php",
								success: function(data){
									var json = JSON.parse(data);
									self.insertChat(json.response, obj);
								}
							});
						}
   				} else if (text.match(/^!(replay|event)/)) {
   					console.debug("theSloth: Replay or event");
						var user = API.getUser();
						if(user.id == obj.uid) {
							$.ajax({
								crossDomain:true,
								type: "GET",
								url: "https://stats.thephish.fm/api/get_next_replay.php",
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
	   				console.debug("theSloth: Ghost");
						self.parsePhishShowdate(function(showdate) {
							if(showdate) {
								var now_playing = API.getMedia();
								var blob = now_playing.author+now_playing.title;
								if(blob.match(/ghost/i)) {
									var response = "You might be able to read about this ghost here: https://lawnmemo.com/" + showdate;
								} else {
									var response = "This play does not appear to contain any :ghost:s";
								}
							} else {
								var response = "Showdate not detected";
							}
							self.insertChat(response, obj);
						});
   				} else if (text.match(/^!song/)) {
	   				console.debug("theSloth: Song");
						self.parsePhishShowdate(function(showdate) {
							var now_playing = API.getMedia();
							var current_dj = API.getDJ()
							var message = current_dj.username+" is playing "+now_playing.author+" "+now_playing.title;
	   						if(showdate.length) {
								message +=  " ("+showlist[showdate][0]+" https://stats.thephish.fm/"+showdate+" )";
	   						}
	   						self.insertChat(message, obj);
						});
   				} else if (text.match(/^!groove$/)) {
	   				console.debug("theSloth: Groove");
						var user = API.getUser();
						if(user.id == obj.uid) {
							$.ajax({
								crossDomain:true,
								type: "GET",
								url: "https://stats.thephish.fm/api/getGrooveStatus.php",
								success: function(data){
									console.debug('theSloth: groove',data);
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
   				} else if (text.match(/^!last/)) {
	   				console.debug("theSloth: !last");
					var user = API.getUser();
					if(user.id == obj.uid) {
						console.debug("theSloth: Self");
						$.ajax({
							crossDomain:true,
							type: "GET",
							data: {
								"include_show_link" : true,
								"media_id" : API.getMedia().cid
							},
							url: "https://stats.thephish.fm/api/getLastPlayedByShow.php",
							success: function(data){
							console.debug("theSloth: Reponse", data);
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
	   				console.debug("theSloth: Phishtracks link");
					self.parsePhishShowdate(function(showdate) {
						if(showdate.length) {
							self.insertChat('https://www.phishtracks.com/shows/'+showdate, obj);
						} else {
							self.insertChat('I don\'t know the showdate', obj);
						}
					});
   				} else {
   					console.debug("theSloth: Fell out");
   				}


			}
			self.relayEvent("CHAT", obj, 'chat.php');
		});

		API.on(API.ADVANCE, function(obj){
			console.debug('theSloth: DJ ADVANCE', obj);
			var media = API.getMedia();
			var dj = API.getDJ();
			var payload = {
				hash: media.id,
				cid: media.cid,
				author: media.author,
				title: media.title,
				format: media.format,
				duration: media.duration,
				dj_id: dj.id,
				positive: 0,
				negative: 0,
				curates: 0,
				created: Math.round(new Date().getTime()/1000) - API.getTimeElapsed()
			};
			console.log("Calculated payload");

			self.parsePhishShowdate(function(showdate) {
				console.log("Relaying event", payload);
				self.relayEvent('DJ_ADVANCE', {"now_playing": payload, "dj": API.getDJ(), "score": API.getScore(), "showdate": showdate }, 'now_playing.php');
			});
		});

		API.on(API.VOTE_UPDATE, function(obj){
			// console.debug('theSloth: DJ ADVANCE', obj);
			// var media = API.getMedia();
			// var dj = API.getDJ();
			// var payload = {
			// 	hash: media.id,
			// 	cid: media.cid,
			// 	author: media.author,
			// 	title: media.title,
			// 	format: media.format,
			// 	duration: media.duration,
			// 	dj_id: dj.id,
			// 	positive: 0,
			// 	negative: 0,
			// 	curates: 0,
			// 	created: Math.round(new Date().getTime()/1000) - API.getTimeElapsed()
			// };
			// console.log("Calculated payload");
			//
			// self.parsePhishShowdate(function(showdate) {
			// 	console.log("Relaying event", payload);
			// 	self.relayEvent('DJ_ADVANCE', payload, 'now_playing.php');
			// });
		});

		API.on(API.WAIT_LIST_UPDATE, function(obj){
		});

		API.on(API.USER_JOIN, function(obj){
			// self.relayEvent("USER_JOIN", obj, 'user_arrival_departure.php')
		});

		API.on(API.USER_LEAVE, function(obj){
			// self.relayEvent("USER_LEAVE", obj, 'user_arrival_departure.php')
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
				// self.relayEvent('MOD_SKIP', {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getScore(), "showdate": showdate }, 'now_playing.php');
			});
		});

		API.on(API.CHAT_COMMAND, function(obj){
		});

		API.on(API.HISTORY_UPDATE, function(obj){
			// self.parsePhishShowdate(function(showdate) {
			// 	self.relayEvent('HISTORY_UPDATE', {"now_playing": API.getMedia(), "dj": API.getDJ(), "score": API.getScore(), "showdate": showdate }, 'now_playing.php');
			// });
 			// self.relayEvent("HISTORY_UPDATE", obj, 'history_update.php');
		});


	},
	parseDate: function(blob, callback) {
		var r = /[0-9]{1,4}[\-\/\s\.\\]{1,2}[0-9]{1,2}[\-\/\s\.\\]{1,2}[0-9]{1,4}/;
		var showdate = blob.match(r);
		if (showdate) {
			var d = moment(showdate[0]);
			if (d) {
				callback(d.format('YYYY-MM-DD'));
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
		var showlist_json = sessionStorage.getItem('showlist');
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
		if(window.location.href != "https://plug.dj/thephish") {
			return false;
		}
		data = {
			"type" : type,
			"payload" : payload,
			"from" : API.getUser(),
			"media" : API.getMedia(),
			"current_dj" : API.getDJ(),
			"version" : "0.8.2"
		};

		if (data.from.permission < 2 && data.from.id != '522e0fb696fba524e5174326') {
			// Only room moderators can relay API data
			console.log("theSloth: Relay by non-moderator stopped");
			return false;
		}
		$.ajax({
			crossDomain:true,
			type: "POST",
			url: "https://stats.thephish.fm/api/" + endpoint,
			data: JSON.stringify(data),
			success: function(response){
				console.debug(data, response, JSON.parse(response));
				var response_JSON = JSON.parse(response);
				if(response_JSON && response_JSON.to_be_spoken && response_JSON.to_be_spoken.length) {
					self.insertChat(response_JSON.to_be_spoken, {"uid" : API.getUser()});
				}
				if(response_JSON.db_play) {
					var d = response_JSON.db_play;
					if(d.show && d.show.showdate) {
						self.now_playing_showdate = d.show.showdate;
					} else {
						self.now_playing_showdate = null;
					}
					console.log(self.now_playing_showdate);
				}
			}
		});
	},
	insertChat: function(message, chatObj) {
		var user = API.getUser();
		if(user.id == chatObj.uid) {
			API.sendChat(message);
		}
	},
	simpleResponses: [],
	fetchSimpleResponses: function() {
		var $this = this;
		$.getJSON('https://stats.thephish.fm/api/getSimpleResponses.php', function(responses) {
			var updatedSimpleResponses = [];
			_.each(responses, function(a) {
				updatedSimpleResponses.push(
					{
						'trigger': new RegExp(a.regexp, 'i'),
						'response': a.response
					}
				);
			});
			console.log('theSloth Init: Updated simple responses');
			$this.simpleResponses = updatedSimpleResponses;
		});
	},
	syncShowCache: function() {
		var self = this;
		$.ajax({
			crossDomain:true,
			type: "GET",
			url: "https://stats.thephish.fm/api/getAllShows.php",
			success: function(response){
				console.log("Refreshed local show list", response);
				sessionStorage.removeItem('showlist');
				sessionStorage.setItem('showlist', JSON.stringify(response));
			},
			error: function(response) {
				console.log("Error retrieving show cache");
			}
		});
	},
	syncShowAttendees: function() {
		var self = this;
		$.ajax({
			crossDomain:true,
			type: "GET",
			url: "https://stats.thephish.fm/api/getUsersAtShow.php",
			success: function(response){
				("Refreshed show attendee list");
				sessionStorage.removeItem('show_attendees');
				sessionStorage.setItem('show_attendees', JSON.stringify(response));
			},
			error: function(response) {
				console.log("Error retrieving show cache");
			}
		});
	},
	logger: function(message) {
		console.debug("theSloth: theSloth: "+message);
	}
};

// Wait for the PlugAPI to be available before instantiating
function initialize() {
	if(typeof API != "undefined") {
			console.debug('theSloth: theSloth: API connected.');
			TheSloth.setupEvents();
			TheSloth.syncShowCache();
			TheSloth.syncShowAttendees();
			TheSloth.fetchSimpleResponses();

	} else {
			console.debug('theSloth: theSloth: API not connected.  Retrying....');
			setTimeout(initialize, 1000);
	}
}

initialize();
