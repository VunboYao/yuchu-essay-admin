import { useState } from 'react'
import { BodyImageList, type BodyImageRow } from '../components/BodyImageList'

export function Component() {
  const [bodyImages, setBodyImages] = useState<BodyImageRow[]>([])
  return <BodyImageList value={bodyImages} onChange={setBodyImages} />
}
