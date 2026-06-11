import { getItem, setItem } from '../storage'

export const SIZE_PRESET_LIMIT = 8

export type SizePreset = {
  width: string
  height: string
  count: number
  updatedAt: number
}

const PRESET_STORAGE_KEY = 'presetArray'

const createEmptySizePreset = (): SizePreset => ({
  width: '',
  height: '',
  count: 0,
  updatedAt: 0,
})

const toPositiveInt = (value: unknown) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.floor(num))
}

const toNonNegativeInt = (value: unknown) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.floor(num))
}

const getValidPresetList = (value: unknown, limit = SIZE_PRESET_LIMIT) => {
  const source = Array.isArray(value) ? value : []
  const presetMap = new Map<string, SizePreset>()

  source.forEach((item, index) => {
    const data =
      item != null && typeof item == 'object'
        ? (item as Record<string, unknown>)
        : {}
    const width = toPositiveInt(data.width)
    const height = toPositiveInt(data.height)

    if (!width || !height) return

    const key = `${width}x${height}`
    const count = toPositiveInt(data.count) || 1
    const updatedAt = toNonNegativeInt(data.updatedAt) || source.length - index
    const oldPreset = presetMap.get(key)

    if (oldPreset) {
      oldPreset.count += count
      oldPreset.updatedAt = Math.max(oldPreset.updatedAt, updatedAt)
    } else {
      presetMap.set(key, {
        width: String(width),
        height: String(height),
        count,
        updatedAt,
      })
    }
  })

  return Array.from(presetMap.values())
    .sort((a, b) => {
      if (b.count != a.count) return b.count - a.count
      if (b.updatedAt != a.updatedAt) return b.updatedAt - a.updatedAt
      if (Number(a.width) != Number(b.width)) return Number(a.width) - Number(b.width)
      return Number(a.height) - Number(b.height)
    })
    .slice(0, limit)
}

export const normalizeSizePresetArray = (
  value: unknown,
  limit = SIZE_PRESET_LIMIT
) => {
  const presetList = getValidPresetList(value, limit)
  return [
    ...presetList,
    ...Array.from(
      { length: Math.max(0, limit - presetList.length) },
      createEmptySizePreset
    ),
  ]
}

export const readSizePresetArray = () => {
  try {
    return normalizeSizePresetArray(JSON.parse(getItem(PRESET_STORAGE_KEY)))
  } catch (error) {
    return normalizeSizePresetArray([])
  }
}

export const saveSizePresetArray = (presets: unknown) => {
  const presetArray = normalizeSizePresetArray(presets)
  setItem(PRESET_STORAGE_KEY, JSON.stringify(presetArray))
  return presetArray
}

export const recordSizePreset = (widthValue: unknown, heightValue: unknown) => {
  const width = toPositiveInt(widthValue)
  const height = toPositiveInt(heightValue)

  if (!width || !height) return false

  const key = `${width}x${height}`
  const presetList = getValidPresetList(readSizePresetArray())
  const oldPreset = presetList.find(
    item => `${item.width}x${item.height}` == key
  )

  if (oldPreset) {
    oldPreset.count += 1
    oldPreset.updatedAt = Date.now()
  } else {
    presetList.push({
      width: String(width),
      height: String(height),
      count: 1,
      updatedAt: Date.now(),
    })
  }

  saveSizePresetArray(presetList)
  return true
}
