import type * as types from './types';
import type { ConfigOptions, FetchResponse } from 'api/dist/core'
import Oas from 'oas';
import APICore from 'api/dist/core';
import definition from './openapi.json';

class SDK {
  spec: Oas;
  core: APICore;

  constructor() {
    this.spec = Oas.init(definition);
    this.core = new APICore(this.spec, 'rarible/v0.1 (api/6.1.2)');
  }

  /**
   * Optionally configure various options that the SDK allows.
   *
   * @param config Object of supported SDK options and toggles.
   * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
   * should be represented in milliseconds.
   */
  config(config: ConfigOptions) {
    this.core.setConfig(config);
  }

  /**
   * If the API you're using requires authentication you can supply the required credentials
   * through this method and the library will magically determine how they should be used
   * within your API request.
   *
   * With the exception of OpenID and MutualTLS, it supports all forms of authentication
   * supported by the OpenAPI specification.
   *
   * @example <caption>HTTP Basic auth</caption>
   * sdk.auth('username', 'password');
   *
   * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
   * sdk.auth('myBearerToken');
   *
   * @example <caption>API Keys</caption>
   * sdk.auth('myApiKey');
   *
   * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
   * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
   * @param values Your auth credentials for the API; can specify up to two strings or numbers.
   */
  auth(...values: string[] | number[]) {
    this.core.setAuth(...values);
    return this;
  }

  /**
   * If the API you're using offers alternate server URLs, and server variables, you can tell
   * the SDK which one to use with this method. To use it you can supply either one of the
   * server URLs that are contained within the OpenAPI definition (along with any server
   * variables), or you can pass it a fully qualified URL to use (that may or may not exist
   * within the OpenAPI definition).
   *
   * @example <caption>Server URL with server variables</caption>
   * sdk.server('https://{region}.api.example.com/{basePath}', {
   *   name: 'eu',
   *   basePath: 'v14',
   * });
   *
   * @example <caption>Fully qualified server URL</caption>
   * sdk.server('https://eu.api.example.com/v14');
   *
   * @param url Server URL
   * @param variables An object of variables to replace into the server URL.
   */
  server(url: string, variables = {}) {
    this.core.setServer(url, variables);
  }

  /**
   * Returns NFT Item by Id
   *
   * @summary Get NFT by Id
   * @throws FetchError<400, types.GetItemByIdResponse400> Bad Request
   * @throws FetchError<404, types.GetItemByIdResponse404> Not Found
   * @throws FetchError<500, types.GetItemByIdResponse500> Internal Server Error
   */
  getItemById(metadata: types.GetItemByIdMetadataParam): Promise<FetchResponse<200, types.GetItemByIdResponse200>> {
    return this.core.fetch('/v0.1/items/{itemId}', 'get', metadata);
  }

  /**
   * Returns NFT Items by specified list of Ids
   *
   * @summary Get NFT by Ids
   * @throws FetchError<400, types.GetItemByIdsResponse400> Bad Request
   * @throws FetchError<404, types.GetItemByIdsResponse404> Not Found
   * @throws FetchError<500, types.GetItemByIdsResponse500> Internal Server Error
   */
  getItemByIds(body: types.GetItemByIdsBodyParam): Promise<FetchResponse<200, types.GetItemByIdsResponse200>> {
    return this.core.fetch('/v0.1/items/byIds', 'post', body);
  }

  /**
   * Returns NFT royalties by Id
   *
   * @summary Get NFT royalties by Id
   * @throws FetchError<400, types.GetItemRoyaltiesByIdResponse400> Bad Request
   * @throws FetchError<500, types.GetItemRoyaltiesByIdResponse500> Internal Server Error
   */
  getItemRoyaltiesById(metadata: types.GetItemRoyaltiesByIdMetadataParam): Promise<FetchResponse<200, types.GetItemRoyaltiesByIdResponse200>> {
    return this.core.fetch('/v0.1/items/{itemId}/royalties', 'get', metadata);
  }

  /**
   * Reloads NFT metadata from the source. If source not available, old metadata stays.
   *
   * @summary Reset NFT metadata
   * @throws FetchError<400, types.ResetItemMetaResponse400> Bad Request
   * @throws FetchError<500, types.ResetItemMetaResponse500> Internal Server Error
   */
  resetItemMeta(metadata: types.ResetItemMetaMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/v0.1/items/{itemId}/resetMeta', 'delete', metadata);
  }

  /**
   * Returns list of NFTs belong to specified user and sorted by `last updated` date
   *
   * @summary Get NFT owned by user
   * @throws FetchError<400, types.GetItemsByOwnerResponse400> Bad Request
   * @throws FetchError<500, types.GetItemsByOwnerResponse500> Internal Server Error
   */
  getItemsByOwner(metadata: types.GetItemsByOwnerMetadataParam): Promise<FetchResponse<200, types.GetItemsByOwnerResponse200>> {
    return this.core.fetch('/v0.1/items/byOwner', 'get', metadata);
  }

  /**
   * Returns list of NFTs created by specified user and sorted by `last updated` date
   *
   * @summary Get NFT created by user
   * @throws FetchError<400, types.GetItemsByCreatorResponse400> Bad Request
   * @throws FetchError<500, types.GetItemsByCreatorResponse500> Internal Server Error
   */
  getItemsByCreator(metadata: types.GetItemsByCreatorMetadataParam): Promise<FetchResponse<200, types.GetItemsByCreatorResponse200>> {
    return this.core.fetch('/v0.1/items/byCreator', 'get', metadata);
  }

  /**
   * Returns list of NFTs from specified collection and sorted by `last updated` date
   *
   * @summary Get NFT from collection
   * @throws FetchError<400, types.GetItemsByCollectionResponse400> Bad Request
   * @throws FetchError<500, types.GetItemsByCollectionResponse500> Internal Server Error
   */
  getItemsByCollection(metadata: types.GetItemsByCollectionMetadataParam): Promise<FetchResponse<200, types.GetItemsByCollectionResponse200>> {
    return this.core.fetch('/v0.1/items/byCollection', 'get', metadata);
  }

  /**
   * Returns list of NFTs belong to specified user and sorted by `last updated` date of
   * ownership
   *
   * @summary Get NFT owned by user - detailed
   * @throws FetchError<400, types.GetItemsByOwnerWithOwnershipResponse400> Bad Request
   * @throws FetchError<500, types.GetItemsByOwnerWithOwnershipResponse500> Internal Server Error
   */
  getItemsByOwnerWithOwnership(metadata: types.GetItemsByOwnerWithOwnershipMetadataParam): Promise<FetchResponse<200, types.GetItemsByOwnerWithOwnershipResponse200>> {
    return this.core.fetch('/v0.1/items/byOwnerWithOwnership', 'get', metadata);
  }

  /**
   * Returns all NFT Items in accordance with specified filters and sorted by `last updated`
   * date
   *
   * @summary Get all NFTs
   * @throws FetchError<400, types.GetAllItemsResponse400> Bad Request
   * @throws FetchError<500, types.GetAllItemsResponse500> Internal Server Error
   */
  getAllItems(metadata?: types.GetAllItemsMetadataParam): Promise<FetchResponse<200, types.GetAllItemsResponse200>> {
    return this.core.fetch('/v0.1/items/all', 'get', metadata);
  }

  /**
   * Returns aggregation of existing traits for specified collections with counter for each
   * trait type/value.
   *
   * @summary Get NFT collection traits
   * @throws FetchError<400, types.QueryTraitsResponse400> Bad Request
   * @throws FetchError<500, types.QueryTraitsResponse500> Internal Server Error
   */
  queryTraits(metadata: types.QueryTraitsMetadataParam): Promise<FetchResponse<200, types.QueryTraitsResponse200>> {
    return this.core.fetch('/v0.1/items/traits', 'get', metadata);
  }

  /**
   * Returns aggregation of existing traits for specified collections with counter for each
   * trait type/value.\  This is full-text-search, where you can specify filter for trait
   * keys not precisely\  (for example, results `back` filter include `Background` trait)
   *
   * @summary Search NFT collection traits
   * @throws FetchError<400, types.SearchTraitsResponse400> Bad Request
   * @throws FetchError<500, types.SearchTraitsResponse500> Internal Server Error
   */
  searchTraits(metadata: types.SearchTraitsMetadataParam): Promise<FetchResponse<200, types.SearchTraitsResponse200>> {
    return this.core.fetch('/v0.1/items/traits/search', 'get', metadata);
  }

  /**
   * Returns the rarity of the trait
   *
   * @summary Get NFT traits rarity
   */
  queryTraitsWithRarity(body: types.QueryTraitsWithRarityBodyParam): Promise<FetchResponse<200, types.QueryTraitsWithRarityResponse200>> {
    return this.core.fetch('/v0.1/items/traits/rarity', 'post', body);
  }

  /**
   * Advanced search returns NFTs satisfying provided filter
   *
   * @summary Search NFTs
   * @throws FetchError<400, types.SearchItemsResponse400> Bad Request
   * @throws FetchError<500, types.SearchItemsResponse500> Internal Server Error
   */
  searchItems(body: types.SearchItemsBodyParam): Promise<FetchResponse<200, types.SearchItemsResponse200>> {
    return this.core.fetch('/v0.1/items/search', 'post', body);
  }

  /**
   * Returns Lazy NFT Item by Id
   *
   * @summary Get Lazy NFT
   * @throws FetchError<400, types.GetLazyItemByIdResponse400> Bad Request
   * @throws FetchError<404, types.GetLazyItemByIdResponse404> Not Found
   * @throws FetchError<500, types.GetLazyItemByIdResponse500> Internal Server Error
   */
  getLazyItemById(metadata: types.GetLazyItemByIdMetadataParam): Promise<FetchResponse<200, types.GetLazyItemByIdResponse200>> {
    return this.core.fetch('/v0.1/items/lazy/{itemId}', 'get', metadata);
  }

  /**
   * Create Lazy NFT (supported only for some blockchains)
   *
   * @summary Mint Lazy NFT
   * @throws FetchError<400, types.MintLazyItemResponse400> Bad Request
   * @throws FetchError<404, types.MintLazyItemResponse404> Not Found
   * @throws FetchError<500, types.MintLazyItemResponse500> Internal Server Error
   */
  mintLazyItem(body: types.MintLazyItemBodyParam): Promise<FetchResponse<200, types.MintLazyItemResponse200>> {
    return this.core.fetch('/v0.1/items/lazy/mint', 'post', body);
  }

  /**
   * Deletes Lazy NFT (supported only for some blockchains)
   *
   * @summary Burn Lazy NFT
   * @throws FetchError<400, types.BurnLazyItemResponse400> Bad Request
   * @throws FetchError<404, types.BurnLazyItemResponse404> Not Found
   * @throws FetchError<500, types.BurnLazyItemResponse500> Internal Server Error
   */
  burnLazyItem(body: types.BurnLazyItemBodyParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/v0.1/items/lazy/burn', 'post', body);
  }

  /**
   * Returns Ownership by Id
   *
   * @summary Get NFT Ownership by Id
   * @throws FetchError<400, types.GetOwnershipByIdResponse400> Bad Request
   * @throws FetchError<404, types.GetOwnershipByIdResponse404> Not Found
   * @throws FetchError<500, types.GetOwnershipByIdResponse500> Internal Server Error
   */
  getOwnershipById(metadata: types.GetOwnershipByIdMetadataParam): Promise<FetchResponse<200, types.GetOwnershipByIdResponse200>> {
    return this.core.fetch('/v0.1/ownerships/{ownershipId}', 'get', metadata);
  }

  /**
   * Returns Ownerships by specified list of Ids
   *
   * @summary Get NFT Ownerships by Ids
   * @throws FetchError<400, types.GetOwnershipsByIdsResponse400> Bad Request
   * @throws FetchError<500, types.GetOwnershipsByIdsResponse500> Internal Server Error
   */
  getOwnershipsByIds(body: types.GetOwnershipsByIdsBodyParam): Promise<FetchResponse<200, types.GetOwnershipsByIdsResponse200>> {
    return this.core.fetch('/v0.1/ownerships/byIds', 'post', body);
  }

  /**
   * Returns list of NFTs Ownerships from specified collection and sorted by `last updated`
   * date
   *
   * @summary Get NFT Collection's Ownerships
   * @throws FetchError<400, types.GetOwnershipsByCollectionResponse400> Bad Request
   * @throws FetchError<500, types.GetOwnershipsByCollectionResponse500> Internal Server Error
   */
  getOwnershipsByCollection(metadata: types.GetOwnershipsByCollectionMetadataParam): Promise<FetchResponse<200, types.GetOwnershipsByCollectionResponse200>> {
    return this.core.fetch('/v0.1/ownerships/byCollection', 'get', metadata);
  }

  /**
   * Returns list of NFTs Ownerships for specified NFT and sorted by `last updated` date
   *
   * @summary Get NFTs Ownerships
   * @throws FetchError<400, types.GetOwnershipsByItemResponse400> Bad Request
   * @throws FetchError<500, types.GetOwnershipsByItemResponse500> Internal Server Error
   */
  getOwnershipsByItem(metadata: types.GetOwnershipsByItemMetadataParam): Promise<FetchResponse<200, types.GetOwnershipsByItemResponse200>> {
    return this.core.fetch('/v0.1/ownerships/byItem', 'get', metadata);
  }

  /**
   * Advanced search returns NFT Ownerships satisfying provided filter
   *
   * @summary Search NFT Ownerships
   * @throws FetchError<400, types.SearchOwnershipsResponse400> Bad Request
   * @throws FetchError<500, types.SearchOwnershipsResponse500> Internal Server Error
   */
  searchOwnerships(body: types.SearchOwnershipsBodyParam): Promise<FetchResponse<200, types.SearchOwnershipsResponse200>> {
    return this.core.fetch('/v0.1/ownerships/search', 'post', body);
  }

  /**
   * Returns list of collection with owned items by specified owner
   *
   * @summary Get collections owned items by owner
   * @throws FetchError<400, types.GetCollectionsWithOwnedItemsResponse400> Bad Request
   * @throws FetchError<500, types.GetCollectionsWithOwnedItemsResponse500> Internal Server Error
   */
  getCollectionsWithOwnedItems(metadata: types.GetCollectionsWithOwnedItemsMetadataParam): Promise<FetchResponse<200, types.GetCollectionsWithOwnedItemsResponse200>> {
    return this.core.fetch('/v0.1/ownerships/collections', 'get', metadata);
  }

  /**
   * Returns Order by Id
   *
   * @summary Get Order
   * @throws FetchError<400, types.GetOrderByIdResponse400> Bad Request
   * @throws FetchError<404, types.GetOrderByIdResponse404> Not Found
   * @throws FetchError<500, types.GetOrderByIdResponse500> Internal Server Error
   */
  getOrderById(metadata: types.GetOrderByIdMetadataParam): Promise<FetchResponse<200, types.GetOrderByIdResponse200>> {
    return this.core.fetch('/v0.1/orders/{id}', 'get', metadata);
  }

  /**
   * Prepare all required data to match given order on the blockchain
   *
   * @summary Prepare order transaction
   * @throws FetchError<400, types.PrepareOrderTransactionResponse400> Bad Request
   * @throws FetchError<404, types.PrepareOrderTransactionResponse404> Not Found
   * @throws FetchError<500, types.PrepareOrderTransactionResponse500> Internal Server Error
   */
  prepareOrderTransaction(body: types.PrepareOrderTransactionBodyParam, metadata: types.PrepareOrderTransactionMetadataParam): Promise<FetchResponse<200, types.PrepareOrderTransactionResponse200>> {
    return this.core.fetch('/v0.1/orders/{id}/prepareTx', 'post', body, metadata);
  }

  /**
   * Prepare all required data to cancel given order on the blockchain
   *
   * @summary Prepare order cancel transaction
   * @throws FetchError<400, types.PrepareOrderCancelTransactionResponse400> Bad Request
   * @throws FetchError<404, types.PrepareOrderCancelTransactionResponse404> Not Found
   * @throws FetchError<500, types.PrepareOrderCancelTransactionResponse500> Internal Server Error
   */
  prepareOrderCancelTransaction(metadata: types.PrepareOrderCancelTransactionMetadataParam): Promise<FetchResponse<200, types.PrepareOrderCancelTransactionResponse200>> {
    return this.core.fetch('/v0.1/orders/{id}/prepareCancelTx', 'post', metadata);
  }

  /**
   * Report Error Order
   *
   * @summary Report Order
   * @throws FetchError<400, types.ReportOrderByIdResponse400> Bad Request
   * @throws FetchError<404, types.ReportOrderByIdResponse404> Not Found
   * @throws FetchError<500, types.ReportOrderByIdResponse500> Internal Server Error
   */
  reportOrderById(metadata: types.ReportOrderByIdMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/v0.1/orders/{id}/report', 'post', metadata);
  }

  /**
   * Create or update off-chain Order (supported only for some blockchains)
   *
   * @summary Create or update Order
   * @throws FetchError<400, types.UpsertOrderResponse400> Bad Request
   * @throws FetchError<500, types.UpsertOrderResponse500> Internal Server Error
   */
  upsertOrder(body: types.UpsertOrderBodyParam): Promise<FetchResponse<200, types.UpsertOrderResponse200>> {
    return this.core.fetch('/v0.1/orders', 'post', body);
  }

  /**
   * Validates and returns order by Id. IMPORTANT - validation is time-consuming operation!
   *
   * @summary Get validated Order by Id
   * @throws FetchError<400, types.GetValidatedOrderByIdResponse400> Bad Request
   * @throws FetchError<404, types.GetValidatedOrderByIdResponse404> Not Found
   * @throws FetchError<500, types.GetValidatedOrderByIdResponse500> Internal Server Error
   */
  getValidatedOrderById(metadata: types.GetValidatedOrderByIdMetadataParam): Promise<FetchResponse<200, types.GetValidatedOrderByIdResponse200>> {
    return this.core.fetch('/v0.1/orders/{id}/validate', 'get', metadata);
  }

  /**
   * Returns Orders by specified list of Ids
   *
   * @summary Get Orders by Ids
   * @throws FetchError<400, types.GetOrdersByIdsResponse400> Bad Request
   * @throws FetchError<500, types.GetOrdersByIdsResponse500> Internal Server Error
   */
  getOrdersByIds(body: types.GetOrdersByIdsBodyParam): Promise<FetchResponse<200, types.GetOrdersByIdsResponse200>> {
    return this.core.fetch('/v0.1/orders/byIds', 'post', body);
  }

  /**
   * Returns all Orders in accordance with specified filters and sorted by `last updated`
   * date
   *
   * @summary Get all Orders
   * @throws FetchError<400, types.GetOrdersAllResponse400> Bad Request
   * @throws FetchError<500, types.GetOrdersAllResponse500> Internal Server Error
   */
  getOrdersAll(metadata?: types.GetOrdersAllMetadataParam): Promise<FetchResponse<200, types.GetOrdersAllResponse200>> {
    return this.core.fetch('/v0.1/orders/all', 'get', metadata);
  }

  /**
   * Returns all sales & transfers in accordance with specified filters and sorted by `db
   * updated` date. During internal updates (like migrations) Orders can be updated for
   * technical reasons. In such case, `last update` date won't be changed. If you want to
   * store Orders in your own storage and keep it synced, use this method.
   *
   * @summary Get all Orders (for sync)
   * @throws FetchError<400, types.GetAllSyncResponse400> Bad Request
   * @throws FetchError<500, types.GetAllSyncResponse500> Internal Server Error
   */
  getAllSync(metadata: types.GetAllSyncMetadataParam): Promise<FetchResponse<200, types.GetAllSyncResponse200>> {
    return this.core.fetch('/v0.1/orders/sync', 'get', metadata);
  }

  /**
   * Returns sell NFT Sales created by specified user and sorted by `last update` date
   *
   * @summary Get user's sell Orders
   * @throws FetchError<400, types.GetSellOrdersByMakerResponse400> Bad Request
   * @throws FetchError<500, types.GetSellOrdersByMakerResponse500> Internal Server Error
   */
  getSellOrdersByMaker(metadata: types.GetSellOrdersByMakerMetadataParam): Promise<FetchResponse<200, types.GetSellOrdersByMakerResponse200>> {
    return this.core.fetch('/v0.1/orders/sell/byMaker', 'get', metadata);
  }

  /**
   * Returns sell sales & transfer created for specified NFT and sorted by price in USD
   * (cheapest first)
   *
   * @summary Get sell Orders for NFT
   * @throws FetchError<400, types.GetSellOrdersByItemResponse400> Bad Request
   * @throws FetchError<500, types.GetSellOrdersByItemResponse500> Internal Server Error
   */
  getSellOrdersByItem(metadata: types.GetSellOrdersByItemMetadataParam): Promise<FetchResponse<200, types.GetSellOrdersByItemResponse200>> {
    return this.core.fetch('/v0.1/orders/sell/byItem', 'get', metadata);
  }

  /**
   * Returns sell Orders satisfying specified filters and sorted by `last update` date
   *
   * @summary Get sell Orders
   * @throws FetchError<400, types.GetSellOrdersResponse400> Bad Request
   * @throws FetchError<500, types.GetSellOrdersResponse500> Internal Server Error
   */
  getSellOrders(metadata?: types.GetSellOrdersMetadataParam): Promise<FetchResponse<200, types.GetSellOrdersResponse200>> {
    return this.core.fetch('/v0.1/orders/sell', 'get', metadata);
  }

  /**
   * Returns bid Orders created by specified user and sorted by `last update` date
   *
   * @summary Get user's bid Orders
   * @throws FetchError<400, types.GetOrderBidsByMakerResponse400> Bad Request
   * @throws FetchError<500, types.GetOrderBidsByMakerResponse500> Internal Server Error
   */
  getOrderBidsByMaker(metadata: types.GetOrderBidsByMakerMetadataParam): Promise<FetchResponse<200, types.GetOrderBidsByMakerResponse200>> {
    return this.core.fetch('/v0.1/orders/bids/byMaker', 'get', metadata);
  }

  /**
   * Returns bid Orders created for specified NFT and sorted by price in USD (expensive
   * first)
   *
   * @summary Get bid Orders for NFT
   * @throws FetchError<400, types.GetOrderBidsByItemResponse400> Bad Request
   * @throws FetchError<500, types.GetOrderBidsByItemResponse500> Internal Server Error
   */
  getOrderBidsByItem(metadata: types.GetOrderBidsByItemMetadataParam): Promise<FetchResponse<200, types.GetOrderBidsByItemResponse200>> {
    return this.core.fetch('/v0.1/orders/bids/byItem', 'get', metadata);
  }

  /**
   * Returns floor bids created for specified NFT Collection and sorted by price in USD
   * (expensive first)
   *
   * @summary Get floor bids for Collection
   * @throws FetchError<400, types.GetOrderFloorBidsByCollectionResponse400> Bad Request
   * @throws FetchError<500, types.GetOrderFloorBidsByCollectionResponse500> Internal Server Error
   */
  getOrderFloorBidsByCollection(metadata: types.GetOrderFloorBidsByCollectionMetadataParam): Promise<FetchResponse<200, types.GetOrderFloorBidsByCollectionResponse200>> {
    return this.core.fetch('/v0.1/orders/floorBids/byCollection', 'get', metadata);
  }

  /**
   * Get for buy pricing info from AMM Order
   *
   * @summary Get AMM Order trade info
   * @throws FetchError<400, types.GetAmmOrderTradeInfoResponse400> Bad Request
   * @throws FetchError<404, types.GetAmmOrderTradeInfoResponse404> Not Found
   * @throws FetchError<500, types.GetAmmOrderTradeInfoResponse500> Internal Server Error
   */
  getAmmOrderTradeInfo(metadata: types.GetAmmOrderTradeInfoMetadataParam): Promise<FetchResponse<200, types.GetAmmOrderTradeInfoResponse200>> {
    return this.core.fetch('/v0.1/orders/amm/{id}/tradeInfo', 'get', metadata);
  }

  /**
   * Returns Protocol fee settings for Orders
   *
   * @summary Get fee settings
   * @throws FetchError<400, types.GetOrderFeesResponse400> Bad Request
   * @throws FetchError<500, types.GetOrderFeesResponse500> Internal Server Error
   */
  getOrderFees(metadata?: types.GetOrderFeesMetadataParam): Promise<FetchResponse<200, types.GetOrderFeesResponse200>> {
    return this.core.fetch('/v0.1/orders/settings/fees', 'get', metadata);
  }

  /**
   * Returns user's Activities (like transfers, mints, sells etc) sorted by date. This API is
   * deprecated in favor of `Search Activities`
   *
   * @summary Get user Activities
   * @throws FetchError<400, types.GetActivitiesByUserResponse400> Bad Request
   * @throws FetchError<500, types.GetActivitiesByUserResponse500> Internal Server Error
   */
  getActivitiesByUser(metadata: types.GetActivitiesByUserMetadataParam): Promise<FetchResponse<200, types.GetActivitiesByUserResponse200>> {
    return this.core.fetch('/v0.1/activities/byUser', 'get', metadata);
  }

  /**
   * Returns users Activities (like transfers, mints, sells etc) sorted by date. This API is
   * deprecated in favor of `Search Activities`
   *
   * @summary Get users Activities
   * @throws FetchError<400, types.GetActivitiesByUsersResponse400> Bad Request
   * @throws FetchError<500, types.GetActivitiesByUsersResponse500> Internal Server Error
   */
  getActivitiesByUsers(body: types.GetActivitiesByUsersBodyParam): Promise<FetchResponse<200, types.GetActivitiesByUsersResponse200>> {
    return this.core.fetch('/v0.1/activities/byUsers', 'post', body);
  }

  /**
   * Returns Activities related to specified NFT and sorted by date. This API is deprecated
   * in favor of `Search Activities`
   *
   * @summary Get NFT Activities
   * @throws FetchError<400, types.GetActivitiesByItemResponse400> Bad Request
   * @throws FetchError<500, types.GetActivitiesByItemResponse500> Internal Server Error
   */
  getActivitiesByItem(metadata: types.GetActivitiesByItemMetadataParam): Promise<FetchResponse<200, types.GetActivitiesByItemResponse200>> {
    return this.core.fetch('/v0.1/activities/byItem', 'get', metadata);
  }

  /**
   * Returns Activities related to NFTs from specified Collection and sorted by date. This
   * API is deprecated in favor of `Search Activities`
   *
   * @summary Get NFT Collection Activities
   * @throws FetchError<400, types.GetActivitiesByCollectionResponse400> Bad Request
   * @throws FetchError<500, types.GetActivitiesByCollectionResponse500> Internal Server Error
   */
  getActivitiesByCollection(metadata: types.GetActivitiesByCollectionMetadataParam): Promise<FetchResponse<200, types.GetActivitiesByCollectionResponse200>> {
    return this.core.fetch('/v0.1/activities/byCollection', 'get', metadata);
  }

  /**
   * Returns all Activities in accordance with specified filters and sorted by `db updated`
   * date. During internal updates (like migrations) Activities can be updated for technical
   * reasons. In such case, `date` field won't be changed. If you want to store Activities in
   * your own storage and keep it synced, use this method.
   *
   * @summary Get all Activities (for sync)
   * @throws FetchError<400, types.GetAllActivitiesSyncResponse400> Bad Request
   * @throws FetchError<500, types.GetAllActivitiesSyncResponse500> Internal Server Error
   */
  getAllActivitiesSync(metadata: types.GetAllActivitiesSyncMetadataParam): Promise<FetchResponse<200, types.GetAllActivitiesSyncResponse200>> {
    return this.core.fetch('/v0.1/activities/sync', 'get', metadata);
  }

  /**
   * Returns all Activities in accordance with specified filters and sorted by date. This API
   * is deprecated in favor of `Search Activities`
   *
   * @summary Get all Activities
   * @throws FetchError<400, types.GetAllActivitiesResponse400> Bad Request
   * @throws FetchError<500, types.GetAllActivitiesResponse500> Internal Server Error
   */
  getAllActivities(metadata: types.GetAllActivitiesMetadataParam): Promise<FetchResponse<200, types.GetAllActivitiesResponse200>> {
    return this.core.fetch('/v0.1/activities/all', 'get', metadata);
  }

  /**
   * Advanced search returns Activities satisfying provided filter
   *
   * @summary Search Activities
   * @throws FetchError<400, types.SearchActivitiesResponse400> Bad Request
   * @throws FetchError<500, types.SearchActivitiesResponse500> Internal Server Error
   */
  searchActivities(body: types.SearchActivitiesBodyParam): Promise<FetchResponse<200, types.SearchActivitiesResponse200>> {
    return this.core.fetch('/v0.1/activities/search', 'post', body);
  }

  /**
   * Returns NFT Collection by Id
   *
   * @summary Get NFT Collection by Id
   * @throws FetchError<400, types.GetCollectionByIdResponse400> Bad Request
   * @throws FetchError<404, types.GetCollectionByIdResponse404> Not Found
   * @throws FetchError<500, types.GetCollectionByIdResponse500> Internal Server Error
   */
  getCollectionById(metadata: types.GetCollectionByIdMetadataParam): Promise<FetchResponse<200, types.GetCollectionByIdResponse200>> {
    return this.core.fetch('/v0.1/collections/{collection}', 'get', metadata);
  }

  /**
   * Returns next available TokenId for specified minter
   *
   * @summary Generate TokenId
   * @throws FetchError<400, types.GenerateTokenIdResponse400> Bad Request
   * @throws FetchError<500, types.GenerateTokenIdResponse500> Internal Server Error
   */
  generateTokenId(metadata: types.GenerateTokenIdMetadataParam): Promise<FetchResponse<200, types.GenerateTokenIdResponse200>> {
    return this.core.fetch('/v0.1/collections/{collection}/generateTokenId', 'get', metadata);
  }

  /**
   * Reloads metadata for all NFTs in the Collection (see 'Reset NFT metadata' API)
   *
   * @summary Reset NFT metadata
   * @throws FetchError<400, types.RefreshCollectionItemsMetaResponse400> Bad Request
   * @throws FetchError<500, types.RefreshCollectionItemsMetaResponse500> Internal Server Error
   */
  refreshCollectionItemsMeta(metadata: types.RefreshCollectionItemsMetaMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/v0.1/collections/{collection}/refreshMeta', 'delete', metadata);
  }

  /**
   * Reloads metadata for Collection (NOT for collection's NFTs)
   *
   * @summary Reset Collection metadata
   * @throws FetchError<400, types.ResetCollectionMetaResponse400> Bad Request
   * @throws FetchError<500, types.ResetCollectionMetaResponse500> Internal Server Error
   */
  resetCollectionMeta(metadata: types.ResetCollectionMetaMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/v0.1/collections/{collection}/resetMeta', 'delete', metadata);
  }

  /**
   * Returns list of NFT Collections belong to specified user
   *
   * @summary Get NFT Collections owned by user
   * @throws FetchError<400, types.GetCollectionsByOwnerResponse400> Bad Request
   * @throws FetchError<500, types.GetCollectionsByOwnerResponse500> Internal Server Error
   */
  getCollectionsByOwner(metadata: types.GetCollectionsByOwnerMetadataParam): Promise<FetchResponse<200, types.GetCollectionsByOwnerResponse200>> {
    return this.core.fetch('/v0.1/collections/byOwner', 'get', metadata);
  }

  /**
   * Returns all NFT Collections in accordance with specified filters
   *
   * @summary Get all NFT Collections
   * @throws FetchError<400, types.GetAllCollectionsResponse400> Bad Request
   * @throws FetchError<500, types.GetAllCollectionsResponse500> Internal Server Error
   */
  getAllCollections(metadata?: types.GetAllCollectionsMetadataParam): Promise<FetchResponse<200, types.GetAllCollectionsResponse200>> {
    return this.core.fetch('/v0.1/collections/all', 'get', metadata);
  }

  /**
   * Advanced search returns NFT Collections satisfying provided filter
   *
   * @summary Search NFT Collections
   * @throws FetchError<400, types.SearchCollectionResponse400> Bad Request
   * @throws FetchError<500, types.SearchCollectionResponse500> Internal Server Error
   */
  searchCollection(body: types.SearchCollectionBodyParam): Promise<FetchResponse<200, types.SearchCollectionResponse200>> {
    return this.core.fetch('/v0.1/collections/search', 'post', body);
  }

  /**
   * Users (top buyers/sellers) leaderboard. Calculated as traded worth for the period.
   *
   * @summary Get user volume
   * @throws FetchError<400, types.GetUserRankingByVolumeResponse400> Bad Request
   * @throws FetchError<500, types.GetUserRankingByVolumeResponse500> Internal Server Error
   */
  getUserRankingByVolume(metadata: types.GetUserRankingByVolumeMetadataParam): Promise<FetchResponse<200, types.GetUserRankingByVolumeResponse200>> {
    return this.core.fetch('/v0.1/data/rankings/{entity}/volume', 'get', metadata);
  }

  /**
   * Collections leaderboard by trade activity
   *
   * @summary Get NFT Collections volume
   * @throws FetchError<400, types.GetCollectionRankingByVolumeResponse400> Bad Request
   * @throws FetchError<500, types.GetCollectionRankingByVolumeResponse500> Internal Server Error
   */
  getCollectionRankingByVolume(metadata?: types.GetCollectionRankingByVolumeMetadataParam): Promise<FetchResponse<200, types.GetCollectionRankingByVolumeResponse200>> {
    return this.core.fetch('/v0.1/data/rankings/collections/volume', 'get', metadata);
  }

  /**
   * Collections leaderboard
   *
   * @summary Get NFT Collections leaderboard
   * @throws FetchError<400, types.GetCollectionLeaderboardResponse400> Bad Request
   * @throws FetchError<500, types.GetCollectionLeaderboardResponse500> Internal Server Error
   */
  getCollectionLeaderboard(metadata?: types.GetCollectionLeaderboardMetadataParam): Promise<FetchResponse<200, types.GetCollectionLeaderboardResponse200>> {
    return this.core.fetch('/v2.0/data/leaderboard/collections', 'get', metadata);
  }

  /**
   * Global collection statistics by ID
   *
   * @summary Get global (period-independent) statistics by collection ID
   * @throws FetchError<400, types.GetGlobalCollectionStatisticsResponse400> Bad Request
   * @throws FetchError<500, types.GetGlobalCollectionStatisticsResponse500> Internal Server Error
   */
  getGlobalCollectionStatistics(metadata: types.GetGlobalCollectionStatisticsMetadataParam): Promise<FetchResponse<200, types.GetGlobalCollectionStatisticsResponse200>> {
    return this.core.fetch('/v2.0/data/collections/{id}/statistics/global', 'get', metadata);
  }

  /**
   * Period-based collection statistics by ID
   *
   * @summary Get period-based statistics by collection ID
   * @throws FetchError<400, types.GetPeriodCollectionStatisticsResponse400> Bad Request
   * @throws FetchError<500, types.GetPeriodCollectionStatisticsResponse500> Internal Server Error
   */
  getPeriodCollectionStatistics(metadata: types.GetPeriodCollectionStatisticsMetadataParam): Promise<FetchResponse<200, types.GetPeriodCollectionStatisticsResponse200>> {
    return this.core.fetch('/v2.0/data/collections/{id}/statistics/period', 'get', metadata);
  }

  /**
   * Get historical statistics about Collection transactions
   *
   * @summary Get NFT Collection tx stats
   * @throws FetchError<400, types.GetTransactionsResponse400> Bad Request
   * @throws FetchError<404, types.GetTransactionsResponse404> Not found
   * @throws FetchError<500, types.GetTransactionsResponse500> Internal Server Error
   */
  getTransactions(metadata: types.GetTransactionsMetadataParam): Promise<FetchResponse<200, types.GetTransactionsResponse200>> {
    return this.core.fetch('/v0.1/data/collections/{collection}/transactions', 'get', metadata);
  }

  /**
   * Get general statistics about Collection
   *
   * @summary Get NFT Collection stats
   * @throws FetchError<400, types.GetCollectionStatsResponse400> Bad Request
   * @throws FetchError<404, types.GetCollectionStatsResponse404> Not found
   * @throws FetchError<500, types.GetCollectionStatsResponse500> Internal Server Error
   */
  getCollectionStats(metadata: types.GetCollectionStatsMetadataParam): Promise<FetchResponse<200, types.GetCollectionStatsResponse200>> {
    return this.core.fetch('/v0.1/data/collections/{collection}/stats', 'get', metadata);
  }

  /**
   * Get statistics about a collection
   *
   * @summary Get NFT Collection statistics
   * @throws FetchError<400, types.GetCollectionStatisticsResponse400> Bad Request
   * @throws FetchError<404, types.GetCollectionStatisticsResponse404> Not found
   * @throws FetchError<500, types.GetCollectionStatisticsResponse500> Internal Server Error
   */
  getCollectionStatistics(metadata: types.GetCollectionStatisticsMetadataParam): Promise<FetchResponse<200, types.GetCollectionStatisticsResponse200>> {
    return this.core.fetch('/v0.1/data/collections/{collection}/statistics', 'get', metadata);
  }

  /**
   * Get historical statistics about Collection sellers
   *
   * @summary Get NFT Collection seller stats
   * @throws FetchError<400, types.GetSellersResponse400> Bad Request
   * @throws FetchError<404, types.GetSellersResponse404> Not found
   * @throws FetchError<500, types.GetSellersResponse500> Internal Server Error
   */
  getSellers(metadata: types.GetSellersMetadataParam): Promise<FetchResponse<200, types.GetSellersResponse200>> {
    return this.core.fetch('/v0.1/data/collections/{collection}/sellers', 'get', metadata);
  }

  /**
   * Get historical statistics about Collection gross merchandise value
   *
   * @summary Get NFT Collections GVM
   * @throws FetchError<400, types.GetGmvResponse400> Bad Request
   * @throws FetchError<404, types.GetGmvResponse404> Not found
   * @throws FetchError<500, types.GetGmvResponse500> Internal Server Error
   */
  getGmv(metadata: types.GetGmvMetadataParam): Promise<FetchResponse<200, types.GetGmvResponse200>> {
    return this.core.fetch('/v0.1/data/collections/{collection}/gmv', 'get', metadata);
  }

  /**
   * Get historical statistics about Collection's NFT floor price
   *
   * @summary Get NFT Collection floor price
   * @throws FetchError<400, types.GetFloorPriceResponse400> Bad Request
   * @throws FetchError<404, types.GetFloorPriceResponse404> Not found
   * @throws FetchError<500, types.GetFloorPriceResponse500> Internal Server Error
   */
  getFloorPrice(metadata: types.GetFloorPriceMetadataParam): Promise<FetchResponse<200, types.GetFloorPriceResponse200>> {
    return this.core.fetch('/v0.1/data/collections/{collection}/floorPrice', 'get', metadata);
  }

  /**
   * Get historical statistics about Collection buyers
   *
   * @summary Get NFT Collection buyer stats
   * @throws FetchError<400, types.GetBuyersResponse400> Bad Request
   * @throws FetchError<404, types.GetBuyersResponse404> Not found
   * @throws FetchError<500, types.GetBuyersResponse500> Internal Server Error
   */
  getBuyers(metadata: types.GetBuyersMetadataParam): Promise<FetchResponse<200, types.GetBuyersResponse200>> {
    return this.core.fetch('/v0.1/data/collections/{collection}/buyers', 'get', metadata);
  }

  /**
   * Get historical statistics of collection listed count
   *
   * @summary Get NFT Collection listing stats
   * @throws FetchError<400, types.GetListedResponse400> Bad Request
   * @throws FetchError<404, types.GetListedResponse404> Not found
   * @throws FetchError<500, types.GetListedResponse500> Internal Server Error
   */
  getListed(metadata: types.GetListedMetadataParam): Promise<FetchResponse<200, types.GetListedResponse200>> {
    return this.core.fetch('/v0.1/data/collections/{collection}/listed', 'get', metadata);
  }

  /**
   * Resolves domain's blockchain address by its name (for example, from ENS domains
   * collection)
   *
   * @summary Resolve domain
   * @throws FetchError<400, types.ResolveResponse400> Bad Request
   * @throws FetchError<404, types.ResolveResponse404> Not Found
   * @throws FetchError<500, types.ResolveResponse500> Internal Server Error
   */
  resolve(metadata: types.ResolveMetadataParam): Promise<FetchResponse<200, types.ResolveResponse200>> {
    return this.core.fetch('/v0.1/domains/{domain}/resolution', 'post', metadata);
  }

  /**
   * Checks if Order's signature is valid and returns 'true' if it so, 'false' otherwise
   *
   * @summary Check Order's signature
   * @throws FetchError<400, types.ValidateResponse400> Bad Request
   * @throws FetchError<500, types.ValidateResponse500> Internal Server Error
   */
  validate(body: types.ValidateBodyParam): Promise<FetchResponse<200, types.ValidateResponse200>> {
    return this.core.fetch('/v0.1/signature/validate', 'post', body);
  }

  /**
   * Generate input string to sign operation
   *
   * @summary Generate signed input
   * @throws FetchError<400, types.GetInputResponse400> Bad Request
   * @throws FetchError<500, types.GetInputResponse500> Internal Server Error
   */
  getInput(body: types.GetInputBodyParam): Promise<FetchResponse<200, types.GetInputResponse200>> {
    return this.core.fetch('/v0.1/signature/input', 'post', body);
  }

  /**
   * Generate order encode data for sign operations
   *
   * @summary Generate order encode data for sign operations
   * @throws FetchError<400, types.EncodeResponse400> Bad Request
   * @throws FetchError<500, types.EncodeResponse500> Internal Server Error
   */
  encode(body: types.EncodeBodyParam): Promise<FetchResponse<200, types.EncodeResponse200>> {
    return this.core.fetch('/v0.1/encode/order', 'post', body);
  }

  /**
   * Get currency USD rate by currency blockchain's address
   *
   * @summary Get USD rate
   * @throws FetchError<400, types.GetUsdRateResponse400> Bad Request
   * @throws FetchError<500, types.GetUsdRateResponse500> Internal Server Error
   */
  getUsdRate(metadata: types.GetUsdRateMetadataParam): Promise<FetchResponse<200, types.GetUsdRateResponse200>> {
    return this.core.fetch('/v0.1/currencies/{currencyId}/rates/usd', 'get', metadata);
  }

  /**
   * List of currencies, supported by Protocol
   *
   * @summary Get supported currencies
   * @throws FetchError<400, types.GetAllCurrenciesResponse400> Bad Request
   * @throws FetchError<500, types.GetAllCurrenciesResponse500> Internal Server Error
   */
  getAllCurrencies(): Promise<FetchResponse<200, types.GetAllCurrenciesResponse200>> {
    return this.core.fetch('/v0.1/currencies/all', 'get');
  }

  /**
   * Return user's balance of specified currency
   *
   * @summary Get balance
   * @throws FetchError<400, types.GetBalanceResponse400> Bad Request
   * @throws FetchError<404, types.GetBalanceResponse404> Not Found
   * @throws FetchError<500, types.GetBalanceResponse500> Internal Server Error
   */
  getBalance(metadata: types.GetBalanceMetadataParam): Promise<FetchResponse<200, types.GetBalanceResponse200>> {
    return this.core.fetch('/v0.1/balances/{currencyId}/{owner}', 'get', metadata);
  }

  /**
   * Return short view of items updated after a specific datetime.
   *
   * @summary Get IDs of items updated after a specific datetime.
   * @throws FetchError<400, types.GetReconciliationItemsResponse400> Bad Request
   * @throws FetchError<500, types.GetReconciliationItemsResponse500> Internal Server Error
   */
  getReconciliationItems(metadata: types.GetReconciliationItemsMetadataParam): Promise<FetchResponse<200, types.GetReconciliationItemsResponse200>> {
    return this.core.fetch('/v0.1/reconciliation/items', 'get', metadata);
  }

  /**
   * Get latest indexed block for blockchain
   *
   * @summary Get latest indexed block
   * @throws FetchError<400, types.GetLatestIndexedBlockResponse400> Bad Request
   * @throws FetchError<404, types.GetLatestIndexedBlockResponse404> Not Found
   * @throws FetchError<500, types.GetLatestIndexedBlockResponse500> Internal Server Error
   */
  getLatestIndexedBlock(metadata: types.GetLatestIndexedBlockMetadataParam): Promise<FetchResponse<200, types.GetLatestIndexedBlockResponse200>> {
    return this.core.fetch('/v0.1/blocks/latestIndexed', 'get', metadata);
  }
}

const createSDK = (() => { return new SDK(); })()
;

export default createSDK;

export type { BurnLazyItemBodyParam, BurnLazyItemResponse400, BurnLazyItemResponse404, BurnLazyItemResponse500, EncodeBodyParam, EncodeResponse200, EncodeResponse400, EncodeResponse500, GenerateTokenIdMetadataParam, GenerateTokenIdResponse200, GenerateTokenIdResponse400, GenerateTokenIdResponse500, GetActivitiesByCollectionMetadataParam, GetActivitiesByCollectionResponse200, GetActivitiesByCollectionResponse400, GetActivitiesByCollectionResponse500, GetActivitiesByItemMetadataParam, GetActivitiesByItemResponse200, GetActivitiesByItemResponse400, GetActivitiesByItemResponse500, GetActivitiesByUserMetadataParam, GetActivitiesByUserResponse200, GetActivitiesByUserResponse400, GetActivitiesByUserResponse500, GetActivitiesByUsersBodyParam, GetActivitiesByUsersResponse200, GetActivitiesByUsersResponse400, GetActivitiesByUsersResponse500, GetAllActivitiesMetadataParam, GetAllActivitiesResponse200, GetAllActivitiesResponse400, GetAllActivitiesResponse500, GetAllActivitiesSyncMetadataParam, GetAllActivitiesSyncResponse200, GetAllActivitiesSyncResponse400, GetAllActivitiesSyncResponse500, GetAllCollectionsMetadataParam, GetAllCollectionsResponse200, GetAllCollectionsResponse400, GetAllCollectionsResponse500, GetAllCurrenciesResponse200, GetAllCurrenciesResponse400, GetAllCurrenciesResponse500, GetAllItemsMetadataParam, GetAllItemsResponse200, GetAllItemsResponse400, GetAllItemsResponse500, GetAllSyncMetadataParam, GetAllSyncResponse200, GetAllSyncResponse400, GetAllSyncResponse500, GetAmmOrderTradeInfoMetadataParam, GetAmmOrderTradeInfoResponse200, GetAmmOrderTradeInfoResponse400, GetAmmOrderTradeInfoResponse404, GetAmmOrderTradeInfoResponse500, GetBalanceMetadataParam, GetBalanceResponse200, GetBalanceResponse400, GetBalanceResponse404, GetBalanceResponse500, GetBuyersMetadataParam, GetBuyersResponse200, GetBuyersResponse400, GetBuyersResponse404, GetBuyersResponse500, GetCollectionByIdMetadataParam, GetCollectionByIdResponse200, GetCollectionByIdResponse400, GetCollectionByIdResponse404, GetCollectionByIdResponse500, GetCollectionLeaderboardMetadataParam, GetCollectionLeaderboardResponse200, GetCollectionLeaderboardResponse400, GetCollectionLeaderboardResponse500, GetCollectionRankingByVolumeMetadataParam, GetCollectionRankingByVolumeResponse200, GetCollectionRankingByVolumeResponse400, GetCollectionRankingByVolumeResponse500, GetCollectionStatisticsMetadataParam, GetCollectionStatisticsResponse200, GetCollectionStatisticsResponse400, GetCollectionStatisticsResponse404, GetCollectionStatisticsResponse500, GetCollectionStatsMetadataParam, GetCollectionStatsResponse200, GetCollectionStatsResponse400, GetCollectionStatsResponse404, GetCollectionStatsResponse500, GetCollectionsByOwnerMetadataParam, GetCollectionsByOwnerResponse200, GetCollectionsByOwnerResponse400, GetCollectionsByOwnerResponse500, GetCollectionsWithOwnedItemsMetadataParam, GetCollectionsWithOwnedItemsResponse200, GetCollectionsWithOwnedItemsResponse400, GetCollectionsWithOwnedItemsResponse500, GetFloorPriceMetadataParam, GetFloorPriceResponse200, GetFloorPriceResponse400, GetFloorPriceResponse404, GetFloorPriceResponse500, GetGlobalCollectionStatisticsMetadataParam, GetGlobalCollectionStatisticsResponse200, GetGlobalCollectionStatisticsResponse400, GetGlobalCollectionStatisticsResponse500, GetGmvMetadataParam, GetGmvResponse200, GetGmvResponse400, GetGmvResponse404, GetGmvResponse500, GetInputBodyParam, GetInputResponse200, GetInputResponse400, GetInputResponse500, GetItemByIdMetadataParam, GetItemByIdResponse200, GetItemByIdResponse400, GetItemByIdResponse404, GetItemByIdResponse500, GetItemByIdsBodyParam, GetItemByIdsResponse200, GetItemByIdsResponse400, GetItemByIdsResponse404, GetItemByIdsResponse500, GetItemRoyaltiesByIdMetadataParam, GetItemRoyaltiesByIdResponse200, GetItemRoyaltiesByIdResponse400, GetItemRoyaltiesByIdResponse500, GetItemsByCollectionMetadataParam, GetItemsByCollectionResponse200, GetItemsByCollectionResponse400, GetItemsByCollectionResponse500, GetItemsByCreatorMetadataParam, GetItemsByCreatorResponse200, GetItemsByCreatorResponse400, GetItemsByCreatorResponse500, GetItemsByOwnerMetadataParam, GetItemsByOwnerResponse200, GetItemsByOwnerResponse400, GetItemsByOwnerResponse500, GetItemsByOwnerWithOwnershipMetadataParam, GetItemsByOwnerWithOwnershipResponse200, GetItemsByOwnerWithOwnershipResponse400, GetItemsByOwnerWithOwnershipResponse500, GetLatestIndexedBlockMetadataParam, GetLatestIndexedBlockResponse200, GetLatestIndexedBlockResponse400, GetLatestIndexedBlockResponse404, GetLatestIndexedBlockResponse500, GetLazyItemByIdMetadataParam, GetLazyItemByIdResponse200, GetLazyItemByIdResponse400, GetLazyItemByIdResponse404, GetLazyItemByIdResponse500, GetListedMetadataParam, GetListedResponse200, GetListedResponse400, GetListedResponse404, GetListedResponse500, GetOrderBidsByItemMetadataParam, GetOrderBidsByItemResponse200, GetOrderBidsByItemResponse400, GetOrderBidsByItemResponse500, GetOrderBidsByMakerMetadataParam, GetOrderBidsByMakerResponse200, GetOrderBidsByMakerResponse400, GetOrderBidsByMakerResponse500, GetOrderByIdMetadataParam, GetOrderByIdResponse200, GetOrderByIdResponse400, GetOrderByIdResponse404, GetOrderByIdResponse500, GetOrderFeesMetadataParam, GetOrderFeesResponse200, GetOrderFeesResponse400, GetOrderFeesResponse500, GetOrderFloorBidsByCollectionMetadataParam, GetOrderFloorBidsByCollectionResponse200, GetOrderFloorBidsByCollectionResponse400, GetOrderFloorBidsByCollectionResponse500, GetOrdersAllMetadataParam, GetOrdersAllResponse200, GetOrdersAllResponse400, GetOrdersAllResponse500, GetOrdersByIdsBodyParam, GetOrdersByIdsResponse200, GetOrdersByIdsResponse400, GetOrdersByIdsResponse500, GetOwnershipByIdMetadataParam, GetOwnershipByIdResponse200, GetOwnershipByIdResponse400, GetOwnershipByIdResponse404, GetOwnershipByIdResponse500, GetOwnershipsByCollectionMetadataParam, GetOwnershipsByCollectionResponse200, GetOwnershipsByCollectionResponse400, GetOwnershipsByCollectionResponse500, GetOwnershipsByIdsBodyParam, GetOwnershipsByIdsResponse200, GetOwnershipsByIdsResponse400, GetOwnershipsByIdsResponse500, GetOwnershipsByItemMetadataParam, GetOwnershipsByItemResponse200, GetOwnershipsByItemResponse400, GetOwnershipsByItemResponse500, GetPeriodCollectionStatisticsMetadataParam, GetPeriodCollectionStatisticsResponse200, GetPeriodCollectionStatisticsResponse400, GetPeriodCollectionStatisticsResponse500, GetReconciliationItemsMetadataParam, GetReconciliationItemsResponse200, GetReconciliationItemsResponse400, GetReconciliationItemsResponse500, GetSellOrdersByItemMetadataParam, GetSellOrdersByItemResponse200, GetSellOrdersByItemResponse400, GetSellOrdersByItemResponse500, GetSellOrdersByMakerMetadataParam, GetSellOrdersByMakerResponse200, GetSellOrdersByMakerResponse400, GetSellOrdersByMakerResponse500, GetSellOrdersMetadataParam, GetSellOrdersResponse200, GetSellOrdersResponse400, GetSellOrdersResponse500, GetSellersMetadataParam, GetSellersResponse200, GetSellersResponse400, GetSellersResponse404, GetSellersResponse500, GetTransactionsMetadataParam, GetTransactionsResponse200, GetTransactionsResponse400, GetTransactionsResponse404, GetTransactionsResponse500, GetUsdRateMetadataParam, GetUsdRateResponse200, GetUsdRateResponse400, GetUsdRateResponse500, GetUserRankingByVolumeMetadataParam, GetUserRankingByVolumeResponse200, GetUserRankingByVolumeResponse400, GetUserRankingByVolumeResponse500, GetValidatedOrderByIdMetadataParam, GetValidatedOrderByIdResponse200, GetValidatedOrderByIdResponse400, GetValidatedOrderByIdResponse404, GetValidatedOrderByIdResponse500, MintLazyItemBodyParam, MintLazyItemResponse200, MintLazyItemResponse400, MintLazyItemResponse404, MintLazyItemResponse500, PrepareOrderCancelTransactionMetadataParam, PrepareOrderCancelTransactionResponse200, PrepareOrderCancelTransactionResponse400, PrepareOrderCancelTransactionResponse404, PrepareOrderCancelTransactionResponse500, PrepareOrderTransactionBodyParam, PrepareOrderTransactionMetadataParam, PrepareOrderTransactionResponse200, PrepareOrderTransactionResponse400, PrepareOrderTransactionResponse404, PrepareOrderTransactionResponse500, QueryTraitsMetadataParam, QueryTraitsResponse200, QueryTraitsResponse400, QueryTraitsResponse500, QueryTraitsWithRarityBodyParam, QueryTraitsWithRarityResponse200, RefreshCollectionItemsMetaMetadataParam, RefreshCollectionItemsMetaResponse400, RefreshCollectionItemsMetaResponse500, ReportOrderByIdMetadataParam, ReportOrderByIdResponse400, ReportOrderByIdResponse404, ReportOrderByIdResponse500, ResetCollectionMetaMetadataParam, ResetCollectionMetaResponse400, ResetCollectionMetaResponse500, ResetItemMetaMetadataParam, ResetItemMetaResponse400, ResetItemMetaResponse500, ResolveMetadataParam, ResolveResponse200, ResolveResponse400, ResolveResponse404, ResolveResponse500, SearchActivitiesBodyParam, SearchActivitiesResponse200, SearchActivitiesResponse400, SearchActivitiesResponse500, SearchCollectionBodyParam, SearchCollectionResponse200, SearchCollectionResponse400, SearchCollectionResponse500, SearchItemsBodyParam, SearchItemsResponse200, SearchItemsResponse400, SearchItemsResponse500, SearchOwnershipsBodyParam, SearchOwnershipsResponse200, SearchOwnershipsResponse400, SearchOwnershipsResponse500, SearchTraitsMetadataParam, SearchTraitsResponse200, SearchTraitsResponse400, SearchTraitsResponse500, UpsertOrderBodyParam, UpsertOrderResponse200, UpsertOrderResponse400, UpsertOrderResponse500, ValidateBodyParam, ValidateResponse200, ValidateResponse400, ValidateResponse500 } from './types';
