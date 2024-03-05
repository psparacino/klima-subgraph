import { Bytes, dataSource, log, json } from '@graphprotocol/graph-ts'
import { JSONValueKind, BigInt } from '@graphprotocol/graph-ts'
import { CarbonProject } from '../../generated/schema'

export function handleCreateProjects(content: Bytes): void {
  let hash = dataSource.stringParam()
  let result = json.try_fromBytes(content)

  let data = result.value
  if (data.kind === JSONValueKind.ARRAY) {
    let projectsArray = data.toArray()

    for (let i = 0; i < projectsArray.length; i++) {
      let projectData = projectsArray[i].toArray()

      let vintage = projectData[2].toString()
      let registry = projectData[1].toString().split('-')[0]
      /**
       * in order to not collide with the on-chain entity,
       * add -ipfs to the id here in order to designate as ipfs entity and to remove in the on-chain entity
       */
      let projectId = projectData[1].toString() + '-' + 'ipfs'

      let project = CarbonProject.load(projectId)

      if (project == null) {
        project = new CarbonProject(projectId)
        project.id = projectData[1].toString()
        project.name = projectData[3].toString()
        project.methodologies = projectData[4].toString()
        project.registry = registry
        project.category = projectData[5].toString()
        project.country = projectData[6].toString()
        project.ipfsProjectInfo = hash
        project.save()
      }
    }
  } else {
    log.info('Parsed content of different kind (not array): {}', [data.kind.toString()])
  }
}
