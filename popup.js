$(document).ready(function() {
	$('#phish_content').hide();
	$('#alt_content').hide();
	console.log('test');
	$('#setlist small').text('Loading setlist');
// 	TemplateCache = {
// 		get: function(filename) {
// 			$.get('templates/'+filename+'.html', function(data) {
// 				return Handlebars.compile(data);
// 			});
// 		}
// 	};
	$.ajax({
		crossDomain:true,
		type: "GET",
		url: "http://stats.thephish.fm/api/getRecentPlays.php",
		data: { num : 1},
		success: function(data){
			var json = JSON.parse(data);
			console.log(json);
			var recent_play = json.list[0];
			$('.author span').text(recent_play.author);
			$('.title span').text(recent_play.title);
			if(recent_play.show) {
				var show = recent_play.show;
				$('#phish_content .setlist').html(show.setlistdata_txt);
				$('#phish_content .venue_long').html('<a href="'+show.tinyurl+'" target="_blank">'+show.venue_long+'</a>');
				$('#phish_content').show();
			} else {
				$('#alt_content').show();
			}
			$('#loader').remove();
		}
	});
});
