async function getTweet(id) {
	return twitterClient.get('statuses/show', { id, tweet_mode:'extended' })
	.then(function (tweet) {
		//console.log(tweet.extended_entities.media[0].video_info.variants[0].url)
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
	const twitterTokens = require('../config/twitter_auth_tokens.json')

	const twitterClient = new Twitter({
		consumer_key: twitterTokens.consumer_key,
		consumer_secret: twitterTokens.consumer_secret,
		access_token_key: twitterTokens.access_token_key,
		access_token_secret: twitterTokens.access_token_secret
	})

	return twitterClient;
}

function getRedditCredentials() {
	const snoowrap = require('snoowrap')
	const redditTokens = require('../config/reddit_auth_tokens.json')

	const r = new snoowrap({
		userAgent: redditTokens.userAgent,
		clientId: redditTokens.clientID,
		clientSecret: redditTokens.clientSecret,
		refreshToken: redditTokens.refreshToken
	})

	return r;
}

async function determineService(requestDomain, requestURL) {
	switch (requestDomain) {
		case 'twitter.com':
			let tweetID = /[^/]*$/.exec(requestURL)[0]
			let responseURL = await getTweet(tweetID)
			console.log(responseURL)
			return responseURL;
		case 'www.reddit.com':
			console.log('reddit')
			break
		default:
			console.log('other')
	}
}

const getHostnameFromRegex = (url) => {
  const matches = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i)
  // Extract hostname (will be null if no match is found)
  return matches && matches[1];
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
		//let startTime = Date.now()
		//console.log(req.body)
		
		//let url = await getTweet(req.body.id)
		let requestDomain = getHostnameFromRegex(req.body.url)
		let responseURL = await determineService(requestDomain, req.body.url)

		if (responseURL)
		//console.log(req.body.url)

		if (responseURL === 'no_post') {
			return res.status(422).end('no_post');
		}

		res.status(200).end(responseURL.toString())
		//let endTime = Date.now()
		//console.log(endTime - startTime)
	})

	// Start express on the defined port
	app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}

const twitterClient = getTwitterCredentials()
const redditClient = getRedditCredentials()
//redditClient.getSubmission('o7h5lh').url.then(post => console.log(post))

startServer()