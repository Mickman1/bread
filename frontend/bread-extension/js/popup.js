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
	var xhr = new XMLHttpRequest()
	xhr.onreadystatechange = function() {
		if (xhr.readyState === XMLHttpRequest.DONE) {
			let errorMessage = ''

			// Check for HTTP status code of POST request
			switch (xhr.status) {
				case 200:
					download('filename.mp4', xhr.responseText)
					return;
				case 422:
					// Requested link / media cannot be processed
					errorMessage = 'Download Error!'
					break
				case 0:
					// Express server not running
					errorMessage = 'Bread Server Offline!'
					break
			}
			document.getElementById('download-header').innerHTML = errorMessage
			document.getElementById('bread-logo').src = './assets/icon_red.png'
		}
	}
	xhr.open('POST', 'http://mackmin.me/node', true)
	xhr.setRequestHeader('Content-Type', 'application/json')
	xhr.setRequestHeader('Access-Control-Allow-Origin', '*')
	xhr.send(JSON.stringify({
		url: tab.url
	}))
})