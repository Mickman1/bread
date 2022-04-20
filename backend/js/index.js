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

function getRedditVideoURL(requestURL) {
	// Fetch JSON from Reddit URL and return video link
	// Example: https://v.redd.it/pvenqawy7bk71
	let fetch = require('node-fetch')
	let settings = { method: 'Get' }

	return new Promise(resolve => {
		fetch(requestURL, settings)
			.then(res => res.json())
				.then((json) => {
					// Reddit JSON for if a post is a video
					if (json[0].data.children[0].data.is_video)
						resolve(json[0].data.children[0].data.secure_media.reddit_video.fallback_url)
				})
	});
}

function combineVideoAndAudio(videoURL, audioURL, fileName) {
	var fs = require('fs')

	if (fs.existsSync(`/var/www/html/reddit/${fileName}.mp4`)) {
		console.log('File Exists!')
		return `https://mickbot.com/reddit/${fileName}.mp4`;
	}
	// Using spawn to run FFmpeg CLI command to combine DASH_1080 and DASH_audio
	var spawn = require('child_process').spawn

	var cmd = '/usr/bin/ffmpeg'

	// FFmpeg CLI arguments to add audio track to video
	var args = [
		'-i', videoURL,
		'-i', audioURL,
		'-map', '0:v',
		'-map', '1:a',
		'-c:v', 'copy',
		'-shortest',
		'-f', 'mp4', `/var/www/html/reddit/${fileName}.mp4`
	]

	var proc = spawn(cmd, args)

	proc.stderr.setEncoding('utf8')

	return new Promise(resolve => {
		proc.on('close', () => resolve(`https://mickbot.com/reddit/${fileName}.mp4`))
	});
}

function getTwitterClient() {
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

function getRedditClient() {
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

function getYouTubeClient() {
	const ytdl = require('ytdl-core')
	return ytdl;
}

async function getYouTubeVideo(videoURL) {
	youTubeClient(videoURL, { filter: 'audioonly', format: 'mp3' })
		.pipe(fs.createWriteStream('/var/www/html/assets/newvid.mp3'))
		return setTimeout(function() {
			return 'https://mickman.tech/assets/newvid.mp3';
		}, 3000)
}

async function determineService(requestDomain, requestURL) {
	switch (requestDomain) {
		//TODO: Don't check for all subdomains, just the main domain
		// Example: *.twitter.com, *.reddit.com
		case 'twitter.com':
		case 'mobile.twitter.com':
			let tweetID = /[^/]*$/.exec(requestURL)[0]
			var responseURL = await getTweet(tweetID)
			console.log(new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true }) + '\nDomain: Twitter\n')
			console.log(responseURL)

			return responseURL;
		case 'www.reddit.com':
		case 'new.reddit.com':
		case 'old.reddit.com':
			console.log(new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true }) + '\nDomain: Reddit\n')
			console.log(requestURL)

			let redditVideoURL = await getRedditVideoURL(`${requestURL}.json`)
			let redditPostLink = redditVideoURL.substring(0, redditVideoURL.search('/DASH_'))
			let redditFileName = redditPostLink.substring(redditPostLink.lastIndexOf('/') + 1)
			var redditAudioURL = redditPostLink + '/DASH_audio.mp4'
			var responseURL = await combineVideoAndAudio(redditVideoURL, redditAudioURL, redditFileName)
			return responseURL;
		case 'www.youtube.com':
			console.log('\nDomain: YouTube')

			var responseURL = await getYouTubeVideo(requestURL)

			return responseURL;
		default:
			console.log('\nDomain: Other')
			// Include 422 Error for other domain
			return;
	}

	//console.log(object)
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
		// Checking for URL in request body
		if (!req.body.url) {
			return res.status(400).end('no_url');
		}

		//let url = await getTweet(req.body.id)
		let requestDomain = getHostnameFromRegex(req.body.url)
		let responseURL = await determineService(requestDomain, req.body.url)

		//if (responseURL)
		//console.log(req.body.url)

		if (responseURL === 'no_post') {
			return res.status(422).end('no_post');
		}

		res.status(200).end(responseURL.toString())
		console.log('Response Sent')
	})

	// Start express on the defined port
	app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}

const twitterClient = getTwitterClient()
//const redditClient = getRedditClient()
//const youTubeClient = getYouTubeClient()
const fs = require('fs')
//redditClient.getSubmission('o7h5lh').url.then(post => console.log(post))

startServer()
