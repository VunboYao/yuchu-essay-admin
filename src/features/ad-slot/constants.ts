import type { AdSlotWriteInput } from './schemas'

/** 与 seed / api-reference 对齐的下载激励视频身份；不含 adUnitId / status */
export const DOWNLOAD_GATE_IDENTITY = {
  slotKey: 'download_rewarded_video',
  slotName: '资料下载激励视频',
  page: 'download',
  position: 'gate',
  adType: 'rewarded_video',
} as const satisfies Pick<AdSlotWriteInput, 'slotKey' | 'slotName' | 'page' | 'position' | 'adType'>
