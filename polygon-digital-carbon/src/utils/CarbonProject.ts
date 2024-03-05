import { Address, log } from '@graphprotocol/graph-ts'
import { VERRA_PROJECT_NAMES } from '../../../lib/utils/VerraProjectInfo'
import { CarbonProject } from '../../generated/schema'
import { ProjectInfo } from '../../generated/ProjectInfo/ProjectInfo'
import { IpfsProjectInfo } from '../../generated/schema'

export function loadOrCreateCarbonProject(registry: string, projectID: string): CarbonProject | null {
  let project = CarbonProject.load(projectID)

  if (project == null) {
    const address = Address.fromString('0xd412DEc7cc5dCdb41bCD51a1DAb684494423A775')
    let contract = ProjectInfo.bind(address)
    let hash = contract.getProjectInfoHash()
    let ipfsData = IpfsProjectInfo.load(hash)

    if (ipfsData == null) {
      log.error('IPFS data not found for hash: {}', [hash])
      return null
    }
    let projects = ipfsData.projectList.load()
    
    project = new CarbonProject(projectID)
    project.registry = registry
    project.projectID = projectID
    project.name = ''
    project.methodologies = ''
    project.category = ''
    project.country = ''
    project.region = ''

    // Set known values for Verra projects
    if (registry == 'VERRA') {
      for (let i = 0; i < VERRA_PROJECT_NAMES.length; i++) {
        if (projectID == VERRA_PROJECT_NAMES[i][0]) {
          project.name = VERRA_PROJECT_NAMES[i][1]
          project.country = VERRA_PROJECT_NAMES[i][2]
          break
        }
      }
    }

    project.save()
  }
  return project as CarbonProject
}
