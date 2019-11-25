import * as EventEmitter from 'events';
import {EthAddress, Planet, PlanetMap, Player, PlayerMap, Web3Object} from "../@types/global/global";
import {Contract, Signer, providers} from "ethers";

// NOTE: DO NOT IMPORT FROM ETHERS SUBPATHS. see https://github.com/ethers-io/ethers.js/issues/349 (these imports trip up webpack)
// in particular, the below is bad!
// import {TransactionReceipt, Provider, TransactionResponse, Web3Provider} from "ethers/providers";

import {contractAddress} from "../utils/local_contract_addr";
import {address, locationIdFromDecStr} from "../utils/CheckedTypeUtils";
import {ContractConstants, InitializePlayerArgs, MoveArgs, RawPlanetData} from "../@types/darkforest/api/EthereumAPI";
import {TransactionRequest} from "ethers/providers"; // this is a gitignored file and must be generated
const contractABI = require("../contracts/DarkForestV1.json").abi; // this is also gitignored and must be compiled

// singleton class for managing all ethereum network calls
class EthereumAPI extends EventEmitter {
  static instance;

  provider: providers.Provider;
  signer: Signer;
  account: EthAddress;
  contract: Contract;
  eventListenersSetup: boolean = false;

  private constructor(provider: providers.Provider, signer: Signer, account: EthAddress, contract: Contract) {
    super();
    this.provider = provider;
    this.signer = signer;
    this.account = account;
    this.contract = contract;
  }

  static async initialize(): Promise<EthereumAPI> {
    if (!!EthereumAPI.instance) {
      throw new Error("EthereumAPI has already been initialized");
    }

    const web3: Web3Object = window.web3;
    if (typeof web3 === 'undefined') {
      throw new Error('No web3 object detected');
    }
    const provider: providers.Web3Provider = new providers.Web3Provider(web3.currentProvider);
    const signer: providers.JsonRpcSigner = provider.getSigner();
    const account: EthAddress = address(await signer.getAddress());
    const contract: Contract = new Contract(contractAddress, contractABI, signer);
    const ethereumAPI: EthereumAPI = new EthereumAPI(provider, signer, account, contract);
    ethereumAPI.setupEventListeners();
    EthereumAPI.instance = ethereumAPI;
    return ethereumAPI;
  }

  static getInstance(): EthereumAPI {
    if (!EthereumAPI.instance) {
      throw new Error("EthereumAPI object has not been initialized yet");
    }

    return EthereumAPI.instance;
  }

  setupEventListeners() {
    this.contract
      .on("PlayerInitialized", (player, loc, planet, event) => {
        const newPlayer: Player = {address: address(player)};
        this.emit('playerUpdate', newPlayer);
        const newPlanet: Planet = this.rawPlanetToObject(planet);
        this.emit('planetUpdate', newPlanet);
      }).on("PlayerMoved", (player, oldLoc, newLoc, maxDist, shipsMoved, fromPlanet, toPlanet, event) => {
      this.emit('planetUpdate', this.rawPlanetToObject(fromPlanet));
      this.emit('planetUpdate', this.rawPlanetToObject(toPlanet));
    });
    this.eventListenersSetup = true;
  }

  async initializePlayer(args: InitializePlayerArgs): Promise<providers.TransactionReceipt> {
    const tx: providers.TransactionResponse = await this.contract.initializePlayer(...args);
    return tx.wait();
  }

  async move(args: MoveArgs): Promise<providers.TransactionReceipt> {
    let overrides: TransactionRequest = {
      gasLimit: 1000000
    };
    const tx: providers.TransactionResponse = await this.contract.move(...args, overrides);
    return tx.wait();
  }

  async getConstants(): Promise<ContractConstants> {
    const contract = this.contract;
    const res = (await Promise.all([contract.xSize(), contract.ySize(), contract.difficulty()]));
    const xSize = parseInt(res[0]);
    const ySize = parseInt(res[1]);
    const difficulty = parseInt(res[2]);
    return {xSize, ySize, difficulty};
  }

  async getPlayers(): Promise<PlayerMap> {
    const contract = this.contract;
    const nPlayers: number = await contract.getNPlayers();

    let playerPromises: Promise<string>[] = [];
    for (let i = 0; i < nPlayers; i += 1) {
      playerPromises.push(contract.playerIds(i).catch(() => null));
    }
    const players = (await Promise.all(playerPromises)).filter(playerId => !!playerId).map((playerId: string) => ({address: address(playerId)}));
    let playerMap: PlayerMap = {};
    for (let player of players) {
      playerMap[<string>player.address] = player;
    }
    return playerMap;
  }

  async getPlanets(): Promise<PlanetMap> {
    const contract = this.contract;
    const nPlanets: number = await contract.getNPlanets();

    let planetPromises: Promise<RawPlanetData>[] = [];
    for (let i = 0; i < nPlanets; i += 1) {
      planetPromises.push(contract.planetIds(i).then(planetId => contract.planets(planetId)).catch(() => null));
    }
    let rawPlanets = await Promise.all(planetPromises);
    let planets: PlanetMap = {};
    for (let rawPlanet of rawPlanets) {
      const planet = this.rawPlanetToObject(rawPlanet);
      planets[<string>planet.locationId] = planet;
    }
    return planets;
  }

  rawPlanetToObject(rawPlanet: RawPlanetData): Planet {
    const rawCapacity = rawPlanet.capacity || rawPlanet[2];
    const rawGrowth = rawPlanet.growth || rawPlanet[3];
    const rawCoordinatesRevealed = rawPlanet.coordinatesRevealed || rawPlanet[6];
    const rawLastUpdated = rawPlanet.lastUpdated || rawPlanet[5];
    const rawLocationId = rawPlanet.locationId || rawPlanet[0];
    const rawOwner = rawPlanet.owner || rawPlanet[1];
    const rawPopulation = rawPlanet.population || rawPlanet[4];
    const rawVersion = rawPlanet.version || rawPlanet[9];
    const rawX = rawPlanet.x || rawPlanet[7];
    const rawY = rawPlanet.y || rawPlanet[8];
    const planet: Planet = {
      capacity: rawCapacity.toNumber(),
      growth: rawGrowth.toNumber(),
      coordinatesRevealed: rawCoordinatesRevealed,
      lastUpdated: rawLastUpdated.toNumber(),
      locationId: locationIdFromDecStr(rawLocationId.toString()),
      owner: address(rawOwner),
      population: rawPopulation.toNumber(),
      version: rawVersion
    };
    if (planet.coordinatesRevealed) {
      planet.x = rawX.toNumber();
      planet.y = rawY.toNumber();
    }
    return planet;
  }

}

export default EthereumAPI;
