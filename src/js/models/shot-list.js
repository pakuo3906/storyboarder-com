const fs = require('fs')
const path = require('path')
const { PerspectiveCamera } = require('three')

const fountain = require('../vendor/fountain')
const fountainDataParser = require('../fountain-data-parser')

const degToRad = deg => deg * Math.PI / 180
const radToDeg = rad => rad * 180 / Math.PI

const getFovAsFocalLength = (fov, aspect) => new PerspectiveCamera(fov, aspect).getFocalLength()

const comparable = (a, b, tolerance) => Math.abs(a - b) < tolerance

const getCameraSetups = (scene, tolerances = { rotation: degToRad(60), position: 6 }) => {
  let setups = []
  for (let board of scene.boards) {
    if (!board.sg) continue

    let cameras = Object.values(board.sg.data.sceneObjects).filter(o => o.type === 'camera')
    let count = 0

    for (let camera of cameras) {
      let matchingSetup

      for (let setup of setups) {
        // is it probably the same camera?
        if (
          comparable(setup.camera.roll, camera.roll, tolerances.rotation) &&
          comparable(setup.camera.rotation, camera.rotation, tolerances.rotation) &&
          comparable(setup.camera.tilt, camera.tilt, tolerances.rotation) &&
          comparable(setup.camera.x, camera.x, tolerances.position) &&
          comparable(setup.camera.y, camera.y, tolerances.position) &&
          comparable(setup.camera.z, camera.z, tolerances.position)
        ) {
          matchingSetup = setup.camera.id
        }
      }

      if (matchingSetup) {
        // console.log('update')
        let setup = setups.find(o => o.camera.id === matchingSetup)
        setup.shots.push(board)
      } else {
        // console.log('insert')
        count = count + 1
        setups.push({
          number: count,

          fov: camera.fov,
          height: camera.z,

          camera,
          shots: [board]
        })
      }
    }
  }

  return setups
}

const getCameraById = (board, cameraId) => Object.values(board.sg.data.sceneObjects).find(o => o.id === cameraId)

const createShot = ({ setupNumber, board, camera, aspectRatio }) => ({
  setupNumber,

  number: board.number,

  uid: board.uid,
  duration: board.duration,

  ...(camera && {
    fov: getFovAsFocalLength(camera.fov, aspectRatio).toFixed() + 'mm',
    x: camera.x.toFixed(2) + 'm',
    y: camera.y.toFixed(2) + 'm',
    height: camera.z.toFixed(2) + 'm',
    rotation: radToDeg(camera.rotation).toFixed(2) + '°',
    tilt: radToDeg(camera.tilt).toFixed(2) + '°',
    roll: radToDeg(camera.roll).toFixed(2) + '°',

    distanceToClosestCharacter: undefined, // TODO
  }),

  beats: []
})

const createBeat = ({ board, camera }) => ({
  uid: board.uid,
  dialogue: board.dialogue,
  action: board.action,
  notes: board.notes,
  number: board.number,
  camera
})

const shotsReducer = (acc, board) => {
  if (acc.values.length === 0) {
    acc.values.push(
      createShot({ setupNumber: acc.count, board, camera: acc.camera, aspectRatio: acc.aspectRatio })
    )
  } else {
    let shot = acc.values[acc.values.length - 1]

    let original = acc.camera
    let current = board.sg && getCameraById(board, board.sg.data.activeCamera)

    let diff = {
      roll: original.roll - current.roll,
      rotation: original.rotation - current.rotation,
      tilt: original.tilt - current.tilt,
      x: original.x - current.x,
      y: original.y - current.y,
      z: original.z - current.z
    }
    for (let d in diff) {
      if (
        diff[d] === 0 ||
        diff[d].toFixed(4) === '0.0000'
      ) delete diff[d]
    }
    let changed = Object.values(diff).length > 0

    const plusOrMinusString = v => v > 0
      ? '+' + v.toString()
      : v.toString()

    shot.beats.push(
      createBeat({
        board,
        camera: changed
          ? {
            x: diff.x && (plusOrMinusString(diff.x.toFixed(2)) + 'm'),
            y: diff.y && (plusOrMinusString(diff.y.toFixed(2)) + 'm'),
            height: diff.z && (plusOrMinusString(diff.z.toFixed(2)) + 'm'),
            rotation: diff.rotation && (plusOrMinusString(radToDeg(diff.rotation).toFixed(2)) + '°'),
            tilt: diff.tilt && (plusOrMinusString(radToDeg(diff.tilt).toFixed(2)) + '°'),
            roll: diff.roll && (plusOrMinusString(radToDeg(diff.roll).toFixed(2)) + '°'),
          }
          : undefined
        }
      )
    )
  }
  return acc
}

const getShots = (setups, scene) =>
  setups.map((setup, n) => 
    setup.shots.reduce(shotsReducer, { count: n + 1, values: [], camera: setup.camera, aspectRatio: scene.aspectRatio }).values)

const getShotListForScene = scene => {
  let setups = getCameraSetups(scene)
  let shots = getShots(setups, scene)

  return {
    setups: setups.map(setup => ({
      number: setup.number,
      fov: getFovAsFocalLength(
        setup.fov,
        scene.aspectRatio
      ).toFixed() + 'mm',
      height: setup.height.toFixed(2) + 'm',
      shots: setup.shots.map(shot => shot.uid)
    })),
    shots
  }
}

const filenameify = string =>
  string
    .substring(0, 50)
    .replace(/\|&;\$%@"<>\(\)\+,/g, '')
    .replace(/\./g, '')
    .replace(/ - /g, ' ')
    .replace(/ /g, '-')
    .replace(/[|&;/:$%@"{}?|<>()+,]/g, '-')

const getSceneFolderName = node => {
  let desc = node.synopsis
    ? node.synopsis
    : node.slugline

  return `Scene-${node.scene_number}-${filenameify(desc)}-${node.scene_id}`
}

const getShotListForProject = scriptFilePath => {
  const projectPath = path.dirname(scriptFilePath)
  const data = fs.readFileSync(scriptFilePath, 'utf-8')

  let parsedData = fountain.parse(data, true)

  let locations = fountainDataParser.getLocations(parsedData.tokens)
  let characters = fountainDataParser.getCharacters(parsedData.tokens)

  let scriptData = fountainDataParser.parse(parsedData.tokens)

  let folders = Object.values(scriptData)
    .filter(node => node.type === 'scene')
    .map(node => {
      let name = getSceneFolderName(node)

      return {
        name,
        storyboarderFilePath: path.join('storyboards', name, `${name}.storyboarder`),
        node
      }
    })

  return {
    scenes: folders.map(folder => {
      let scene = JSON.parse(fs.readFileSync(path.join(projectPath, folder.storyboarderFilePath)))

      let number = folder.node.scene_number
      let id = folder.node.scene_id
      let slugline = folder.node.slugline
      let synopsis = folder.node.synopsis

      let characters = [] // TODO

      return {
        number,
        id,
        slugline,
        synopsis,

        characters,

        ...getShotListForScene(scene)
      }
    })
  }
}

module.exports = {
  getFovAsFocalLength,
  getSceneFolderName,

  getCameraSetups,
  getShots,
  getShotListForScene,
  getShotListForProject  
}
