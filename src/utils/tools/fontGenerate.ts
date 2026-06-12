type FontGenerateConfig = {
  text: string
  fontFamily: string
  width: number
  height: number
  fontSize: number
  fontWeight: string
  offsetX: number
  offsetY: number
  configArray: number[]
}

const getBitMask = (offset: number, configArray: number[]) => {
  return configArray[2] != 0 ? 1 << (7 - offset) : 1 << offset
}

const getPointValue = (value: number, configArray: number[]) => {
  return configArray[0] !== 0 ? (value === 0 ? 1 : 0) : value
}

const writePoint = (
  bytes: Uint8Array,
  byteIndex: number,
  bitMask: number,
  pointValue: number
) => {
  if (pointValue === 0) {
    bytes[byteIndex] |= bitMask
  } else {
    bytes[byteIndex] &= ~bitMask
  }
}

const sampleRow = (
  points: Uint8Array,
  width: number,
  height: number,
  configArray: number[]
) => {
  const bytesPerRow = Math.ceil(width / 8)
  const bytes = new Uint8Array(bytesPerRow * height)

  for (let index = 0; index < points.length; index++) {
    const x = index % width
    const y = Math.floor(index / width)
    const byteIndex = y * bytesPerRow + Math.floor(x / 8)
    const bitMask = getBitMask(x % 8, configArray)
    const pointValue = getPointValue(points[index], configArray)
    writePoint(bytes, byteIndex, bitMask, pointValue)
  }

  return bytes
}

const sampleCol = (
  points: Uint8Array,
  width: number,
  height: number,
  configArray: number[]
) => {
  const bytesPerCol = Math.ceil(height / 8)
  const bytes = new Uint8Array(bytesPerCol * width)

  for (let index = 0; index < points.length; index++) {
    const x = index % width
    const y = Math.floor(index / width)
    const byteIndex = x * bytesPerCol + Math.floor(y / 8)
    const bitMask = getBitMask(y % 8, configArray)
    const pointValue = getPointValue(points[index], configArray)
    writePoint(bytes, byteIndex, bitMask, pointValue)
  }

  return bytes
}

const sampleColRow = (
  points: Uint8Array,
  width: number,
  height: number,
  configArray: number[]
) => {
  const bytes = new Uint8Array(Math.ceil(height / 8) * width)

  for (let index = 0; index < points.length; index++) {
    const x = index % width
    const y = Math.floor(index / width)
    const byteIndex = x + Math.floor(y / 8) * width
    const bitMask = getBitMask(y % 8, configArray)
    const pointValue = getPointValue(points[index], configArray)
    writePoint(bytes, byteIndex, bitMask, pointValue)
  }

  return bytes
}

const sampleRowCol = (
  points: Uint8Array,
  width: number,
  height: number,
  configArray: number[]
) => {
  const bytes = new Uint8Array(Math.ceil(width / 8) * height)

  for (let index = 0; index < points.length; index++) {
    const x = index % width
    const y = Math.floor(index / width)
    const byteIndex = Math.floor(x / 8) * height + y
    const bitMask = getBitMask(x % 8, configArray)
    const pointValue = getPointValue(points[index], configArray)
    writePoint(bytes, byteIndex, bitMask, pointValue)
  }

  return bytes
}

const samplePoints = (
  points: Uint8Array,
  width: number,
  height: number,
  configArray: number[]
) => {
  switch (configArray[1]) {
    case 0:
      return sampleRow(points, width, height, configArray)
    case 1:
      return sampleCol(points, width, height, configArray)
    case 2:
      return sampleColRow(points, width, height, configArray)
    case 3:
      return sampleRowCol(points, width, height, configArray)
    default:
      return sampleColRow(points, width, height, configArray)
  }
}

const formatBytes = (bytes: Uint8Array, outputMode: number) => {
  const data = Array.from(bytes)
  if (outputMode === 0) {
    return data.map(value => `0x${value.toString(16).padStart(2, '0')}`)
  }
  return data
}

export const getUniqueFontText = (text: string) => {
  return Array.from(
    new Set(Array.from(text).filter(char => !/[\r\n\t]/.test(char)))
  ).join('')
}

export const generateFontData = (config: FontGenerateConfig) => {
  const width = Math.max(1, Math.floor(config.width))
  const height = Math.max(1, Math.floor(config.height))
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) return []

  canvas.width = width
  canvas.height = height

  return Array.from(getUniqueFontText(config.text)).map(char => {
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${config.fontWeight} ${config.fontSize}px "${config.fontFamily}"`
    ctx.fillText(char, width / 2 + config.offsetX, height / 2 + config.offsetY)

    const imageData = ctx.getImageData(0, 0, width, height)
    const points = new Uint8Array(width * height)

    for (let index = 0, pointIndex = 0; index < imageData.data.length; index += 4, pointIndex++) {
      const r = imageData.data[index]
      const g = imageData.data[index + 1]
      const b = imageData.data[index + 2]
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      points[pointIndex] = gray > 120 ? 1 : 0
    }

    return formatBytes(
      samplePoints(points, width, height, config.configArray),
      config.configArray[3]
    )
  })
}
