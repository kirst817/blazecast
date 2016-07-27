require('dotenv').config();
var knex = require('../db/knex');
var itunesdummydata = require('../itunesdummydata');
var Audiosearch = require('../lib/audiosearch-client');
var audiosearch = new Audiosearch(process.env.AUDIOSEARCH_KEY, process.env.AUDIOSEARCH_SECRET);


exports.serveiTunesDummy = function(req, res, next) {
  res.json(itunesdummydata.data);
};

exports.followPodcast = function (req, res, next) {
  var userId = req.params.user_id;
  var providerId = req.params.podcast_id;
  var podcastName = req.body.podcastName;
  var feedUrl = req.body.feedUrl;
  var images = req.body.images;
  var podcastId;

  // first, check to see if podcast is already in database
  knex('podcasts')
    .where('provider_id', providerId)
    .then(function(data) {
      if (!data.length) { // podcast is not present in database
        return knex('podcasts')
          .insert({
            provider_id: providerId,
            name: podcastName,
            feedUrl: feedUrl,
            images: images
          })
          .returning('id');
      } else { // podcast found in database
        return new Promise((resolve, reject) => {resolve([data[0].id])}); // return a promise to preserve chain
      }
    })
    .then(function(data) { // check to see if podcast is already followed by this user
      podcastId = data[0];
      return knex('users_podcasts')
        .where('user_id', userId)
        .andWhere('podcast_id', podcastId);
    })
    .then(function(data) {
      var following = data[0] ? data[0].following : true;
      if (!data.length) {
        return knex('users_podcasts')
        .insert({
          user_id: userId,
          podcast_id: podcastId,
          following: true
        });
      } else {
        return knex('users_podcasts')
          .update({
            following: !following
          })
          .where('podcast_id', podcastId);
      }
    })
    .then(function() {
      res.end();
    });
}

exports.getFollows = function(req, res, next) {
  var userId = req.params.user_id;
  knex('podcasts')
    .join('users_podcasts','podcasts.id', '=', 'podcast_id')
    .where('user_id', userId)
    .andWhere('following', true)
    .then(function(follows) {
      res.json(follows)
    })

};

/* This portion of the api will only return non-sensitive key values */
//
exports.testApi = function(req, res) {
  // console.log('REQ', req.body);
  return knex('users').select('*').first()
  .then(function(data){
    res.json(200, data);
  });
}


// https://www.audiosear.ch/developer#!/shows/get_shows_itunes_id_id
// /api/:podcastId/episodes
// https://www.audiosear.ch/api/shows?itunes_id=1598914170424545
exports.getFedPodcastEpisodes = function(req, res, next){

  // console.log('BEGIN API CALL', req.params);
  var podcast = {};
  var pId = req.params.itunes_podcast_id;

  return audiosearch.get('/shows', {'itunes_id':pId})
  .then(function(data){
    podcast = data;
    console.log('DATA FROM REMOTE', data);
    var episodePromises = [];
    if(podcast.episode_ids.length > 0){
      podcast.episode_ids.forEach(function(itm){
        episodePromises.push( audiosearch.getEpisode(itm) );
      });
    }
    return Promise.all(episodePromises);
  })
  .then(function(data){
    podcast.eCollection = data;
    res.send(podcast);
  })
  .catch(function(err){
    console.log('ERROR AT API CATCH', err);
    res.send(err);
  });
}
