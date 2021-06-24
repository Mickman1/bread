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

chrome.tabs.getSelected(null, function(tab) {
	let twitterVideoID = /[^/]*$/.exec(tab.url)[0]

	var xhr = new XMLHttpRequest()
	xhr.onreadystatechange = function() {
		if (xhr.readyState === XMLHttpRequest.DONE) {
			if (xhr.responseText === 'no_post') {
				document.getElementById('download-header').innerHTML = 'Download Error!'
				document.getElementById('twitter-logo').src = './assets/icon_red.png'
				return;
			}
			download('filename.mp4', xhr.responseText)
		}
	}
	xhr.open('POST', 'https://mickman.tech/node', true)
	xhr.setRequestHeader('Content-Type', 'application/json')
	xhr.setRequestHeader('Access-Control-Allow-Origin', '*')
	xhr.send(JSON.stringify({
		id: twitterVideoID
	}))
})