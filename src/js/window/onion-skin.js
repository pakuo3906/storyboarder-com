const CAF = require('caf')
const fs = require('fs')
const path = require('path')

const exporterCommon = require('../exporters/common')
const boardModel = require('../models/board')

class OnionSkin {
  constructor ({ width, height, onSetEnabled, onRender }) {
    this.width = width
    this.height = height
    this.onSetEnabled = onSetEnabled
    this.onRender = onRender

    this.cancelable = undefined

    this.state = {
      status: 'NotAsked',
      enabled: false,
      currBoard: undefined,
      prevBoard: undefined,
      nextBoard: undefined,
      shouldLoad: false
    }

    this.canvas = document.createElement('canvas')
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.context = this.canvas.getContext('2d')

    this.tintCanvas = document.createElement('canvas')
    this.tintCanvas.width = this.width
    this.tintCanvas.height = this.height
    this.tintContext = this.tintCanvas.getContext('2d')

    this.onSetEnabled(this.state.enabled)
  }

  setState ({ pathToImages, currBoard, prevBoard, nextBoard, enabled }) {
    const currBoardChanged = currBoard && ((this.state.currBoard == null) || (currBoard.uid != this.state.currBoard.uid))
    const prevBoardChanged = prevBoard && ((this.state.prevBoard == null) || (prevBoard.uid != this.state.prevBoard.uid))
    const nextBoardChanged = nextBoard && ((this.state.nextBoard == null) || (nextBoard.uid != this.state.nextBoard.uid))
    const anyBoardChanged = currBoardChanged || prevBoardChanged || nextBoardChanged

    const enabledChanged = enabled != this.state.enabled

    this.state.pathToImages = pathToImages || this.state.pathToImages
    this.state.currBoard = currBoard || this.state.currBoard
    this.state.prevBoard = prevBoard || this.state.prevBoard
    this.state.nextBoard = nextBoard || this.state.nextBoard

    if (enabledChanged) {
      this.state.enabled = enabled
      this.onSetEnabled(this.state.enabled)
    }

    this.state.shouldLoad = (this.state.enabled && (anyBoardChanged || enabledChanged))
  }

  // TODO should we use SketchPane's LayerCollection to setup and render these composites for us?
  // TODO cache images for re-use?
  async load (token = undefined) {
    if (!this.state.shouldLoad) return

    console.log('%conion load', 'color:purple')
    console.log('onion this.cancelable', this.cancelable)

    const { pathToImages, currBoard, prevBoard, nextBoard } = this.state

    // cancel any in-progress loading
    if (this.cancelable && // token exists
        this.cancelable !== token && // token is old
        !this.cancelable.signal.aborted // token has not been aborted
    ) {
      console.log('%conion cancel existing', 'color:purple')
      this.cancelable.abort('cancel')
      this.cancelable = undefined
    }

    this.cancelable = token || new CAF.cancelToken()

    console.log(`%conion cancelable ${this.cancelable}`, 'color:purple')

    // reset
    this.context.clearRect(0, 0, this.width, this.height)
    this.onRender(this.canvas)

    // start a new loading process
    try {
      let fn = CAF(this._load.bind(this))
      await fn(this.cancelable, { pathToImages, currBoard, prevBoard, nextBoard })
      console.log('%conion skin ok', 'color:green')
    } catch (err) {
      console.log('%conion skin failed', 'color:orange')
      console.error(err)
      this.state.status = 'Failed'
      throw err
    }
  }

  * _load(signal, { pathToImages, currBoard, prevBoard, nextBoard }) {
    console.log(`%c[OnionSkin#_load]`, "color:blue")
    this.state.status = 'Loading'

    // this.context.clearRect(0, 0, this.width, this.height)

    this.context.fillStyle = '#fff'
    this.context.fillRect(0, 0, this.width, this.height)

    for (let board of [prevBoard, nextBoard]) {
      if (!board) continue

      let color = board === prevBoard ? '#00f' : '#f00'
      console.log(`%c[OnionSkin#_load] start board:${board.index}`, `color:${color}`)

      try {

        let filename = boardModel.boardFilenameForPosterFrame(board)
        let filepath = path.join(pathToImages, filename)

        let lastModified
        try {
          // file exists, cache based on mtime
          lastModified = fs.statSync(filepath).mtimeMs
        } catch (err) {
          // file not found, cache buster based on current time
          lastModified = Date.now()
        }

        // load the posterframe
        let image = yield exporterCommon.getImage(filepath + '?' + lastModified)

        // tint
        this.tintContext.save()
        this.tintContext.clearRect(0, 0, this.width, this.height)
        this.tintContext.globalCompositeOperation = 'normal'
        // white box as a base
        this.tintContext.fillStyle = '#fff'
        this.tintContext.fillRect(0, 0, this.width, this.height)
        // draw the image
        this.tintContext.drawImage(image, 0, 0)
        // draw the screened color on top
        this.tintContext.globalCompositeOperation = 'screen'
        this.tintContext.fillStyle = color
        this.tintContext.fillRect(0, 0, this.width, this.height)
        this.tintContext.restore()

        // draw tinted canvas to main context
        this.context.save()
        this.context.globalAlpha = 0.35
        this.context.globalCompositeOperation = 'multiply'
        this.context.drawImage(this.tintContext.canvas, 0, 0)
        this.context.restore()

        this.state.status = 'Success'
        this.onRender(this.canvas)
      } catch (err) {
        // couldn't load onion skin art
        console.log('could not load onion skin art')
        console.warn(err)
        this.state.status = 'Failed'
        // throw err
      }
    }

    console.log(`%c[OnionSkin#_load] complete`, `color:green`)
  }
}

module.exports = OnionSkin
