




app.controller('ShowCtrl', function($rootScope, $scope, $location, $routeParams, $http, rssFeed) {

  $scope.view = {};

  $http.jsonp('https://itunes.apple.com/lookup', {
    params: {
      'callback': 'JSON_CALLBACK',
      'id': $routeParams.provider_id
    }
  })
  .then(function(data){
    // console.log('DATA', data.data.results);
    if(data && data.data && data.data.results && data.data.results.length > 0){
      $scope.view.podcast = data.data.results[0];
      return rssFeed.loadFeed($scope.view.podcast.feedUrl);
    }
  })
  .then(function(feed){
    // console.log('feed data', feed);
    // console.log('LOCATION', $location.$$protocol);
    var proto = $location.$$protocol;

    $scope.view.episodes = [];
    if(feed && feed.entries){
      feed.entries.forEach(function(episode){
        if(episode.mediaGroups && episode.mediaGroups.length > 0){
          episode.url = rssFeed.formatProtocol(episode.mediaGroups[0].contents[0].url, proto);
          episode.filesize = episode.mediaGroups[0].contents[0].fileSize;
        } else {
          episode.url = rssFeed.formatProtocol(episode.link, proto);
          episode.filesize = '';
        }
      });
      $scope.view.episodes = feed.entries;
    }
  })
  .catch(function(err){
    // console.log('error', err);
    $scope.view.errors = [err];
    // console.log($scope.view.errors);
  });
});
