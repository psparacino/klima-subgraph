import { log, ipfs, json, JSONValueKind, BigInt, Bytes, Address, ValueKind, dataSource } from '@graphprotocol/graph-ts'
import { ProjectInfoUpdated, TestEvent, ProjectInfoFacet } from '../generated/ProjectInfoFacet/ProjectInfoFacet'
import { IpfsProjectInfo, Project } from '../generated/schema'
import { createCategory, createCountry } from './Entities'
import { IpfsContent as IpfsContentTemplate } from '../generated/templates'

// this is for debugging only and will be removed
export function handleTestEvent(event: TestEvent): void {
  log.info('Test event fired: {}', [event.transaction.hash.toHexString()])

  // this vintage can't be used though as it's not in any event. need better way get to get vintage for 1155 tokens
  let test = Project.load('0x01181906308e8be2594677c66ed312434ddb97d0-2015')
  // test will be null as the project entity was created in an ipfs handler

  const address = Address.fromString('0x264A841528B6f44440507dc188e920B68dBd1E33')

  let facet = ProjectInfoFacet.bind(address)

  let hash = facet.getProjectInfoHash()

  let ipfsData = IpfsProjectInfo.load(hash)

  if (ipfsData == null) {
    log.error('IPFS data not found for hash: {}', [hash])
    return
  }
  if (ipfsData !== null && ipfsData.projectList) {
    let projects = ipfsData.projectList.load()
    log.info('Project count: {}', [projects.length.toString()])
    // projects are stored here as Project[]

    for (let i = 0; i < projects.length; i++) {
      let projectData = projects[i]
      let project = Project.load(projectData.id)
      log.info('Project ID: {}', [projectData.id])
      // if (project == null) {
      //   project = new Project(projectData.id)
      //   project.key = projectData.key
      //   project.name = projectData.name
      //   project.methodology = projectData.methodology
      //   project.vintage = BigInt.fromString(projectData.vintage.toString())
      //   project.projectAddress = Bytes.fromHexString(projectData.projectAddress.toHexString())
      //   project.registry = 'TEST THIS'
      //   project.category = projectData.category
      //   project.country = projectData.country

      //   createCountry(project.country)
      //   createCategory(project.category)
      //   project.save()
      // }
    }
  } else {
    log.error('IPFS data not found or projectList is undefined for hash: {}', [hash])
  }
}

export function handleProjectInfoUpdated(event: ProjectInfoUpdated): void {
  let hash = event.params.projectInfoHash
  log.info('ProjectInfoUpdated fired: {}', [hash])

  IpfsContentTemplate.create(hash)

  const projectInfo = IpfsProjectInfo.load(hash)

  if (projectInfo === null) {
    let info = new IpfsProjectInfo(hash)
    info.save()
    return
  }
}
