import { base64ToImageData } from 'ilx1-x-tool'

const DEFAULT_CONFIG_ARRAY = [1, 2, 0, 0, 1, 0]

const normalizeConfigArray = (configArray: number[] = []) => {
  return DEFAULT_CONFIG_ARRAY.map((defaultValue, index) => {
    const value = Number(configArray[index])
    return Number.isFinite(value) ? Math.trunc(value) : defaultValue
  })
}

const formatBytes = (bytes: Uint8Array, outputMode: number) => {
  const data = Array.from(bytes)
  if (outputMode === 0) {
    return data.map(value => `0x${value.toString(16).padStart(2, '0')}`)
  }
  return bytes
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

const sampleMono = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
  configArray: number[]
) => {
  const points = new Uint8Array(width * height)

  for (let index = 0, pointIndex = 0; index < data.length; index += 4, pointIndex++) {
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    points[pointIndex] = gray > threshold ? 1 : 0
  }

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

const sampleColor565 = (data: Uint8ClampedArray, configArray: number[]) => {
  const bytes = new Uint8Array((data.length / 4) * 2)
  let outIndex = 0

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    const color = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
    let high = (color >> 8) & 0xff
    let low = color & 0xff

    if (configArray[0] == 0 || configArray[2] == 1) {
      high = ~high & 0xff
      low = ~low & 0xff
    }

    bytes[outIndex++] = high
    bytes[outIndex++] = low
  }

  return bytes
}

const sampleColor888 = (data: Uint8ClampedArray, configArray: number[]) => {
  const bytes = new Uint8Array((data.length / 4) * 3)
  let outIndex = 0

  for (let index = 0; index < data.length; index += 4) {
    let r = data[index]
    let g = data[index + 1]
    let b = data[index + 2]

    if (configArray[0] == 0 || configArray[2] == 1) {
      r = ~r & 0xff
      g = ~g & 0xff
      b = ~b & 0xff
    }

    bytes[outIndex++] = r
    bytes[outIndex++] = g
    bytes[outIndex++] = b
  }

  return bytes
}

const sampleColor = (data: Uint8ClampedArray, configArray: number[]) => {
  return configArray[5] === 1
    ? sampleColor888(data, configArray)
    : sampleColor565(data, configArray)
}

export const generateImageData = async (
  picData: string,
  thresholdData: number,
  configArray: number[]
) => {
  const config = normalizeConfigArray(configArray)
  const imageData = await base64ToImageData(picData)
  const bytes =
    config[4] === 1
      ? sampleMono(
          imageData.data,
          imageData.width,
          imageData.height,
          Number.isFinite(thresholdData) ? thresholdData : 120,
          config
        )
      : sampleColor(imageData.data, config)

  return formatBytes(bytes, config[3])
}
