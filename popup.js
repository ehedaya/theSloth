$(document).ready(function() {
	$('#phish_content').hide();
	$('#alt_content').hide();

	Handlebars.registerHelper('date_format', function(input_date, format) {
		return moment(input_date).format(format);
	});

	Handlebars.registerHelper('time_since', function(input_date, format) {
		return moment(input_date).fromNow();
	});


	$.get('templates/loading.html', function(html) {
		$('#now_playing').html(html);
		$('#recent_plays').html(html);
		$('#events').html(html);
	});
	
	$('#setlist small').text('Loading setlist');
	TemplateCache = {
		get: function(filename, callback) {
			$.get('templates/'+filename+'.html', function(data) {
				callback(Handlebars.compile(data));
			});
		}
	};
	$.ajax({
		crossDomain:true,
		type: "GET",
		url: "http://stats.thephish.fm/api/getRecentPlays.php",
		data: { n : 50 },
		success: function(data){
			var json = JSON.parse(data);
			var recent_play = json.list[0];
			TemplateCache.get('now_playing', function(template) {
				var html = template(recent_play);
				$('#now_playing').html(html);
			});
			
			TemplateCache.get('recent_plays', function(template) {
				console.log(json.list.slice(1));
				var html = template(json.list.slice(1));
				$('#recent_plays').html(html).find('.myTooltip').tooltip();
			});
// 			if(recent_play.show) {
// 				console.log(recent_play.show);
// 				$.ajax({
// 					crossDomain: true,
// 					type: "GET",
// 					url: "http://stats.thephish.fm/api/getUsersAtShow.php",
// 					data: { showdate : show.showdate }, 
// 					success: function(attendees) {
// 						console.log(attendees);
// 					}
// 				});
// 			}
			$('#loader').remove();
		}
	});
	
// 	$.ajax({
// 		crossDomain: true,
// 		type: "GET",
// 		url: "http://stats.thephish.dev/api/getEvents.php",
// 		data: { future_events_only : true },
// 		success: function(data) {
// 			var json = JSON.parse(data);
// 			console.log(data);
// 			TemplateCache.get('events', function(template) {
// 				var html = template(json);
// 				console.log(html);
// 				$('#events').html(html);
// 			});
// 		}
// 	});
});
