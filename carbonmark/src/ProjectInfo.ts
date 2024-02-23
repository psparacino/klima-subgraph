import { Bytes, dataSource, log, json } from '@graphprotocol/graph-ts'
import { JSONValueKind, BigInt } from '@graphprotocol/graph-ts'
import { Project } from '../generated/schema'
import { createCategory, createCountry } from './Entities'

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

      let projectId = projectData[0].toString() + '-' + vintage

      let project = Project.load(projectId)

      if (project == null) {
        project = new Project(projectId)
        project.key = projectData[1].toString()
        project.name = projectData[3].toString()
        project.methodology = projectData[4].toString()
        project.vintage = BigInt.fromString(vintage)
        project.projectAddress = Bytes.fromHexString(projectData[0].toString())
        project.registry = registry
        project.category = projectData[5].toString()
        project.country = projectData[6].toString()
        project.ipfsProjectInfo = hash
        project.save()

        createCountry(project.country)
        createCategory(project.category)
      }
    }
  } else {
    log.info('Parsed content of different kind (not array): {}', [data.kind.toString()])
  }
}
