// Old download function, deprecated by chrome.downloads.download
// Creates element with href for video link, then immediately clicks it
function download(filename, videoURL) {
	let url = videoURL.split('?')[0]

	fetch(url)
		.then(response => response.blob())
		.then(blob => {
			const blobURL = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = blobURL
			a.style = 'display: none'

			a.download = /[^/]*$/.exec(url)[0]
			document.body.appendChild(a)
			a.click()
			window.close()
		})
}

// Get current tab
chrome.tabs.query({ active: true, currentWindow: true }, function(tab) {
	var xhr = new XMLHttpRequest()
	// Listen for response following POST request to Bread server
	xhr.onreadystatechange = function() {
		if (xhr.readyState === XMLHttpRequest.DONE) {
			let updatedDownloadMessage = ''

			// Check for HTTP status code of POST request
			switch (xhr.status) {
				case 200:
					chrome.downloads.download({
						// If user has custom filename setting
						//filename: 'vid.mp4',
						url: xhr.responseText,
					})
					// When chrome begins processing the download request
					document.getElementById('download-header').innerHTML = 'Downloading...'
					return;
				case 422: case 400:
					// Requested link / media cannot be processed
					updatedDownloadMessage = 'Download Error!'
					break
				case 0:
					// Express server not running
					updatedDownloadMessage = 'Bread Server Offline!'
					break
			}
			document.getElementById('download-header').innerHTML = updatedDownloadMessage
			document.getElementById('bread-logo').src = './assets/icon_burnt.png'
		}
	}
	xhr.open('POST', 'https://mickbot.com/bread', true)
	xhr.setRequestHeader('Content-Type', 'application/json')
	xhr.setRequestHeader('Access-Control-Allow-Origin', '*')
	xhr.send(JSON.stringify({
		url: tab[0].url
	}))
})