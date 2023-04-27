import { BigDecimal, BigInt, Address } from '@graphprotocol/graph-ts'
import { BondV1 } from '../../../bonds/generated/BCTBondV1/BondV1'
import { UniswapV2Pair } from '../../../bonds/generated/BCTBondV1/UniswapV2Pair'
import { getDaoFee } from '../../../bonds/src/utils/DaoFee'
import { IBondable } from '../IBondable'
import { IToken } from '../../tokens/IToken'

import * as constants from '../../utils/Constants'
import { toDecimal } from '../../utils/Decimals'
import { KLIMA } from '../../tokens/impl/KLIMA'
import { MCO2 } from '../../tokens/impl/MCO2'
import { PriceUtil } from '../../utils/Price'

export class KLIMAMCO2Bond implements IBondable {
  private contractAddress: Address

  private klimaToken: IToken
  private mco2Token: IToken

  constructor(constractAddress: Address) {
    this.contractAddress = constractAddress
    this.klimaToken = new KLIMA()
    this.mco2Token = new MCO2()
  }

  getToken(): IToken {
    return this.mco2Token
  }

  getBondName(): string {
    return constants.KLIMAMCO2_LPBOND_TOKEN
  }

  getBondPrice(): BigDecimal {
    let bond = BondV1.bind(this.contractAddress)
    const bondPriceInUsd = bond.bondPriceInUSD()

    return toDecimal(bondPriceInUsd, this.getToken().getDecimals())
  }

  getBondDiscount(blockNumber: BigInt): BigDecimal {
    const bondPrice = this.getBondPrice()
    const marketPrice = this.getToken().getMarketPrice(blockNumber)

    return PriceUtil.calculateBondDiscount(bondPrice, marketPrice)
  }

  getDaoFeeForBondPayout(payout: BigDecimal): BigDecimal {
    return getDaoFee(this.contractAddress, payout)
  }

  parseBondPrice(priceInUSD: BigInt): BigDecimal {
    return toDecimal(priceInUSD, 18)
  }

  parseBondTokenValueFormatted(rawPrice: BigInt): BigDecimal {
    return toDecimal(rawPrice, 18)
  }

  getCarbonCustodied(depositAmount: BigInt): BigDecimal {
    return PriceUtil.getDiscountedPairCO2(depositAmount, constants.KLIMA_MCO2_PAIR, this.klimaToken, this.mco2Token)
  }

  getTreasuredAmount(): BigDecimal {
    let pair = UniswapV2Pair.bind(constants.KLIMA_MCO2_PAIR)
    let lp_token_2 = toDecimal(pair.getReserves().value1, this.getToken().getDecimals())

    return lp_token_2
  }
}
