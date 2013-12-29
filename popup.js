$(document).ready(function() {
	$('#content').hide();
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
			var show = json.list[0].show;
			$('#show .setlist').html(show.setlistdata_txt);
			$('#show .venue_long').html('<a href="'+show.tinyurl+'" target="_blank">'+show.venue_long+'</a>');
			$('#loader').remove();
			$('#content').show();
		}
	});
});
