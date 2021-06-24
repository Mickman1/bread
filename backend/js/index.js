async function getTweet(id) {
	const twitterClient = getTwitterCredentials()

	return twitterClient.get('statuses/show', { id, tweet_mode:'extended' })
	.then(function (tweet) {
		console.log(tweet.extended_entities.media[0].video_info.variants[0].url)
		//console.log(JSON.stringify(tweet, null, 4))

		// Determine Twitter post type: Video or GIF
		switch (tweet.extended_entities.media[0].type) {
			case 'video':
				let videosArray = tweet.extended_entities.media[0].video_info.variants
				return getHighestQualityURL(videosArray);
			case 'animated_gif':
				return tweet.extended_entities.media[0].video_info.variants[0].url;
		}
		
  })
  .catch(function (error) {
		//throw error
		return 'no_post';
	})
}

function getHighestQualityURL(videosArray) {
	// Set 'highest quality' to first video
	let highestQualityVideoBitrate = 1
	let highestQualityVideoBitrateIndex = 1

	// Sequential search / sort to find highest bitrate
	for (let i = 0; i < videosArray.length; i++) {
		// Filter out .m3u8 / other files without bitrates
		if (videosArray[i].content_type !== 'video/mp4')
			continue

		if (videosArray[i].bitrate > highestQualityVideoBitrate) {
			highestQualityVideoBitrate = videosArray[i].bitrate
			highestQualityVideoBitrateIndex = i
		}
	}

	return videosArray[highestQualityVideoBitrateIndex].url;
}

function getTwitterCredentials() {
	const Twitter = require('twitter')
	const tokens = require('../config/twitter_auth_tokens.json')

	const twitterClient = new Twitter({
		consumer_key: tokens.consumer_key,
		consumer_secret: tokens.consumer_secret,
		access_token_key: tokens.access_token_key,
		access_token_secret: tokens.access_token_secret
	})

	return twitterClient;
}

async function startServer() {
	const express = require('express')
	const cors = require('cors')
	const bodyParser = require('body-parser')

	const app = express()
	app.use(cors())
	const PORT = 2096

	// Tell express to use body-parser's JSON parsing
	app.use(bodyParser.urlencoded({ extended: false }))
	app.use(bodyParser.json())

	app.post('/', async (req, res) => {
		console.log(req.body)
		
		let url = await getTweet(req.body.id)

		if (url === 'no_post') {
			return res.status(422).end('no_post');
		}

		console.log(url)

		res.status(200).end(url.toString())
	})

	// Start express on the defined port
	app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}

startServer()