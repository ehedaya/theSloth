$(document).ready(function() {
	$('#phish_content').hide();
	$('#alt_content').hide();

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
		data: { n : 1},
		success: function(data){
			var json = JSON.parse(data);
			var recent_play = json.list[0];
			TemplateCache.get('setlist', function(template) {
				var html = template(recent_play);
				$('#now_playing').html(html);
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
	
	$.ajax({
		crossDomain: true,
		type: "GET",
		url: "http://stats.thephish.dev/api/getLinks.php",
		success: function(data) {
			var json = JSON.parse(data);
			console.log(json);
			TemplateCache.get('links', function(template) {
				var html = template(json);
				$('#links').html(html);
			});
		}
	});
});
