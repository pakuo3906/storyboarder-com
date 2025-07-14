const CanvasBufferOutputFileStrategy = require('./canvas-buffer-ouput-file')

class CanvasBuffer {
  constructor(options) {
    this.canvasPool = []
    this.buffer = []
    this.strategy = options && options.outputStrategy || new CanvasBufferOutputFileStrategy()
  }

  addToBuffer(sourceCanvases, metaData) {
    // let start = Date.now()
    let sourceCanvas = sourceCanvases[0]
    if(!sourceCanvas) return
    let bufferCanvas = this._getCanvasForBuffer()
    bufferCanvas.width = sourceCanvas.width
    bufferCanvas.height = sourceCanvas.height
    let bufferContext = bufferCanvas.getContext('2d')
    for(let sourceCanvas of sourceCanvases) {
      bufferContext.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height)
    }
    this.buffer.push({canvas: bufferCanvas, metaData: metaData})

    // let end = Date.now()
    // console.log(`${end} - ${start} = ${end-start}`)
  }

  flushBuffer() {
    return this.strategy.flush(this.buffer, this.canvasPool)
  }

  _getCanvasForBuffer() {
    if(this.canvasPool.length > 0) {
      return this.canvasPool.splice(0, 1)[0]
    }

    return document.createElement('canvas')
  }
}

module.exports = CanvasBuffer