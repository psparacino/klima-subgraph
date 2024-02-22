import { ListingCancelled, ListingCreated, ListingFilled, ListingUpdated } from '../generated/Carbonmark/Carbonmark'
import { ProjectInfoUpdated, TestEvent } from '../generated/ProjectInfoFacet/ProjectInfoFacet'
import {
  loadOrCreateActivity,
  loadOrCreateListing,
  loadOrCreateProject,
  loadOrCreatePurchase,
  loadOrCreateUser,
} from './Entities'
import { ZERO_BI } from '../../lib/utils/Decimals'
import { ZERO_ADDRESS } from '../../lib/utils/Constants'
import { ERC20 } from '../generated/Carbonmark/ERC20'
import { ERC1155 } from '../generated/Carbonmark/ERC1155'
import { Bytes, log, DataSourceContext, DataSourceTemplate, dataSource, ipfs, json, BigInt, JSONValueKind } from '@graphprotocol/graph-ts'
import { IpfsProjectInfoVersion } from '../generated/schema'
import { IpfsContent as IpfsContentTemplate } from '../generated/templates'
import { Project } from '../generated/schema'
import { createCategory, createCountry } from './Entities'

export function handleTestEvent(event: TestEvent): void {
  log.info('Test event fired: {}', [event.transaction.hash.toHexString()])

  // if (ctx == null) {
  //   log.info('Context is null: {}', [event.transaction.hash.toHexString()])
  // }
  // let ipfsContent = ctx.getBytes('IpfsContent')

  //   log.info('IpfsContent nope: {}', [ipfsContent.toHexString()])

  let project = Project.load('0x0044c5a5a6f626b673224a3c0d71e851ad3d5153')
  if (project == null) {
    log.info('Project not found: {}', ['0x0044c5a5a6f626b673224a3c0d71e851ad3d5153'])
  } else {
    log.info('Project found: {}', ['0x0044c5a5a6f626b673224a3c0d71e851ad3d5153'])
  }
}

export function handleProjectInfoUpdated(event: ProjectInfoUpdated): void {
  let arrayInfoHash = event.params.projectInfoHash

  let ipfsProjectInfo = new IpfsProjectInfoVersion(arrayInfoHash)
  ipfsProjectInfo.updatedAt = event.block.timestamp
  ipfsProjectInfo.save()

  log.info('ProjectInfoUpdated fired: {}', [arrayInfoHash])
  // IpfsContentTemplate.create(arrayInfoHash)
  let ipfsData = ipfs.cat(arrayInfoHash)

  if (ipfsData === null) {
    return log.error('No data found for hash: {}', [arrayInfoHash])
  }

  let result = json.try_fromBytes(ipfsData)

  let data = result.value
  if (data.kind === JSONValueKind.ARRAY) {
    let projectsArray = data.toArray()

    for (let i = 0; i < projectsArray.length; i++) {
      let projectData = projectsArray[i].toArray()

      // // debug logging, can eventually come out
      // let projectLogMessage = `Project ${i}: [`

      // for (let j = 0; j < projectData.length; j++) {
      //   let element = projectData[j]

      //   let elementValue = ''
      //   if (element.kind == JSONValueKind.STRING) {
      //     elementValue = element.toString()
      //   } else if (element.kind == JSONValueKind.NUMBER) {
      //     elementValue = element.toI64().toString()
      //   } else {
      //     elementValue = '<complex type or unsupported>'
      //   }

      //   projectLogMessage += elementValue

      //   if (j < projectData.length - 1) {
      //     projectLogMessage += ', '
      //   }
      // }

      // projectLogMessage += ']'

      let registry = ''
      // check if project exists from previous upload
      let project = Project.load(projectData[0].toString())

      if (project == null) {
        project = new Project(projectData[0].toString())
        project.key = projectData[1].toString()
        project.name = projectData[3].toString()
        project.methodology = projectData[4].toString()
        project.vintage = BigInt.fromString(projectData[2].toString())
        project.projectAddress = Bytes.fromHexString(projectData[0].toString())
        project.registry = registry
        project.category = projectData[5].toString()
        project.country = projectData[6].toString()
        project.save()

        createCountry(project.country)
        createCategory(project.category)
        project.save()
    
      }
    }
  } else {
    log.info('Parsed content of different kind (not array): {}', [data.kind.toString()])
  }

  // let result = json.fromBytes(data)

  // log.info('JSON parsing succeeded: {}', [result.toString()])

  // let context = new DataSourceContext()

  // let projectInfoHashBytes = Bytes.fromUTF8(arrayInfoHash)

  // context.setBytes('IpfsContent', projectInfoHashBytes)
  // DataSourceTemplate.createWithContext('IpfsContent', [arrayInfoHash], context)
}

export function handleListingCreated(event: ListingCreated): void {
  // Ensure the user entity exists
  loadOrCreateUser(event.params.account)
  loadOrCreateUser(event.transaction.from)

  let project = loadOrCreateProject(event.params.token)

  let listing = loadOrCreateListing(event.params.id.toHexString())

  let ERC20TokenContract = ERC20.bind(event.params.token)
  let ERC1155TokenContract = ERC1155.bind(event.params.token)

  let tokenSymbol = ERC20TokenContract.try_symbol()
  let interfaceID = ERC1155TokenContract.try_supportsInterface(Bytes.fromHexString('0xd9b67a26'))

  if (!tokenSymbol.reverted) {
    listing.tokenStandard = 'ERC20'
    listing.tokenSymbol = tokenSymbol.value
  } else if (!interfaceID.reverted) {
    listing.tokenStandard = 'ERC1155'
    listing.tokenSymbol = project.id
  } else {
    log.error('Token does not implement ERC20 or ERC1155', [])
  }

  listing.totalAmountToSell = event.params.amount
  listing.leftToSell = event.params.amount
  listing.tokenAddress = event.params.token
  listing.tokenId = event.params.tokenId
  listing.active = true
  listing.deleted = false
  listing.singleUnitPrice = event.params.price
  listing.expiration = event.params.deadline
  listing.minFillAmount = event.params.minFillAmount
  listing.project = project.id
  listing.seller = event.params.account
  listing.createdAt = event.block.timestamp
  listing.updatedAt = event.block.timestamp

  listing.save()

  let activity = loadOrCreateActivity(event.transaction.hash.toHexString().concat('ListingCreated'))
  activity.amount = event.params.amount
  activity.price = event.params.price
  activity.timeStamp = event.block.timestamp
  activity.activityType = 'CreatedListing'
  activity.project = listing.project
  activity.user = event.params.account
  activity.listing = listing.id
  activity.seller = event.params.account
  activity.save()
}

export function handleListingUpdated(event: ListingUpdated): void {
  // User should already exist from creating the listing.

  let listing = loadOrCreateListing(event.params.id.toHexString())
  let activity = loadOrCreateActivity(event.transaction.hash.toHexString().concat('ListingUpdated'))

    // always ensure the minFillAmount is updated
    listing.minFillAmount = event.params.newMinFillAmount

  if (event.params.oldAmount != event.params.newAmount) {
    listing.totalAmountToSell = event.params.newAmount
    listing.leftToSell = event.params.newAmount
    listing.updatedAt = event.block.timestamp
    listing.expiration = event.params.newDeadline

    activity.activityType = 'UpdatedQuantity'
    activity.project = listing.project
    activity.user = event.transaction.from
    activity.previousAmount = event.params.oldAmount
    activity.amount = event.params.newAmount
    activity.timeStamp = event.block.timestamp
    activity.seller = listing.seller
    activity.save()
  }

  if (event.params.oldUnitPrice != event.params.newUnitPrice) {
    if (activity.seller != ZERO_ADDRESS) {
      activity = loadOrCreateActivity(event.transaction.hash.toHexString().concat('ListingUpdated2'))
    }

    listing.singleUnitPrice = event.params.newUnitPrice
    listing.updatedAt = event.block.timestamp
    listing.expiration = event.params.newDeadline

    activity.activityType = 'UpdatedPrice'
    activity.project = listing.project
    activity.user = event.transaction.from
    activity.price = event.params.newUnitPrice
    activity.previousPrice = event.params.oldUnitPrice
    activity.timeStamp = event.block.timestamp
    activity.seller = listing.seller
    activity.save()
  }
  if (
    event.params.oldAmount == event.params.newAmount &&
    event.params.oldUnitPrice == event.params.newUnitPrice &&
    event.params.oldDeadline != event.params.newDeadline
  ) {
    if (activity.seller != ZERO_ADDRESS) {
      activity = loadOrCreateActivity(event.transaction.hash.toHexString().concat('ListingUpdated2'))
    }

    listing.singleUnitPrice = event.params.newUnitPrice
    listing.updatedAt = event.block.timestamp
    listing.expiration = event.params.newDeadline

    activity.activityType = 'UpdatedExpiration'
    activity.project = listing.project
    activity.user = event.transaction.from
    activity.price = event.params.newUnitPrice
    activity.previousPrice = event.params.oldUnitPrice
    activity.previousAmount = event.params.oldAmount
    activity.amount = event.params.newAmount
    activity.timeStamp = event.block.timestamp
    activity.seller = listing.seller
    activity.save()
  }

  listing.save()
}

export function handleListingFilled(event: ListingFilled): void {
  // Ensure the buyer user entity exists
  loadOrCreateUser(event.transaction.from)

  let listing = loadOrCreateListing(event.params.id.toHexString())
  let buyerActivty = loadOrCreateActivity(event.transaction.hash.toHexString().concat('Purchase'))
  let sellerActivity = loadOrCreateActivity(event.transaction.hash.toHexString().concat('Sold'))

  listing.leftToSell = listing.leftToSell.minus(event.params.amount)
  if (listing.leftToSell == ZERO_BI) {
    listing.active = false
  }
  listing.updatedAt = event.block.timestamp
  listing.save()

  buyerActivty.amount = event.params.amount
  buyerActivty.price = listing.singleUnitPrice
  buyerActivty.timeStamp = event.block.timestamp
  buyerActivty.activityType = 'Purchase'
  buyerActivty.project = listing.project
  buyerActivty.user = event.transaction.from
  buyerActivty.listing = listing.id
  buyerActivty.seller = listing.seller
  buyerActivty.buyer = event.transaction.from
  buyerActivty.save()

  sellerActivity.amount = event.params.amount
  sellerActivity.price = listing.singleUnitPrice
  sellerActivity.timeStamp = event.block.timestamp
  sellerActivity.activityType = 'Sold'
  sellerActivity.project = listing.project
  sellerActivity.user = event.params.account
  sellerActivity.listing = listing.id
  sellerActivity.seller = listing.seller
  sellerActivity.buyer = event.transaction.from
  sellerActivity.save()

  let purchase = loadOrCreatePurchase(event.transaction.hash)
  purchase.price = listing.singleUnitPrice
  purchase.amount = event.params.amount
  purchase.timeStamp = event.block.timestamp
  purchase.user = event.transaction.from
  purchase.listing = listing.id
  purchase.save()
}

export function handleListingCancelled(event: ListingCancelled): void {
  let listing = loadOrCreateListing(event.params.id.toHexString())

  listing.active = false
  listing.deleted = true
  listing.leftToSell = ZERO_BI
  listing.updatedAt = event.block.timestamp
  listing.save()

  let activity = loadOrCreateActivity(event.transaction.hash.toHexString().concat('DeletedListing'))
  activity.timeStamp = event.block.timestamp
  activity.activityType = 'DeletedListing'
  activity.project = listing.project
  activity.user = event.transaction.from
  activity.listing = listing.id
  activity.seller = listing.seller
  activity.save()
}
