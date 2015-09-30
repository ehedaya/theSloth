TheSloth = {
	options: {
		dubtrack: {
			apiBase: 'https://api.dubtrack.fm',
			roomId: '55f8353d44809b0300f88699'
		},
		thephish: {
			apiBase: 'https://stats.thephish.fm/api',
		}
	},
	setupEvents: function() {
		var $this = this;
		console.debug("theSloth: Setting up events");

		Dubtrack.room.chat.model.on('change', function(model) {
			console.debug("theSloth: Chat detected", model.toJSON());
			var data = model.get('data');
			var activeSong = Dubtrack.room.player.activeSong.toJSON();
			
			if(data && data.req && data.req.message) {
				var text = data.req.message;
				
				console.debug("theSloth: Parsing message", text);
				var matched_response = _.find($this.simpleResponses, function(r) { return text.match(r.trigger) });
				if(matched_response) {
					TheSloth.insertChat(matched_response.response);
				}
				
				if(text.match(/^##/i)) {
					// Log a note
					console.debug("Sending note");
					var payload = {
						track_time : Dubtrack.room.player.getCurrentTime(),
						hash : activeSong.song._id,
						from : data.user._id,
						message : text
					}
					$this.relayEvent(payload, 'chat.php');
				} else if (text.match(/^!pnet:/)) {
					console.debug('Responding to !pnet:');
                    var pnet_username = escape(text.substr(6));
                    var userid = data.user._id;
                    var payload = { userid: userid, username: pnet_username };
					$.ajax({
						crossDomain:true,
						type: "GET",
						url: "https://stats.thephish.fm/api/update_pnet.php",
						data: payload,
						success: function(data){
							(data);
							var json = JSON.parse(data);
							$this.insertChat(json.response);
							$this.syncShowAttendees();
						}
					});
   				} else if (text.match(/^!who(else)?/)) {
   					console.debug("Parsing !who data");
					var show_attendee_json = localStorage.getItem('show_attendees');
					var show_attendees = JSON.parse(show_attendee_json);
					$this.parseDate(activeSong.songInfo.name, function(showdate) {
						if(showdate && show_attendees[showdate] && show_attendees[showdate].length) {
							var attendees = show_attendees[showdate].join(", ");
							var chat_text = "Show attendees: " + attendees;
						} else {
							var chat_text = "I don't know anyone who attended this show.";
						}
						$this.insertChat(chat_text);
					});
   				} else if (text.match(/^!last/)) {
					$.ajax({
						crossDomain:true,
						type: "GET",
						data: {
							"include_show_link" : true,
							"media_id" : activeSong.songInfo.fkid
						},
						url: "https://stats.thephish.fm/api/getLastPlayedByShow.php",
						success: function(data){
						console.debug("Reponse", data);
							var json = JSON.parse(data);
							if(json.success) {
								$this.insertChat(json.response);
							} else {
								console.warn("Error in !last", data);
							}
						}
					});
   				} else if (text.match(/^!phishtracks$/)) {
					$this.parseDate(activeSong.songInfo.name, function(showdate) {
						if(showdate.length) {
							$this.insertChat('http://www.phishtracks.com/shows/'+showdate);
						} else {
							$this.insertChat('I don\'t know the showdate');
						}
					});
   				} else if (text.match(/^!groove$/)) {
	   				console.debug("Groove");
					var user = data.user._id;
					$.ajax({
						crossDomain:true,
						type: "GET",
						url: "https://stats.thephish.fm/api/getGrooveStatus.php",
						success: function(data){
							console.debug('groove',data);
							var json = JSON.parse(data);
							if(json.success) {
								var groove_status = json.groove_open ? "Open Mike's Groove" : "Last Mike's Groove";
								var started_or_ended = json.groove_open ? "started" : "ended";
								var started_or_ended_since = json.groove_open ? json.start_since : json.end_since;
								var duration = json.duration_time;

								var response = groove_status + '  ' + started_or_ended + ' ' + started_or_ended_since + '. Song count ' + json.songs.list.length + ', duration ' + duration;
								$this.insertChat(response);
							} else {
								console.warn("Error in !groove", data);
							}
						}
					});
   				} else if (text.match(/^!(tdg|ghost)$/)) {
	   				console.debug("Ghost");
						$this.parseDate(activeSong.songInfo.name, function(showdate) {
						if(showdate) {
							if(activeSong.songInfo.name.match(/ghost/i)) {
								var response = "You might be able to read about this ghost here: http://lawnmemo.com/" + showdate;
							} else {
								var response = "This play does not appear to contain any :ghost:s";
							}
						} else {
							var response = "Showdate not detected";
						}
						$this.insertChat(response);
					});
   				} else if (text.match(/^!(replay|event)/)) {
					$.ajax({
						crossDomain:true,
						type: "GET",
						url: "https://stats.thephish.fm/api/get_next_replay.php",
						success: function(data){
							var json = JSON.parse(data);
							if(json.success) {
								$this.insertChat(json.response);
							} else {
								console.warn("Error in !replay response", data);
							}
						}
					});
   				} else if (text.match(/^!countdown/)) {
					$.ajax({
						crossDomain:true,
						type: "GET",
						url: "https://stats.thephish.fm/api/getCountdown.php",
						success: function(data){
							var json = JSON.parse(data);
							$this.insertChat(json.response);
						}
					});
				}
			}
		});
		
		Dubtrack.room.player.activeSong.on('change', function(model) {
			console.debug("theSloth: Room change detected", model.toJSON());
			$this.relayCurrentTrack();
		});
	},
	insertChat(message) {
		console.debug("Chatting", message);
		Dubtrack.room.chat.$('input').val(message);
		Dubtrack.room.chat.$('button').click();
	},
	relayCurrentTrack: function(){
 		var $this = this;
		var r = Dubtrack.room.player.activeSong.toJSON();
		$this.parseDate(r.songInfo.name, function(showdate) {
			var payload = {
				now_playing: {
					cid: r.songInfo.fkid,
					author: r.songInfo.songArtist,
					title: r.songInfo.name,
					format: r.songInfo.type == "soundcloud" ? 2 : 1,
					duration: Math.floor(r.songInfo.songLength / 1000),
					dj_id: r.song._user,
					positive: r.song.updubs,
					negative: r.song.downdubs,
					curates: 0,
					showdate: showdate,
					hash: r.song._id,
					created: moment(r.song.played).format('X')
				}
			}
			console.debug("theSloth: relay payload", payload);
			$this.relayEvent(payload, 'now_playing.php')
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
	relayEvent: function(payload, endpoint) {
		var $this = this;
		var self = this;
		console.debug("Relaying event", payload, endpoint);
		if(window.location.href != "https://www.dubtrack.fm/join/thephish") {
			return false;
		}
		data = payload;
						
		$.ajax({
			crossDomain:true,
			type: "POST",
			url: "https://stats.thephish.fm/api/" + endpoint,
			data: data,
			success: function(response){
				console.debug(data, response, JSON.parse(response));
				var response_JSON = JSON.parse(response);
				if(response_JSON && response_JSON.to_be_spoken && response_JSON.to_be_spoken.length) {
					$this.insertChat(response_JSON.to_be_spoken, {"fromID" : API.getUser()});
				}
				if(response_JSON.db_play) {
					var d = response_JSON.db_play;
					if(d.show && d.show.showdate) {
						$this.now_playing_showdate = d.show.showdate;
					} else {
						$this.now_playing_showdate = null;
					}
					console.log($this.now_playing_showdate);
				}
			}
		});
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
			console.log('Updated simple responses');
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
				("Refreshed local show list");
				localStorage.removeItem('showlist');
				localStorage.setItem('showlist', response);
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
				localStorage.removeItem('show_attendees');
				localStorage.setItem('show_attendees', response);
			},
			error: function(response) {
				console.log("Error retrieving show cache");
			}
		});
	},
	logger: function(message) {
		console.debug("theSloth: "+message);
	}
}

// Wait for the PlugAPI to be available before instantiating
function initialize() {
	if(Dubtrack && Dubtrack.room && Dubtrack.room.model) {
			console.debug('theSloth: API connected.');
			TheSloth.setupEvents();
			TheSloth.syncShowCache();
			TheSloth.syncShowAttendees();
			TheSloth.fetchSimpleResponses();

	} else {
			console.debug('theSloth: API not connected.  Retrying....');
		setTimeout(initialize, 1000);
	}
}

initialize();