// Scan an ArrayBuffer as PNG, yielding each chunk along the way.
//
// Example:
//
//   scanner = new PNGScanner buffer
//   scanner.scan (chunkType, chunkLength) ->
//     if chunkType is "IHDR"
//       imageWidth = @readLong()
//       imageHeight = @readLong()
//
// The callback will get called for each PNG chunk as described in
// http://www.w3.org/TR/PNG/#11Chunks. During the callback, the scanner will be
// positioned on the start of chunk's data portion, where individual values are
// accessible with:
//
// - readChar(): reads 1-byte value (uint8)
// - readShort(): reads 2-byte value (uint16)
// - readLong(): reads 4-byte value (uint32)
// - readString(length): reads <length> ASCII characters as a string
// - advance(bytes): skips <bytes> bytes forward
//
// Scanning will end if the callback returns `false` at any point.

const PNG_HEADER = 0x89504e47
const CRC_WIDTH = 4

export default class PNGScanner {
  dataview: DataView
  pos: number

  static fromFile(file: Blob): Promise<PNGScanner> {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader()
      reader.onload = function () {
        resolve(new PNGScanner(reader.result as ArrayBuffer))
      }
      reader.onerror = function () {
        reject(reader.error)
      }
      reader.readAsArrayBuffer(file)
    })
  }

  constructor(buffer: ArrayBuffer) {
    this.dataview = new DataView(buffer)
    this.pos = 0
  }

  advance(bytes: number) {
    this.pos += bytes
  }

  readInt(bytes: 1 | 2 | 4) {
    /* eslint-disable-next-line @typescript-eslint/no-this-alias */
    const self = this

    // I want the do { } syntax *so* bad.
    const value = (function () {
      switch (bytes) {
        case 1:
          return self.dataview.getUint8(self.pos)
        case 2:
          return self.dataview.getUint16(self.pos)
        case 4:
          return self.dataview.getUint32(self.pos)
        default:
          // I shouldn't need this, but flow can't figure out that all values of bytes are handled by the above switch
          throw new Error('bytes parameter must be 1, 2 or 4')
      }
    })()
    this.advance(bytes)
    return value
  }

  readChar() {
    return this.readInt(1)
  }

  readShort() {
    return this.readInt(2)
  }

  readLong() {
    return this.readInt(4)
  }

  readString(length: number): string {
    const buf = []
    for (let i = 0; i < length; i++) {
      buf.push(String.fromCharCode(this.readChar()))
    }
    return buf.join('')
  }

  scan(fn: (this: PNGScanner, type: string, len: number) => boolean) {
    if (this.readLong() !== PNG_HEADER) {
      throw new Error('invalid PNG')
    }

    this.advance(4)

    for (;;) {
      const len = this.readLong()
      const type = this.readString(4)
      const resumeAt = this.pos + len + CRC_WIDTH
      if (fn.call(this, type, len) === false || type === 'IEND') {
        break
      }
      this.pos = resumeAt
    }
  }
}
