import PNGScanner from './png-scanner'

const METERS_PER_INCH = 0.0254

export type ImageDimensions = {
  width: number
  height: number
  ppi: number
}

// Returns a Promise that resolves with an object indicating:
//
// - width: image width in pixels
// - height: image height in pixels
// - ppi: pixels-per-inch count (optional)
//
// Only PNG file uploads are supported at the moment. All other types will
// resolve with an empty metadata object.
export default async function imageDimensions(file: File): Promise<ImageDimensions | null> {
  if (file.type !== 'image/png') {
    return null
  }
  const slice = file.slice(0, 10240, file.type)
  const scanner = await PNGScanner.fromFile(slice)
  const meta = {
    width: 0,
    height: 0,
    ppi: 1
  }

  scanner.scan(function (type) {
    switch (type) {
      case 'IHDR': {
        /* eslint-disable-next-line no-invalid-this */
        meta.width = this.readLong()
        /* eslint-disable-next-line no-invalid-this */
        meta.height = this.readLong()
        return true
      }
      case 'pHYs': {
        /* eslint-disable-next-line no-invalid-this */
        const ppuX = this.readLong()
        /* eslint-disable-next-line no-invalid-this */
        const ppuY = this.readLong()
        /* eslint-disable-next-line no-invalid-this */
        const unit = this.readChar()
        let inchesRatio
        if (unit === 1) {
          inchesRatio = METERS_PER_INCH
        }
        if (inchesRatio) {
          meta.ppi = Math.round(((ppuX + ppuY) / 2) * inchesRatio)
        }
        return false
      }
      case 'IDAT': {
        return false
      }
    }

    return true
  })

  return meta
}
