import CustomQRCode from '../core/CustomQRCode'
import type { DotType, Options } from '../types'

const options: Partial<Options> = {
	width: 300,
	height: 300,
	type: 'svg',
	data: 'https://google.com',
	image: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg',
	dotsOptions: {
		type: 'square',
		color: '#123ddd',
	},
	cornersSquareOptions: {
		type: 'square',
		color: '#321ccc',
	},
	cornersDotOptions: {
		type: 'square',
		color: '#7de88e',
	},
	imageOptions: {
		crossOrigin: 'anonymous',
		margin: 30,
	},
}

const dotOptions: DotType[] = ['rounded', 'dots', 'classy', 'classy-rounded', 'square', 'extra-rounded']
const color = ['#e8977d', '#d3e87d', '#7de88e', '#7ddbe8', '#867de8', '#e87de4', '#e87d7d']

const container = document.getElementById('container')

//Draw fixed version

dotOptions.forEach((_, i) => {
	options.dotsOptions = {
		type: dotOptions[i],
		color: color[i],
	}

	const qrCode = new CustomQRCode(options)
	if (container) {
		qrCode.append(container)
	}
	// qrCode.download({
	//   extension: "svg"
	// });
})

//Draw original dots

const container2 = document.getElementById('container2')
// biome-ignore lint/complexity/useLiteralKeys: <explanation>
options['useLegacyDotRotation'] = true

dotOptions.forEach((_, i) => {
	options.dotsOptions = {
		type: dotOptions[i],
		color: color[i],
	}

	const qrCode = new CustomQRCode(options)
	if (container2) {
		qrCode.append(container2)
	}
})
