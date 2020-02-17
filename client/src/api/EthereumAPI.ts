import * as EventEmitter from 'events';
import {
  EthAddress,
  OwnedPlanet,
  PlanetMap,
  Player,
  PlayerMap,
  Web3Object,
} from '../@types/global/global';
import { Contract, Signer, providers, utils } from 'ethers';

// NOTE: DO NOT IMPORT FROM ETHERS SUBPATHS. see https://github.com/ethers-io/ethers.js/issues/349 (these imports trip up webpack)
// in particular, the below is bad!
// import {TransactionReceipt, Provider, TransactionResponse, Web3Provider} from "ethers/providers";

import { contractAddress } from '../utils/local_contract_addr';
import { address, locationIdFromDecStr } from '../utils/CheckedTypeUtils';
import {
  ContractConstants,
  InitializePlayerArgs,
  MoveArgs,
  RawPlanetData,
  RawPlanetMetadata,
} from '../@types/darkforest/api/EthereumAPI';
import { TransactionRequest } from 'ethers/providers';
import { BigNumber } from 'ethers/utils';
const contractABI = require('../contracts/DarkForestV1.json').abi; // this is also gitignored and must be compiled

// singleton class for managing all ethereum network calls
class EthereumAPI extends EventEmitter {
  static instance;

  readonly account: EthAddress;
  private readonly provider: providers.Provider;
  private readonly signer: Signer;
  private readonly contract: Contract;

  private constructor(
    provider: providers.Provider,
    signer: Signer,
    account: EthAddress,
    contract: Contract
  ) {
    super();
    this.provider = provider;
    this.signer = signer;
    this.account = account;
    this.contract = contract;
  }

  static async initialize(): Promise<EthereumAPI> {
    if (!!EthereumAPI.instance) {
      throw new Error('EthereumAPI has already been initialized');
    }

    const web3: Web3Object = window.web3;
    if (typeof web3 === 'undefined') {
      throw new Error('No web3 object detected');
    }
    const provider: providers.Web3Provider = new providers.Web3Provider(
      web3.currentProvider
    );
    const signer: providers.JsonRpcSigner = provider.getSigner();
    const account: EthAddress = address(await signer.getAddress());
    const contract: Contract = new Contract(
      contractAddress,
      contractABI,
      signer
    );
    const ethereumAPI: EthereumAPI = new EthereumAPI(
      provider,
      signer,
      account,
      contract
    );
    ethereumAPI.setupEventListeners();
    EthereumAPI.instance = ethereumAPI;

    return ethereumAPI;
  }

  static getInstance(): EthereumAPI {
    if (!EthereumAPI.instance) {
      throw new Error('EthereumAPI object has not been initialized yet');
    }

    return EthereumAPI.instance;
  }

  private setupEventListeners() {
    this.contract
      .on('PlayerInitialized', async (player, locRaw) => {
        const newPlayer: Player = { address: address(player) };
        this.emit('playerUpdate', newPlayer);
        const newPlanet: OwnedPlanet = await this.getPlanet(locRaw);
        this.emit('planetUpdate', newPlanet);
      })
      .on(
        'TestEvent', async () => {
          console.log('test event fired')
        }
      )
      .on(
        'PlayerArrived',
        async (player, fromLocRaw, toLocRaw, maxDist, shipsMoved, event) => {
          const fromPlanet: OwnedPlanet = await this.getPlanet(fromLocRaw);
          const toPlanet: OwnedPlanet = await this.getPlanet(toLocRaw);
          console.log('arrived', fromPlanet, toPlanet)
          this.emit('planetUpdate', fromPlanet);
          this.emit('planetUpdate', toPlanet);
        }
      )
      .on(
        'PlayerDeparted',
        async (player, fromLocRaw, toLocRaw, maxDist, shipsMoved) => {
          const fromPlanet: OwnedPlanet = await this.getPlanet(fromLocRaw);
          const toPlanet: OwnedPlanet = await this.getPlanet(toLocRaw);
          console.log('departed', fromPlanet, toPlanet)
          this.emit('planetUpdate', fromPlanet);
          this.emit('planetUpdate', toPlanet);
        }
      )
      .on('PlanetDestroyed', async locRaw => {
        const planet: OwnedPlanet = await this.getPlanet(locRaw);
        this.emit('planetUpdate', planet);
      });
  }

  async initializePlayer(
    args: InitializePlayerArgs
  ): Promise<providers.TransactionReceipt> {
    const overrides: TransactionRequest = {
      gasLimit: 2000000,
      value: utils.parseEther('0.05'),
    };
    const tx: providers.TransactionResponse = await this.contract.initializePlayer(
      ...args,
      overrides
    );
    return tx.wait();
  }

  async move(args: MoveArgs): Promise<providers.TransactionReceipt> {
    const overrides: TransactionRequest = {
      gasLimit: 2000000,
    };
    const tx: providers.TransactionResponse = await this.contract.move(
      ...args,
      overrides
    );
    return tx.wait();
  }

  async cashOut(locationString: string): Promise<providers.TransactionReceipt> {
    const overrides: TransactionRequest = {
      gasLimit: 2000000,
    };
    const tx: providers.TransactionResponse = await this.contract.cashOut(
      locationString,
      overrides
    );
    return tx.wait();
  }

  async getConstants(): Promise<ContractConstants> {
    const contract = this.contract;
    const res = await Promise.all([
      contract.xSize(),
      contract.ySize(),
      contract.planetRarity(),
      contract.nPlanetTypes(),
    ]);
    const xSize = parseInt(res[0]);
    const ySize = parseInt(res[1]);
    const planetRarity = parseInt(res[2]);
    const nPlanetTypes = parseInt(res[3]);
    const defaultCapacity = (await Promise.all([
      ...[...Array(nPlanetTypes).keys()].map(i => contract.defaultCapacity(i)),
    ])).map(cap => parseInt(cap));
    const defaultGrowth = (await Promise.all([
      ...[...Array(nPlanetTypes).keys()].map(i => contract.defaultGrowth(i)),
    ])).map(gro => parseInt(gro));
    const defaultHardiness = (await Promise.all([
      ...[...Array(nPlanetTypes).keys()].map(i => contract.defaultHardiness(i)),
    ])).map(har => parseInt(har));
    const defaultStalwartness = (await Promise.all([
      ...[...Array(nPlanetTypes).keys()].map(i =>
        contract.defaultStalwartness(i)
      ),
    ])).map(sta => parseInt(sta));
    return {
      xSize,
      ySize,
      planetRarity,
      defaultCapacity,
      defaultGrowth,
      defaultHardiness,
      defaultStalwartness,
    };
  }

  async getPlayers(): Promise<PlayerMap> {
    const contract = this.contract;
    const nPlayers: number = await contract.getNPlayers();

    const playerPromises: Promise<string>[] = [];
    for (let i = 0; i < nPlayers; i += 1) {
      playerPromises.push(contract.playerIds(i).catch(() => null));
    }
    const players = (await Promise.all(playerPromises))
      .filter(playerId => !!playerId)
      .map((playerId: string) => ({ address: address(playerId) }));
    const playerMap: PlayerMap = {};
    for (const player of players) {
      playerMap[<string>player.address] = player;
    }
    return playerMap;
  }

  async getPlanets(): Promise<PlanetMap> {
    const contract = this.contract;
    const nPlanets: number = await contract.getNPlanets();

    const planetIdPromises: Promise<BigInteger>[] = [];
    for (let i = 0; i < nPlanets; i += 1) {
      planetIdPromises.push(contract.planetIds(i).catch(() => null));
    }
    const planetIds = (await Promise.all(planetIdPromises)).filter(
      item => !!item
    );

    const planetPromises: Promise<RawPlanetData>[] = [];
    for (let i = 0; i < nPlanets; i += 1) {
      planetPromises.push(contract.planets(planetIds[i]).catch(() => null));
    }
    const rawPlanets = await Promise.all(planetPromises);

    const planetMetadataPromises: Promise<RawPlanetMetadata>[] = [];
    for (let i = 0; i < nPlanets; i += 1) {
      planetMetadataPromises.push(
        contract.planetMetadatas(planetIds[i]).catch(() => null)
      );
    }
    const rawPlanetMetadatas = await Promise.all(planetMetadataPromises);

    const planets: PlanetMap = {};
    for (let i = 0; i < nPlanets; i += 1) {
      if (!!rawPlanets[i] && !!rawPlanetMetadatas[i]) {
        const planet = this.rawPlanetToObject(
          rawPlanets[i],
          rawPlanetMetadatas[i]
        );
        planets[<string>planet.locationId] = planet;
      }
    }
    return planets;
  }

  private async getPlanet(rawLoc: BigNumber): Promise<OwnedPlanet> {
    const rawPlanet = await this.contract.planets(rawLoc);
    const rawPlanetMetadata = await this.contract.planetMetadatas(rawLoc);
    return this.rawPlanetToObject(rawPlanet, rawPlanetMetadata);
  }

  private rawPlanetToObject(
    rawPlanet: RawPlanetData,
    rawPlanetMetadata: RawPlanetMetadata
  ): OwnedPlanet {
    const rawLocationId = rawPlanet.locationId || rawPlanet[0];
    const rawOwner = rawPlanet.owner || rawPlanet[1];
    const rawType = rawPlanet.planetType || rawPlanet[2];
    const rawCapacity = rawPlanet.capacity || rawPlanet[3];
    const rawGrowth = rawPlanet.growth || rawPlanet[4];
    const rawHardiness = rawPlanet.hardiness || rawPlanet[5];
    const rawStalwartness = rawPlanet.stalwartness || rawPlanet[6];
    const rawPopulation = rawPlanet.population || rawPlanet[7];
    const rawLastUpdated = rawPlanet.lastUpdated || rawPlanet[8];
    const rawCoordinatesRevealed =
      rawPlanet.coordinatesRevealed || rawPlanet[9];

    const rawVersion = rawPlanetMetadata.version || rawPlanetMetadata[2];
    const rawDestroyed = rawPlanetMetadata.destroyed || rawPlanetMetadata[3];

    const rawLastBlockUpdated = rawPlanetMetadata.lastBlockUpdated || rawPlanetMetadata[4];
    const rawPending = rawPlanetMetadata.pending || rawPlanetMetadata[5];
    const rawPendingCount = rawPlanetMetadata.pendingCount || rawPlanetMetadata[6];

    const planet: OwnedPlanet = {
      capacity: rawCapacity.toNumber(),
      growth: rawGrowth.toNumber(),
      hardiness: rawHardiness.toNumber(),
      stalwartness: rawStalwartness.toNumber(),
      planetType: rawType,
      coordinatesRevealed: rawCoordinatesRevealed,
      lastUpdated: rawLastUpdated.toNumber(),
      locationId: locationIdFromDecStr(rawLocationId.toString()),
      owner: address(rawOwner),
      population: rawPopulation.toNumber(),
      version: rawVersion,
      destroyed: rawDestroyed,
      pending: rawPending,
      pendingCount: rawPendingCount.toNumber(),
      lastBlockUpdated: rawLastBlockUpdated.toNumber(),
    };
    if (planet.coordinatesRevealed) {
      const rawX = rawPlanet.x || rawPlanet[10];
      const rawY = rawPlanet.y || rawPlanet[11];
      planet.x = rawX.toNumber();
      planet.y = rawY.toNumber();
    }
    return planet;
  }
}

export default EthereumAPI;
