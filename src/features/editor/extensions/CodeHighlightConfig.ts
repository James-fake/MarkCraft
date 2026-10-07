import { createLowlight, common } from 'lowlight'

const lowlightInstance = createLowlight(common)

export function getLowlightInstance() {
  return lowlightInstance
}

export default lowlightInstance
